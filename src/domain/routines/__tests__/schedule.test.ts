import {
  generateSuggestedWeeklyTargetWeekdays,
  isOccurrenceDue,
  scheduleFromRoutineRow,
  type DailySchedule,
  type WeekdaySchedule,
  type WeeklyTargetSchedule,
} from '../schedule';

// Monday 2026-06-29 through Sunday 2026-07-05.
const MONDAY = '2026-06-29';
const TUESDAY = '2026-06-30';
const WEDNESDAY = '2026-07-01';
const THURSDAY = '2026-07-02';
const FRIDAY = '2026-07-03';
const SATURDAY = '2026-07-04';
const SUNDAY = '2026-07-05';
const ALL_WEEK = [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY];

describe('isOccurrenceDue — daily schedule', () => {
  const daily: DailySchedule = { type: 'daily' };

  it('is due every day of the week', () => {
    for (const date of ALL_WEEK) {
      expect(isOccurrenceDue(daily, date)).toBe(true);
    }
  });
});

describe('isOccurrenceDue — weekdays schedule', () => {
  const mwf: WeekdaySchedule = { type: 'weekdays', weekdays: [1, 3, 5] };

  it('is due only on the selected weekdays', () => {
    expect(isOccurrenceDue(mwf, MONDAY)).toBe(true);
    expect(isOccurrenceDue(mwf, WEDNESDAY)).toBe(true);
    expect(isOccurrenceDue(mwf, FRIDAY)).toBe(true);
  });

  it('is not due on unselected weekdays', () => {
    expect(isOccurrenceDue(mwf, TUESDAY)).toBe(false);
    expect(isOccurrenceDue(mwf, THURSDAY)).toBe(false);
    expect(isOccurrenceDue(mwf, SATURDAY)).toBe(false);
    expect(isOccurrenceDue(mwf, SUNDAY)).toBe(false);
  });

  it('a routine with no scheduled weekdays is never due', () => {
    const none: WeekdaySchedule = { type: 'weekdays', weekdays: [] };
    for (const date of ALL_WEEK) {
      expect(isOccurrenceDue(none, date)).toBe(false);
    }
  });
});

describe('isOccurrenceDue — weekly_target schedule', () => {
  const target: WeeklyTargetSchedule = {
    type: 'weekly_target',
    weekdays: [2, 4, 6],
    targetCount: 3,
  };

  it('is due on its current suggested weekdays', () => {
    expect(isOccurrenceDue(target, TUESDAY)).toBe(true);
    expect(isOccurrenceDue(target, THURSDAY)).toBe(true);
    expect(isOccurrenceDue(target, SATURDAY)).toBe(true);
  });

  it('is not due on other days', () => {
    expect(isOccurrenceDue(target, MONDAY)).toBe(false);
    expect(isOccurrenceDue(target, WEDNESDAY)).toBe(false);
    expect(isOccurrenceDue(target, FRIDAY)).toBe(false);
    expect(isOccurrenceDue(target, SUNDAY)).toBe(false);
  });
});

describe('isOccurrenceDue — moved occurrences', () => {
  const daily: DailySchedule = { type: 'daily' };
  const mwf: WeekdaySchedule = { type: 'weekdays', weekdays: [1] };

  it('a moved-away occurrence is not due on its original date', () => {
    const moved = [{ fromDate: MONDAY, toDate: TUESDAY }];
    expect(isOccurrenceDue(mwf, MONDAY, moved)).toBe(false);
  });

  it('a moved occurrence is due on its new date even if not otherwise scheduled', () => {
    const moved = [{ fromDate: MONDAY, toDate: TUESDAY }];
    expect(isOccurrenceDue(mwf, TUESDAY, moved)).toBe(true);
  });

  it('never counts as due on both the original and the new date', () => {
    const moved = [{ fromDate: SUNDAY, toDate: MONDAY }];
    // Monday is already a normally-scheduled day here; the move must not
    // cause it to be double-counted, and Sunday must still be excluded.
    expect(isOccurrenceDue(daily, SUNDAY, moved)).toBe(false);
    expect(isOccurrenceDue(daily, MONDAY, moved)).toBe(true);
  });
});

describe('generateSuggestedWeeklyTargetWeekdays', () => {
  it('is deterministic for the same input', () => {
    expect(generateSuggestedWeeklyTargetWeekdays(3)).toEqual(
      generateSuggestedWeeklyTargetWeekdays(3),
    );
  });

  it('returns exactly targetCount distinct weekdays for counts up to 7', () => {
    for (let count = 1; count <= 7; count++) {
      const weekdays = generateSuggestedWeeklyTargetWeekdays(count);
      expect(weekdays.length).toBe(count);
      expect(new Set(weekdays).size).toBe(count);
      for (const day of weekdays) {
        expect(day).toBeGreaterThanOrEqual(1);
        expect(day).toBeLessThanOrEqual(7);
      }
    }
  });

  it('returns sorted weekdays', () => {
    const weekdays = generateSuggestedWeeklyTargetWeekdays(4);
    const sorted = [...weekdays].sort((a, b) => a - b);
    expect(weekdays).toEqual(sorted);
  });

  it('rejects counts outside 1-7', () => {
    expect(() => generateSuggestedWeeklyTargetWeekdays(0)).toThrow(RangeError);
    expect(() => generateSuggestedWeeklyTargetWeekdays(8)).toThrow(RangeError);
    expect(() => generateSuggestedWeeklyTargetWeekdays(1.5)).toThrow(RangeError);
  });
});

describe('scheduleFromRoutineRow', () => {
  it('maps a daily row', () => {
    expect(
      scheduleFromRoutineRow({ scheduleType: 'daily', scheduledWeekdays: null, weeklyTargetCount: null }),
    ).toEqual({ type: 'daily' });
  });

  it('maps a weekdays row', () => {
    expect(
      scheduleFromRoutineRow({
        scheduleType: 'weekdays',
        scheduledWeekdays: [1, 3, 5],
        weeklyTargetCount: null,
      }),
    ).toEqual({ type: 'weekdays', weekdays: [1, 3, 5] });
  });

  it('maps a weekly_target row', () => {
    expect(
      scheduleFromRoutineRow({
        scheduleType: 'weekly_target',
        scheduledWeekdays: [2, 4],
        weeklyTargetCount: 2,
      }),
    ).toEqual({ type: 'weekly_target', weekdays: [2, 4], targetCount: 2 });
  });

  it('defaults null weekdays/target count to empty/zero', () => {
    expect(
      scheduleFromRoutineRow({
        scheduleType: 'weekly_target',
        scheduledWeekdays: null,
        weeklyTargetCount: null,
      }),
    ).toEqual({ type: 'weekly_target', weekdays: [], targetCount: 0 });
  });
});
