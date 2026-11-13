import {
  buildWeeklyRecap,
  isWeeklyRecapDay,
  previousWeekDates,
  weeklyRecapMessage,
  type RecapEvent,
} from '../weeklyRecap';

function done(date: string, eventType = 'completed', supersededByEventId: string | null = null): RecapEvent {
  return { occurrenceDate: date, eventType, supersededByEventId };
}

// 2026-11-16 is a Monday; the previous week is 2026-11-09 … 2026-11-15.
const WEEK = previousWeekDates('2026-11-16');

describe('isWeeklyRecapDay', () => {
  it('is true on Mondays only', () => {
    expect(isWeeklyRecapDay('2026-11-16')).toBe(true);
    expect(isWeeklyRecapDay('2026-11-17')).toBe(false);
    expect(isWeeklyRecapDay('2026-11-15')).toBe(false);
  });
});

describe('previousWeekDates', () => {
  it('returns last week Monday to Sunday', () => {
    expect(WEEK).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]);
  });

  it('gives the same week for any day of the current week', () => {
    expect(previousWeekDates('2026-11-22')).toEqual(WEEK);
  });

  it('crosses a year boundary', () => {
    expect(previousWeekDates('2027-01-04')[0]).toBe('2026-12-28');
  });
});

describe('buildWeeklyRecap', () => {
  const routines = [
    { id: 'a', name: 'Lesen' },
    { id: 'b', name: 'Laufen' },
  ];

  it('counts completions, active days, and the steadiest routine', () => {
    const recap = buildWeeklyRecap(
      routines,
      {
        a: [done('2026-11-09'), done('2026-11-10'), done('2026-11-11', 'exceeded')],
        b: [done('2026-11-10'), done('2026-11-14')],
      },
      WEEK,
    );
    expect(recap).toEqual({
      completions: 5,
      activeDays: 4,
      steadiest: { name: 'Lesen', count: 3 },
    });
  });

  it('ignores undone, missed, skipped, and out-of-week events', () => {
    const recap = buildWeeklyRecap(
      routines,
      {
        a: [
          done('2026-11-09', 'completed', 'undo-1'),
          done('2026-11-10', 'missed'),
          done('2026-11-11', 'skipped'),
          done('2026-11-16'),
          done('2026-11-08'),
          done('2026-11-12'),
        ],
      },
      WEEK,
    );
    expect(recap).toEqual({ completions: 1, activeDays: 1, steadiest: { name: 'Lesen', count: 1 } });
  });

  it('returns null for a week without any completion', () => {
    expect(buildWeeklyRecap(routines, { a: [done('2026-11-10', 'missed')] }, WEEK)).toBeNull();
    expect(buildWeeklyRecap([], {}, WEEK)).toBeNull();
  });

  it('breaks a tie by list order', () => {
    const recap = buildWeeklyRecap(
      routines,
      { a: [done('2026-11-09')], b: [done('2026-11-10')] },
      WEEK,
    );
    expect(recap?.steadiest?.name).toBe('Lesen');
  });
});

describe('weeklyRecapMessage', () => {
  it('scales warmly with active days and never grades', () => {
    const messages = [1, 3, 5, 7].map((activeDays) =>
      weeklyRecapMessage({ completions: activeDays, activeDays, steadiest: null }),
    );
    expect(new Set(messages).size).toBe(4);
    for (const message of messages) {
      expect(message.toLowerCase()).not.toMatch(/nur|verpasst|schlecht|leider/);
    }
  });
});
