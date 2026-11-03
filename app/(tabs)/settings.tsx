import { useEffect, useState } from 'react';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Switch, Text, TextInput } from 'react-native';

import { exportBackup, shareLatestSafetyBackup } from '../../src/data/backup/export';
import { importBackup } from '../../src/data/backup/expoImport';
import { db } from '../../src/data/db/client';
import { ensureProfile, updateDisplayName } from '../../src/data/repositories/profileRepository';
import {
  enableReminder,
  disableReminder,
  formatReminderTime,
  parseReminderTime,
  type ReminderResult,
} from '../../src/services/reminderService';
import { confirmBackupImport } from '../../src/ui/alerts';
import { describeExportError, describeImportError } from '../../src/ui/backupMessages';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { NavRow } from '../../src/ui/components/NavRow';
import { colors, radius, spacing, typography } from '../../src/ui/theme';

const DEFAULT_REMINDER_TIME = '20:00';

/** Builds a Date carrying today's date but the stored reminder's `HH:mm`,
 * which is the shape the native time picker needs as its starting value. */
function timeStringToDate(time: string): Date {
  const parsed = parseReminderTime(time) ?? { hour: 20, minute: 0 };
  const date = new Date();
  date.setHours(parsed.hour, parsed.minute, 0, 0);
  return date;
}

function openReminderTimePicker(currentTime: string, onPicked: (time: string) => void) {
  DateTimePickerAndroid.open({
    value: timeStringToDate(currentTime),
    mode: 'time',
    onValueChange: (_event, selectedDate) => {
      if (selectedDate) {
        onPicked(formatReminderTime(selectedDate));
      }
    },
  });
}

/** Which long-running backup action is in flight, if any. */
type BackupBusy = 'export' | 'import' | 'safety' | null;

