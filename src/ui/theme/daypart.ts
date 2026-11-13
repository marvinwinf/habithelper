// Daypart ambience palette for the Today header's sky wash
// (docs/DESIGN_SYSTEM.md's Daypart Ambience section). Each daypart gets a pale
// `sky` tint that fades down into the app background, plus a soft `glow` for
// the sun/moon disc. All values come from the existing pastel families so the
// mood stays inside Soft Momentum; every `sky` is pale enough that the
// standard text tokens keep AA contrast on it (see contrast.test.ts).

import type { Daypart } from '../../domain/daypart';
import { categoryPalette } from './categoryVariant';

export interface DaypartTheme {
  /** Pale tint at the very top of the screen, fading to `background`. */
  sky: string;
  /** Soft disc behind the header's top-right corner (sun or moon). */
  glow: string;
  /** Small Ionicons glyph shown beside the header's daypart line. */
  icon: 'sunny-outline' | 'partly-sunny-outline' | 'cloudy-night-outline' | 'moon-outline';
}

export const daypartThemes: Record<Daypart, DaypartTheme> = {
  morning: {
    sky: categoryPalette.apricot.lighter,
    glow: categoryPalette.apricot.light,
    icon: 'partly-sunny-outline',
  },
  day: {
    sky: categoryPalette.skyBlue.lighter,
    glow: categoryPalette.warmCream.light,
    icon: 'sunny-outline',
  },
  evening: {
    sky: categoryPalette.softPeach.lighter,
    glow: categoryPalette.softPeach.light,
    icon: 'cloudy-night-outline',
  },
  night: {
    sky: categoryPalette.lavender.lighter,
    glow: categoryPalette.lavender.light,
    icon: 'moon-outline',
  },
};
