import { Alert } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import SettingsScreen from '../settings';
import { ensureProfile, updateDisplayName } from '../../../src/data/repositories/profileRepository';
import { saveReminderSettings } from '../../../src/services/reminderService';
import { exportBackup, shareLatestSafetyBackup } from '../../../src/data/backup/export';
import { importBackup } from '../../../src/data/backup/expoImport';
import { BackupParseError } from '../../../src/data/backup/validate';

jest.mock('../../../src/data/db/client', () => ({ db: {} }));
jest.mock('../../../src/data/repositories/profileRepository', () => ({
  ensureProfile: jest.fn(),
  updateDisplayName: jest.fn().mockResolvedValue(undefined),
}));
// The reminder service reaches expo-notifications; this screen's own wiring
// (what it stores, and what it says afterwards) is what these tests cover.
jest.mock('../../../src/services/reminderService', () => ({
  saveReminderSettings: jest.fn(),
}));
jest.mock('@react-native-community/datetimepicker', () => ({
  DateTimePickerAndroid: { open: jest.fn() },
}));
// Both backup entry points reach expo-sqlite/expo-file-system native modules,
// which cannot load under Jest (docs/TEST_STRATEGY.md) — the screen's own
// wiring is what these tests cover.
jest.mock('../../../src/data/backup/export', () => ({
  exportBackup: jest.fn(),
  shareLatestSafetyBackup: jest.fn(),
}));
jest.mock('../../../src/data/backup/expoImport', () => ({ importBackup: jest.fn() }));

/**
 * RN's Android Switch renders its state as the host prop `on`, not `value` —
 * reading `props.value` off the host element silently yields undefined.
 */
function reminderSwitchValue(): boolean {
  return screen.getByTestId('settings-reminder-switch').props.on;
}

/** Drives the native time picker as a user picking a time would. */
async function pickTime(hour: number, minute: number) {
  const [options] = (DateTimePickerAndroid.open as jest.Mock).mock.calls.at(-1);
  const picked = new Date();
  picked.setHours(hour, minute, 0, 0);
  await act(async () => {
    options.onValueChange({ type: 'set' }, picked);
  });
}

const existingProfile = {
  id: 'profile-1',
  displayName: 'Nutzer',
  reminderEnabled: false,
  reminderTime: '08:00',
  createdAt: 'x',
};

