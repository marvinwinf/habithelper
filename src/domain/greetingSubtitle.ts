// Rotating subtitle line under the Today greeting
// (docs/SCREEN_SPECIFICATIONS.md's Today Header). Like focusOfTheDay, the
// rotation is static and deterministic — keyed by day-of-year within a
// time-of-day pool — no personalization, no randomness, so the line is
// stable across re-renders of the same day.

import { dayOfYear } from './focusOfTheDay';
import { timeOfDayForHour, type TimeOfDay } from './greeting';

// Gentle, non-demanding lines per docs/DESIGN_SYSTEM.md's tone (no
// punishment, no pressure). Every pool keeps the original line so the
// familiar voice stays in rotation.
const SUBTITLES_BY_TIME_OF_DAY: Record<TimeOfDay, readonly string[]> = {
  morning: [
    'Kleine Schritte, sanfter Schwung.',
    'Ein neuer Tag, ganz in deinem Tempo.',
    'Sanft starten zählt auch.',
    'Heute reicht ein kleiner Anfang.',
    'Der Morgen gehört dir.',
  ],
  afternoon: [
    'Kleine Schritte, sanfter Schwung.',
    'Ein Schritt nach dem anderen.',
    'Schön, dass du dranbleibst.',
    'Weiter in deinem eigenen Rhythmus.',
    'Zwischendurch zählt genauso.',
  ],
  evening: [
    'Kleine Schritte, sanfter Schwung.',
    'Lass den Tag ruhig ausklingen.',
    'Was heute war, darf reichen.',
    'Zeit, den Tag sanft abzurunden.',
    'Morgen ist auch noch ein Tag.',
  ],
};

/**
 * Deterministic greeting subtitle for a given `YYYY-MM-DD` date string and
 * hour of day (0–23): the day-of-year rotates through the pool that matches
 * the greeting's own time-of-day bucket.
 */
export function greetingSubtitle(dateString: string, hour: number): string {
  const pool = SUBTITLES_BY_TIME_OF_DAY[timeOfDayForHour(hour)];
  return pool[(dayOfYear(dateString) - 1) % pool.length];
}
