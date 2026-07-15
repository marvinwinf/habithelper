import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors, radius } from '../theme';

// How strongly the sheen lightens the card at its brightest corner. The
// sheen only ever blends `surface` (near-white) over the category tint, so
// it can only raise text contrast, never lower it — locked in by
// src/ui/theme/__tests__/contrast.test.ts.
export const CARD_SHEEN_MAX_OPACITY = 0.5;

// Where along the diagonal the sheen has fully faded out — past this the
// card shows its flat category tint, so the tint stays the dominant color.
const SHEEN_FADE_END = 0.65;

export interface CardSheenProps {
  /** Corner radius of the card the sheen sits inside. */
  borderRadius?: number;
  testID?: string;
}

/**
 * A soft light-from-above gradient laid over a category-tinted card: the
 * card's own `surface` tone falls in from the top-left corner and fades out
 * along the diagonal, so the flat pastel tint reads as gently lit paper
 * instead of a solid block (docs/DESIGN_SYSTEM.md's Routine and Task Item
 * Design). One hue per card is preserved — the sheen adds light, not a
 * second color. Purely decorative: it never carries information and ignores
 * touches.
 */
export function CardSheen({ borderRadius = radius.lg, testID }: CardSheenProps) {
  // useId can contain colons, which are unsafe inside an SVG reference.
  const gradientId = `card-sheen-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" testID={testID}>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0" stopColor={colors.surface} stopOpacity={CARD_SHEEN_MAX_OPACITY} />
          <Stop offset={SHEEN_FADE_END} stopColor={colors.surface} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" rx={borderRadius} fill={`url(#${gradientId})`} />
    </Svg>
  );
}