export default function SettingsScreen() {
  const [profileId, setProfileId] = useState<string | undefined>(undefined);
  const [displayName, setDisplayName] = useState('');
  const [savedDisplayName, setSavedDisplayName] = useState('');
  const [busy, setBusy] = useState<BackupBusy>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  // Reminder state (T093). `reminderTime` holds the last known/picked time
  // even while the reminder is off, so re-enabling starts the picker where
  // the user left it instead of snapping back to the default.
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(DEFAULT_REMINDER_TIME);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderPermissionDenied, setReminderPermissionDenied] = useState(false);
  const [reminderError, setReminderError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureProfile(db).then((profile) => {
      if (!cancelled) {
        setProfileId(profile.id);
        setDisplayName(profile.displayName);
        setSavedDisplayName(profile.displayName);
        setReminderEnabled(profile.reminderEnabled);
        if (profile.reminderTime) {
          setReminderTime(profile.reminderTime);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function applyReminderResult(result: ReminderResult, requestedTime: string) {
    setReminderPermissionDenied(result.status === 'permission-denied');
    setReminderError(result.status === 'failed');
    if (result.status === 'scheduled') {
      setReminderEnabled(true);
      setReminderTime(result.time);
    } else {
      // Every non-scheduled outcome (denied permission, platform failure, or
      // an explicit cancel) leaves nothing scheduled, so the toggle must
      // visibly return to off rather than keep claiming an active reminder.
      setReminderEnabled(false);
      setReminderTime(requestedTime);
    }
  }

  async function handleReminderToggle(nextEnabled: boolean) {
    if (!profileId || reminderBusy) {
      return;
    }
    setReminderBusy(true);
    try {
      if (nextEnabled) {
        const result = await enableReminder(db, profileId, reminderTime);
        applyReminderResult(result, reminderTime);
      } else {
        const result = await disableReminder(db, profileId);
        setReminderPermissionDenied(false);
        setReminderError(result.status === 'failed');
        if (result.status === 'cancelled') {
          setReminderEnabled(false);
        }
        // A failed cancel leaves the toggle on, matching disableReminder's
        // own contract: it only clears the stored setting once the OS call
        // actually succeeds, so the UI never claims "off" for a reminder
        // that may still fire.
      }
    } finally {
      setReminderBusy(false);
    }
  }

  function handleReminderTimePress() {
    if (!profileId || !reminderEnabled || reminderBusy) {
      return;
    }
    openReminderTimePicker(reminderTime, async (pickedTime) => {
      setReminderBusy(true);
      try {
        const result = await enableReminder(db, profileId, pickedTime);
        applyReminderResult(result, pickedTime);
      } finally {
        setReminderBusy(false);
      }
    });
  }

  const trimmedName = displayName.trim();
  const canSave = trimmedName.length > 0 && trimmedName !== savedDisplayName;

  async function handleSave() {
    if (!profileId) {
      return;
    }
    await updateDisplayName(db, profileId, trimmedName);
    setSavedDisplayName(trimmedName);
    setDisplayName(trimmedName);
  }

  function clearBackupFeedback() {
    setBackupMessage(null);
    setBackupError(null);
  }

  async function handleExport() {
    clearBackupFeedback();
    setBusy('export');
    try {
      const result = await exportBackup();
      setBackupMessage(
        result.shared
          ? 'Backup erstellt und geteilt.'
          : `Backup gespeichert unter ${result.uri}. Teilen ist auf diesem Gerät nicht verfügbar.`,
      );
    } catch (error) {
      setBackupError(describeExportError(error));
    } finally {
      setBusy(null);
    }
  }

  // The pre-import safety backup lives in app-private storage, which the
  // system file picker cannot browse — so without a way to share it out, the
  // rollback path the import confirmation promises could never actually be
  // used. Sharing turns it into a file the user can re-import.
  async function handleShareSafetyBackup() {
    clearBackupFeedback();
    setBusy('safety');
    try {
      const shared = await shareLatestSafetyBackup();
      if (!shared) {
        setBackupMessage('Es gibt noch keine Sicherungskopie — sie entsteht beim ersten Import.');
      }
    } catch (error) {
      setBackupError(describeExportError(error));
    } finally {
      setBusy(null);
    }
  }

  function handleImport() {
    confirmBackupImport(async () => {
      clearBackupFeedback();
      setBusy('import');
      try {
        // A successful import closes the live database connection, which the
        // root layout observes and turns into an app-wide "restart required"
        // state (src/state/databaseLifecycle.ts). Nothing to do here: this
        // screen is about to be unmounted along with the whole navigator.
        await importBackup();
      } catch (error) {
        setBackupError(describeImportError(error));
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Einstellungen</Text>

      <Card style={styles.section}>
        <Text style={styles.label}>Anzeigename</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Anzeigename"
          style={styles.input}
          testID="settings-display-name-input"
        />
        <Button
          label="Speichern"
          onPress={handleSave}
          disabled={!canSave}
          testID="settings-save-display-name"
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.label}>Erinnerung</Text>
        <Text style={styles.hint}>
          Eine tägliche, sanfte Erinnerung — ganz ohne Hinweis auf verpasste Tage.
        </Text>
        <Switch
          value={reminderEnabled}
          onValueChange={handleReminderToggle}
          disabled={reminderBusy}
          trackColor={{ true: colors.accent }}
          testID="settings-reminder-toggle"
        />
        <Button
          label={`Uhrzeit: ${reminderTime}`}
          variant="secondary"
          onPress={handleReminderTimePress}
          disabled={!reminderEnabled || reminderBusy}
          testID="settings-reminder-time"
        />
        <Text style={styles.hint} testID="settings-reminder-status">
          {reminderEnabled ? `Aktiv um ${reminderTime} Uhr.` : 'Erinnerungen sind aus.'}
        </Text>
        {reminderPermissionDenied && (
          <Text style={styles.error} testID="settings-reminder-permission-denied">
            Benachrichtigungen sind in den Systemeinstellungen nicht erlaubt. Du kannst sie dort
            jederzeit aktivieren und es hier erneut versuchen.
          </Text>
        )}
        {reminderError && (
          <Text style={styles.error} testID="settings-reminder-error">
            Die Erinnerung konnte nicht eingerichtet werden. Bitte versuche es erneut.
          </Text>
        )}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.label}>Kategorien</Text>
        <NavRow
          label="Kategorien verwalten"
          href="/category"
          icon="pricetags-outline"
          testID="settings-category-management-link"
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.label}>Datensicherung</Text>
        <Text style={styles.hint}>
          Ein Backup enthält alle Routinen, Aufgaben, Kategorien und den vollständigen Verlauf. Vor
          jedem Import wird automatisch eine Sicherungskopie deiner bisherigen Daten angelegt.
        </Text>
        <Button
          label={busy === 'export' ? 'Backup wird erstellt…' : 'Backup exportieren'}
          onPress={handleExport}
          disabled={busy !== null}
          testID="settings-export-backup"
        />
        <Button
          label={busy === 'import' ? 'Backup wird importiert…' : 'Backup importieren'}
          variant="secondary"
          onPress={handleImport}
          disabled={busy !== null}
          testID="settings-import-backup"
        />
        <Button
          label={busy === 'safety' ? 'Wird geteilt…' : 'Letzte Sicherungskopie teilen'}
          variant="secondary"
          onPress={handleShareSafetyBackup}
          disabled={busy !== null}
          testID="settings-share-safety-backup"
        />
        {backupMessage && (
          <Text style={styles.success} testID="settings-backup-message">
            {backupMessage}
          </Text>
        )}
        {backupError && (
          <Text style={styles.error} testID="settings-backup-error">
            {backupError}
          </Text>
        )}
      </Card>

      {__DEV__ && (
        <Link href="/_dev/component-preview" testID="dev-component-preview-link">
          Component Preview (Dev)
        </Link>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // The screen was a fixed View: with the backup card added, its content no
  // longer fits on a small Android display, so it scrolls.
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
  },
  section: {
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    fontWeight: typography.bodySmall.fontWeight,
    color: colors.textSecondary,
  },
  hint: {
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.textSecondary,
  },
  body: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textPrimary,
  },
  success: {
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.accent,
  },
  error: {
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.destructive,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
});
