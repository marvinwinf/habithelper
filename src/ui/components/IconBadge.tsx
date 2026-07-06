import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, iconBadgeSizes, type IconBadgeSize } from '../theme';

export type IconBadgeName = keyof typeof Ionicons.glyphMap;

export interface IconBadgeProps {
  name: IconBadgeName;
  backgroundColor?: string;
  iconColor?: string;
  size?: IconBadgeSize;
  testID?: string;
}

/**
 * Rounded icon container per docs/DESIGN_SYSTEM.md's "rounded icon
 * container" card treatment — the icon badges shown on routine/task cards
 * and the routine detail hero in the design reference mockup
 * (docs/design_reference.png). Defaults to a neutral tint; callers pass a
 * category variant's colors (src/ui/theme/categoryVariant.ts) to tint it.
 */
export function IconBadge({
  name,
  backgroundColor = colors.surfaceMuted,
  iconColor = colors.textSecondary,
  size = 'md',
  testID,
}: IconBadgeProps) {
  const { container, icon, radius } = iconBadgeSizes[size];

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        { width: container, height: container, borderRadius: radius, backgroundColor },
      ]}
    >
      <Ionicons name={name} size={icon} color={iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
