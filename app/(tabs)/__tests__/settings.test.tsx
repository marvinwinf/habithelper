import { fireEvent, render, screen } from '@testing-library/react-native';

import SettingsScreen from '../settings';
import { ensureProfile, updateDisplayName } from '../../../src/data/repositories/profileRepository';

jest.mock('../../../src/data/db/client', () => ({ db: {} }));
jest.mock('../../../src/data/repositories/profileRepository', () => ({
  ensureProfile: jest.fn(),
  updateDisplayName: jest.fn().mockResolvedValue(undefined),
}));

const existingProfile = { id: 'profile-1', displayName: 'Nutzer', createdAt: 'x' };

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureProfile as jest.Mock).mockResolvedValue(existingProfile);
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
});
