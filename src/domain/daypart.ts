// Daypart ambience for the Today header: the screen's mood follows the clock
// (soft dawn in the morning, clear sky by day, warm dusk in the evening, calm
// lavender at night) so opening the app at different times feels different —
// alive rather than static. Pure functions with explicit inputs so every
// boundary is unit-testable; the greeting text itself stays in greeting.ts.

import { dayOfYear } from './focusOfTheDay';

export type Daypart = 'morning' | 'day' | 'evening' | 'night';

/** Maps an hour (0-23) to a daypart. Night wraps midnight: 22:00–04:59. */
export function daypartForHour(hour: number): Daypart {
  if (hour >= 5 && hour < 11) {
    return 'morning';
  }
  if (hour >= 11 && hour < 17) {
    return 'day';
  }
  if (hour >= 17 && hour < 22) {
    return 'evening';
  }
  return 'night';
}

// A few gentle lines per daypart, rotated by day of year so the header reads
// a little differently each day without any backend or personalization.
// Invitations only — never a reminder of what is still undone.
const DAYPART_LINES: Record<Daypart, readonly string[]> = {
  morning: [
    'Ein frischer Tag, ganz in Ruhe.',
    'Langsam ankommen, dann loslegen.',
    'Kleine Schritte, sanfter Schwung.',
    'Der Morgen gehört dir.',
  ],
  day: [
    'Schritt für Schritt durch den Tag.',
    'Kleine Schritte, sanfter Schwung.',
    'Kurz durchatmen, dann weiter.',
    'Du bist mittendrin — gut so.',
  ],
  evening: [
    'Der Tag wird ruhiger.',
    'Zeit, sanft auszuklingen.',
    'Was heute geklappt hat, zählt.',
    'Kleine Schritte, sanfter Schwung.',
  ],
  night: [
    'Ruhige Nacht. Morgen geht es weiter.',
    'Zeit zum Abschalten.',
    'Gut gemacht für heute.',
  ],
};

/** The header's supportive line for a daypart on a given `YYYY-MM-DD` date. */
export function daypartLine(daypart: Daypart, dateString: string): string {
  const lines = DAYPART_LINES[daypart];
  return lines[dayOfYear(dateString) % lines.length];
}

// The day's closing line (T098) once every due routine is done — replaces
// the daypart line so finishing the day reads as its own small scene.
const DAY_COMPLETE_LINES: Record<Daypart, string> = {
  morning: 'Schon alles geschafft — der Tag gehört dir.',
  day: 'Alles erledigt. Der Rest des Tages ist frei.',
  evening: 'Für heute ist alles getan. Schönen Abend!',
  night: 'Alles getan. Gute Nacht.',
};

/** The header line once every due routine of the day is done. */
export function dayCompleteLine(daypart: Daypart): string {
  return DAY_COMPLETE_LINES[daypart];
}

/** All lines for a daypart — exposed for tests and previews. */
export function daypartLines(daypart: Daypart): readonly string[] {
  return DAYPART_LINES[daypart];
}
