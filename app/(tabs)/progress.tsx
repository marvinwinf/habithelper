import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../src/ui/theme';

// Placeholder shell (T084/Phase 12): the streak ring, stat tiles, and charts
// land in T088.
export default function ProgressScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Progress</Text>
      <Text style={styles.placeholder}>Das Dashboard folgt in Kürze.</Text>
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
});
