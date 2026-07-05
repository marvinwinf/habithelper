import { addDaysToDateString, toLocalDateString, todayDateString } from '../dates';

describe('toLocalDateString', () => {
  it('formats using local calendar components, not UTC', () => {
    const date = new Date(2026, 6, 5); // July 5, 2026, local midnight
    expect(toLocalDateString(date)).toBe('2026-07-05');
  });

  it('pads single-digit months and days', () => {
    expect(toLocalDateString(new Date(2026, 0, 3))).toBe('2026-01-03');
  });
});

describe('todayDateString', () => {
  it("matches the current local date's components", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`;
    expect(todayDateString()).toBe(expected);
  });
});

describe('addDaysToDateString', () => {
  it('adds days within a month', () => {
    expect(addDaysToDateString('2026-07-05', 1)).toBe('2026-07-06');
  });

  it('crosses month and year boundaries', () => {
    expect(addDaysToDateString('2026-07-31', 1)).toBe('2026-08-01');
    expect(addDaysToDateString('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('subtracts days across boundaries', () => {
    expect(addDaysToDateString('2026-07-01', -1)).toBe('2026-06-30');
    expect(addDaysToDateString('2026-01-01', -1)).toBe('2025-12-31');
  });
});
