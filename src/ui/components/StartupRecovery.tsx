import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '../theme';
import { Button } from './Button';
import { Card } from './Card';
import { RestartRequired } from './RestartRequired';

export interface StartupRecoveryProps {
  /** Retries the whole startup sequence (migrations, profile, reconciliation). */
  onRetry: () => void;
  /** Opens the backup picker and restores; resolves true if a restore happened. */
  onRestoreBackup: () => Promise<boolean>;
  testID?: string;
}

/**
 * Blocking recovery view for startup-critical failures (docs/ARCHITECTURE.md's
 * Error Handling — "a dedicated full-screen recovery view, not a silent crash
 * or blank screen").
 *
 * Before this existed, a failed migration was only `console.error`d and the
 * app carried on: screens mounted against an unmigrated database, every query
 * failed, and the user saw empty lists — indistinguishable from having lost
 * all their data. Saying plainly that the data is still on the device is the
 * most important thing this screen does.
 *
 * It deliberately offers no "start fresh" / wipe option, even though
 * docs/ARCHITECTURE.md lists one as a last resort: deleting the user's only
 * copy of their history to resolve a schema problem is exactly what
 * CLAUDE.md's working rules forbid, and a user tapping it in frustration
 * could not undo it. Retry and restore-from-backup are both non-destructive.
 */
export function StartupRecovery({ onRetry, onRestoreBackup, testID }: StartupRecoveryProps) {
  const [busy, setBusy] = useState(false);
  const [restored, setRestored] = useState(false);
  const [restoreFailed, setRestoreFailed] = useState(false);

  async function handleRestore() {
    setRestoreFailed(false);
    setBusy(true);
    try {
      if (await onRestoreBackup()) {
        setRestored(true);
      }
    } catch {
      setRestoreFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (restored) {
    return <RestartRequired testID={testID ? `${testID}-restored` : undefined} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID={testID}>
      <Card style={styles.card}>
        <Text style={styles.title}>Die App konnte nicht starten</Text>
        <Text style={styles.body}>
          Beim Öffnen deiner Daten ist etwas schiefgelaufen. Deine Routinen und Aufgaben sind
          weiterhin auf dem Gerät gespeichert und wurden nicht gelöscht.
        </Text>
        <Button label="Erneut versuchen" onPress={onRetry} disabled={busy} testID="startup-retry" />
        <Button
          label={busy ? 'Backup wird wiederhergestellt…' : 'Backup wiederherstellen'}
          variant="secondary"
          onPress={handleRestore}
          disabled={busy}
          testID="startup-restore-backup"
        />
        {restoreFailed && (
          <Text style={styles.error} testID="startup-restore-error">
            Das Backup konnte nicht wiederhergestellt werden. Deine vorhandenen Daten wurden nicht
            verändert.
          </Text>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  title: {
    fontSize: typography.heading.fontSize,
    lineHeight: typography.heading.lineHeight,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
  },
  body: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textSecondary,
  },
  error: {
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.destructive,
  },
});
