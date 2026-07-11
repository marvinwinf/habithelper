import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';
import { categoryPalette } from '../theme/categoryVariant';

export interface FocusOfTheDayCardProps {
  prompt: string;
  testID?: string;
}

/**
 * Accent-tinted daily-highlight card (docs/DESIGN_SYSTEM.md's Focus of the
 * Day section): a short label, a rotating static prompt, and a placeholder
 * decorative icon — no personalization or backend involved.
 */
export function FocusOfTheDayCard({ prompt, testID }: FocusOfTheDayCardProps) {
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.textBlock}>
        <Text style={styles.label}>Fokus des Tages</Text>
        <Text style={styles.prompt}>{prompt}</Text>
      </View>
      <Ionicons name="leaf-outline" size={40} color={categoryPalette.mint.dark} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: categoryPalette.mint.lighter,
  },
  textBlock: {
    flex: 1,
    gap: spacing.xxs,
  },
  label: {
    ...typography.label,
    color: categoryPalette.mint.dark,
  },
  prompt: {
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
  },
});
