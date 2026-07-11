// "Focus of the day" card on the Today screen (docs/DESIGN_SYSTEM.md's Focus
// of the Day section): a static, non-personalized prompt that rotates by
// day-of-year — no backend, no user data involved.

const FOCUS_PROMPTS: readonly string[] = [
  'Beweg dich heute ein paar Minuten – das reicht schon.',
  'Trink ausreichend Wasser über den Tag verteilt.',
  'Gönn dir fünf ruhige Minuten ganz ohne Bildschirm.',
  'Miss deinen Routinen keine Perfektion an – nur Stetigkeit.',
  'Erledige eine kleine Aufgabe, die du schon länger vor dir herschiebst.',
  'Atme einmal bewusst tief durch, bevor du weitermachst.',
  'Feiere kurz, was du diese Woche schon geschafft hast.',
];

/** Day-of-year (1–366) for a `YYYY-MM-DD` date string, in local time. */
export function dayOfYear(dateString: string): number {
  const [year, month, day] = dateString.split('-').map(Number);
  const start = new Date(year, 0, 1);
  const current = new Date(year, month - 1, day);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((current.getTime() - start.getTime()) / msPerDay) + 1;
}

/** Deterministic focus prompt for a given `YYYY-MM-DD` date string. */
export function focusOfTheDay(dateString: string): string {
  const index = (dayOfYear(dateString) - 1) % FOCUS_PROMPTS.length;
  return FOCUS_PROMPTS[index];
}
