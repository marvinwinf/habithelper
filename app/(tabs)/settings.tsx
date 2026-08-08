import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { exportBackup, shareLatestSafetyBackup } from '../../src/data/backup/export';
import { importBackup } from '../../src/data/backup/expoImport';
import { db } from '../../src/data/db/client';
import { ensureProfile, updateDisplayName } from '../../src/data/repositories/profileRepository';
import { confirmBackupImport } from '../../src/ui/alerts';
import { describeExportError, describeImportError } from '../../src/ui/backupMessages';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { NavRow } from '../../src/ui/components/NavRow';
import { colors, radius, spacing, typography } from '../../src/ui/theme';

/** Which long-running backup action is in flight, if any. */
type BackupBusy = 'export' | 'import' | 'safety' | null;

export default function SettingsScreen() {
  const [profileId, setProfileId] = useState<string | undefined>(undefined);
  const [displayName, setDisplayName] = useState('');
  const [savedDisplayName, setSavedDisplayName] = useState('');
  const [busy, setBusy] = useState<BackupBusy>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureProfile(db).then((profile) => {
      if (!cancelled) {
        setProfileId(profile.id);
        setDisplayName(profile.displayName);
        setSavedDisplayName(profile.displayName);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
