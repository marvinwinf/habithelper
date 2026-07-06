// Splits tasks between the Today screen's Tasks section (due now) and its
// For-later section (not yet due), per T049. A task is "due now" if it has a
// date and that date is today or earlier (overdue or due today); an undated
// task, or one dated in the future, belongs in For later.

export function isDueTodayOrEarlier(date: string | null, today: string): boolean {
  return date !== null && date <= today;
}
