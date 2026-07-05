// Shared task ordering for the Tasks screen (T046) and the Today screen's
// combined Tasks/For-later sections (T049): ascending by date (nulls last,
// since undated tasks only ever share a bucket with dated ones on Today),
// then by time (nulls last), per docs/SCREEN_SPECIFICATIONS.md's "sorting is
// based on date and time."

export interface DateTimeOrderable {
  date: string | null;
  timeOfDay: string | null;
}

export function compareByDateThenTime(a: DateTimeOrderable, b: DateTimeOrderable): number {
  if (a.date !== b.date) {
    if (a.date === null) return 1;
    if (b.date === null) return -1;
    return a.date.localeCompare(b.date);
  }
  if (a.timeOfDay !== b.timeOfDay) {
    if (a.timeOfDay === null) return 1;
    if (b.timeOfDay === null) return -1;
    return a.timeOfDay.localeCompare(b.timeOfDay);
  }
  return 0;
}
