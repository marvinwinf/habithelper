// Calendar-date helpers shared by every screen that stamps or compares
// occurrence dates. All routine semantics (docs/ROUTINE_RULES.md) are about
// the user's LOCAL calendar day, so these intentionally use the device's
// local clock — `Date.toISOString()` would yield the UTC date, which is off
// by one around midnight for any user not in UTC.

/** Formats a Date as its local calendar date, `YYYY-MM-DD`. */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Today's local calendar date, `YYYY-MM-DD`. */
export function todayDateString(): string {
  return toLocalDateString(new Date());
}

/** Shifts a `YYYY-MM-DD` date string by `days` (negative allowed), across month/year boundaries. */
export function addDaysToDateString(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return toLocalDateString(new Date(year, month - 1, day + days));
}