/** Runs the confirmation alert's destructive action, as a user tapping it would. */
async function confirmAlert() {
  const [, , buttons] = (Alert.alert as jest.Mock).mock.calls.at(-1);
  const confirm = buttons.find((button: { style?: string }) => button.style === 'destructive');
  // The handler is async and updates state after awaiting, so it has to run
  // inside act() for React to flush those updates before assertions.
  await act(async () => {
    await confirm.onPress();
  });
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureProfile as jest.Mock).mockResolvedValue(existingProfile);
    (saveReminderSettings as jest.Mock).mockResolvedValue({
      status: 'scheduled',
      time: { hour: 8, minute: 0 },
    });
    (exportBackup as jest.Mock).mockResolvedValue({ uri: 'file:///backup.json', shared: true });
    (shareLatestSafetyBackup as jest.Mock).mockResolvedValue(true);
    (importBackup as jest.Mock).mockResolvedValue({
      status: 'imported',
      safetyBackupPath: '/private/safety.json',
      backup: { manifest: {}, tables: {} },
    });
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it('pre-fills the display name field with the current profile name', async () => {
    await render(<SettingsScreen />);

    expect(await screen.findByDisplayValue('Nutzer')).toBeTruthy();
  });

  it('links to the category management screen', async () => {
    await render(<SettingsScreen />);

    expect(screen.getByTestId('settings-category-management-link')).toBeTruthy();
  });

  it('saves the new display name and disables save again once persisted', async () => {
    await render(<SettingsScreen />);
    await screen.findByDisplayValue('Nutzer');

    await fireEvent.changeText(screen.getByTestId('settings-display-name-input'), 'Alex');
    expect(screen.getByTestId('settings-save-display-name').props.accessibilityState.disabled).toBe(
      false,
    );

    await fireEvent.press(screen.getByTestId('settings-save-display-name'));

    expect(updateDisplayName).toHaveBeenCalledWith({}, 'profile-1', 'Alex');
    expect(screen.getByTestId('settings-save-display-name').props.accessibilityState.disabled).toBe(
      true,
    );
  });

  it('keeps save disabled when the name is unchanged or blank', async () => {
    await render(<SettingsScreen />);
    await screen.findByDisplayValue('Nutzer');

    expect(screen.getByTestId('settings-save-display-name').props.accessibilityState.disabled).toBe(
      true,
    );

    await fireEvent.changeText(screen.getByTestId('settings-display-name-input'), '   ');
    expect(screen.getByTestId('settings-save-display-name').props.accessibilityState.disabled).toBe(
      true,
    );
  });

  describe('daily reminder', () => {
    it('shows the stored reminder state', async () => {
      (ensureProfile as jest.Mock).mockResolvedValue({
        ...existingProfile,
        reminderEnabled: true,
        reminderTime: '21:15',
      });
      await render(<SettingsScreen />);

      await waitFor(() => expect(reminderSwitchValue()).toBe(true));
      expect(screen.getByTestId('settings-reminder-time')).toHaveTextContent(/21:15 Uhr/);
    });

    it('is off on a fresh profile and says nothing about permissions yet', async () => {
      await render(<SettingsScreen />);

      await waitFor(() => expect(reminderSwitchValue()).toBe(false));
      expect(screen.queryByTestId('settings-reminder-permission-hint')).toBeNull();
      expect(screen.queryByTestId('settings-reminder-confirmation')).toBeNull();
    });

    it('saves and confirms the reminder when switched on', async () => {
      await render(<SettingsScreen />);
      await screen.findByDisplayValue('Nutzer');

      await act(async () => {
        fireEvent(screen.getByTestId('settings-reminder-switch'), 'valueChange', true);
      });

      expect(saveReminderSettings).toHaveBeenCalledWith({}, 'profile-1', {
        enabled: true,
        time: '08:00',
      });
      expect(await screen.findByTestId('settings-reminder-confirmation')).toHaveTextContent(
        /08:00 Uhr/,
      );
    });

    it('applies a newly picked time, keeping the reminder switched on', async () => {
      (ensureProfile as jest.Mock).mockResolvedValue({
        ...existingProfile,
        reminderEnabled: true,
        reminderTime: '08:00',
      });
      await render(<SettingsScreen />);
      await waitFor(() => expect(reminderSwitchValue()).toBe(true));

      await act(async () => {
        fireEvent.press(screen.getByTestId('settings-reminder-time'));
      });
      await pickTime(6, 45);

      expect(saveReminderSettings).toHaveBeenCalledWith({}, 'profile-1', {
        enabled: true,
        time: '06:45',
      });
      expect(screen.getByTestId('settings-reminder-time')).toHaveTextContent(/06:45 Uhr/);
    });

    it('switching off cancels the reminder without claiming one is active', async () => {
      (ensureProfile as jest.Mock).mockResolvedValue({
        ...existingProfile,
        reminderEnabled: true,
        reminderTime: '08:00',
      });
      (saveReminderSettings as jest.Mock).mockResolvedValue({ status: 'disabled' });
      await render(<SettingsScreen />);
      await waitFor(() => expect(reminderSwitchValue()).toBe(true));

      await act(async () => {
        fireEvent(screen.getByTestId('settings-reminder-switch'), 'valueChange', false);
      });

      expect(saveReminderSettings).toHaveBeenCalledWith({}, 'profile-1', {
        enabled: false,
        time: '08:00',
      });
      expect(screen.queryByTestId('settings-reminder-confirmation')).toBeNull();
    });

    it('puts the switch back and says so when saving fails', async () => {
      (saveReminderSettings as jest.Mock).mockRejectedValue(new Error('disk full'));
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      await render(<SettingsScreen />);
      await screen.findByDisplayValue('Nutzer');

      await act(async () => {
        fireEvent(screen.getByTestId('settings-reminder-switch'), 'valueChange', true);
      });

      // Nothing was stored, so the switch must not keep claiming otherwise.
      expect(await screen.findByTestId('settings-reminder-error')).toBeTruthy();
      expect(reminderSwitchValue()).toBe(false);
      expect(screen.queryByTestId('settings-reminder-confirmation')).toBeNull();
    });

    it('explains how to fix a refused notification permission', async () => {
      (saveReminderSettings as jest.Mock).mockResolvedValue({ status: 'permission-missing' });
      await render(<SettingsScreen />);
      await screen.findByDisplayValue('Nutzer');

      await act(async () => {
        fireEvent(screen.getByTestId('settings-reminder-switch'), 'valueChange', true);
      });

      expect(await screen.findByTestId('settings-reminder-permission-hint')).toBeTruthy();
      expect(screen.getByTestId('settings-reminder-open-system-settings')).toBeTruthy();
      // The switch keeps the user's choice: granting the permission later must
      // bring the reminder back without re-entering anything.
      expect(reminderSwitchValue()).toBe(true);
    });
  });

  describe('backup', () => {
    it('exports a backup and confirms it was shared', async () => {
      await render(<SettingsScreen />);

      await fireEvent.press(screen.getByTestId('settings-export-backup'));

      expect(exportBackup).toHaveBeenCalled();
      expect((await screen.findByTestId('settings-backup-message')).props.children).toContain(
        'geteilt',
      );
    });

    it('tells the user where the file landed when sharing is unavailable', async () => {
      (exportBackup as jest.Mock).mockResolvedValue({ uri: 'file:///backup.json', shared: false });
      await render(<SettingsScreen />);

      await fireEvent.press(screen.getByTestId('settings-export-backup'));

      expect((await screen.findByTestId('settings-backup-message')).props.children).toContain(
        'file:///backup.json',
      );
    });

    it('shows a failed export without claiming success', async () => {
      (exportBackup as jest.Mock).mockRejectedValue(new Error('no space'));
      await render(<SettingsScreen />);

      await fireEvent.press(screen.getByTestId('settings-export-backup'));

      expect(await screen.findByTestId('settings-backup-error')).toBeTruthy();
      expect(screen.queryByTestId('settings-backup-message')).toBeNull();
    });

    it('asks for confirmation before importing and does not import until confirmed', async () => {
      await render(<SettingsScreen />);

      await fireEvent.press(screen.getByTestId('settings-import-backup'));

      expect(Alert.alert).toHaveBeenCalled();
      expect(importBackup).not.toHaveBeenCalled();
    });

    it('reports no error after a successful import', async () => {
      await render(<SettingsScreen />);

      await fireEvent.press(screen.getByTestId('settings-import-backup'));
      await confirmAlert();

      // The "restart required" state is app-wide, owned by the root layout via
      // src/state/databaseLifecycle.ts — this screen is about to be unmounted
      // with the whole navigator, so it only has to not claim a failure.
      expect(importBackup).toHaveBeenCalled();
      expect(screen.queryByTestId('settings-backup-error')).toBeNull();
    });

    it('shares the latest safety backup', async () => {
      await render(<SettingsScreen />);

      await fireEvent.press(screen.getByTestId('settings-share-safety-backup'));

      await waitFor(() => expect(shareLatestSafetyBackup).toHaveBeenCalled());
      expect(screen.queryByTestId('settings-backup-error')).toBeNull();
    });

    it('explains when there is no safety backup yet', async () => {
      (shareLatestSafetyBackup as jest.Mock).mockResolvedValue(false);
      await render(<SettingsScreen />);

      await fireEvent.press(screen.getByTestId('settings-share-safety-backup'));

      expect((await screen.findByTestId('settings-backup-message')).props.children).toContain(
        'noch keine Sicherungskopie',
      );
    });

    it('stays usable and reports the reason when an import fails', async () => {
      (importBackup as jest.Mock).mockRejectedValue(new BackupParseError('not json'));
      await render(<SettingsScreen />);

      await fireEvent.press(screen.getByTestId('settings-import-backup'));
      await confirmAlert();

      const error = await screen.findByTestId('settings-backup-error');
      expect(error.props.children).toContain('Deine Daten wurden nicht verändert.');
      expect(screen.getByTestId('settings-export-backup')).toBeTruthy();
    });

    it('does nothing visible when the user cancels the file picker', async () => {
      (importBackup as jest.Mock).mockResolvedValue({ status: 'cancelled' });
      await render(<SettingsScreen />);

      await fireEvent.press(screen.getByTestId('settings-import-backup'));
      await confirmAlert();

      await waitFor(() =>
        expect(screen.getByTestId('settings-import-backup').props.accessibilityState.disabled).toBe(
          false,
        ),
      );
      expect(screen.queryByTestId('settings-backup-error')).toBeNull();
    });
  });
});
