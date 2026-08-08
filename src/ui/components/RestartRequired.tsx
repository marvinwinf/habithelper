import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';
import { Card } from './Card';

/**
 * Terminal state after a successful backup import.
 *
 * The import swap closes the singleton database connection and replaces the
 * file underneath it (src/data/backup/expoImport.ts), and there is no way to
 * rebind that singleton mid-session — so every screen from here on would query
 * a closed handle. The root layout renders this *instead of* the navigator, so
 * the tab bar is gone too: an earlier version blocked only the Settings screen
 * body and left "Heute" one tap away from doing exactly that.
 *
 * Shared by both entry points (Settings import and the startup recovery
 * screen's restore) so the wording cannot drift between them.
 */
export function RestartRequired({ testID }: { testID?: string }) {
  return (
    <View style={styles.screen} testID={testID}>
      <Card style={styles.card}>
        <Text style={styles.title}>Backup wiederhergestellt</Text>
        <Text style={styles.body}>
          Deine Daten wurden aus dem Backup wiederhergestellt. Bitte schließe die App vollständig
          und öffne sie erneut, damit die wiederhergestellten Daten geladen werden.
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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
});
