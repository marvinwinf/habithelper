import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../src/ui/theme';

// Placeholder shell (T084/Phase 12): the weekly per-routine completion
// dot-matrix lands in T087. The manage-links below are the real, permanent
// entry points into the Routines/Tasks screens now that they are plain
// routes instead of tabs (docs/SCREEN_SPECIFICATIONS.md's Plan Screen).
export default function PlanScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Plan</Text>
      <Text style={styles.placeholder}>Die Wochenübersicht folgt in Kürze.</Text>

      <View style={styles.links}>
        <Link href="/routines" style={styles.link} testID="plan-manage-routines-link">
          Alle Routinen verwalten
        </Link>
        <Link href="/tasks" style={styles.link} testID="plan-manage-tasks-link">
          Alle Aufgaben verwalten
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight,
    fontWeight: typography.title.fontWeight,
    color: colors.textPrimary,
  },
  placeholder: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
  },
  links: {
    gap: spacing.sm,
  },
  link: {
    fontSize: typography.body.fontSize,
    color: colors.accent,
  },
});
