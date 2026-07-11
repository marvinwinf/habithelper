import { dayOfYear, focusOfTheDay } from '../focusOfTheDay';

describe('dayOfYear', () => {
  it('returns 1 for January 1st', () => {
    expect(dayOfYear('2026-01-01')).toBe(1);
  });

  it('returns 32 for February 1st', () => {
    expect(dayOfYear('2026-02-01')).toBe(32);
  });

  it('accounts for leap years', () => {
    // 2024 is a leap year: March 1st is day 61, not day 60.
    expect(dayOfYear('2024-03-01')).toBe(61);
  });
});

describe('focusOfTheDay', () => {
  it('is deterministic for the same date', () => {
    expect(focusOfTheDay('2026-07-11')).toBe(focusOfTheDay('2026-07-11'));
  });

  it('cycles through the static prompt list across a year', () => {
    const day1 = focusOfTheDay('2026-01-01');
    const day2 = focusOfTheDay('2026-01-02');
    // Consecutive days must not always coincide (list has more than one entry).
    expect(day1 === day2).toBe(false);
  });

  it('returns a non-empty prompt for every day of a full year', () => {
    for (let day = 1; day <= 365; day++) {
      const date = new Date(2026, 0, day);
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
      ).padStart(2, '0')}`;
      expect(focusOfTheDay(dateString).length).toBeGreaterThan(0);
    }
  });
});
