import { buildRoutineWeekRows, currentWeekDates } from '../weekOverview';
import type { OccurrenceEvent } from '../completion';

describe('currentWeekDates', () => {
  it('returns the Monday-to-Sunday dates for a mid-week date', () => {
    // 2026-07-11 is a Saturday.
    expect(currentWeekDates('2026-07-11')).toEqual([
      '2026-07-06',
      '2026-07-07',
      '2026-07-08',
      '2026-07-09',
      '2026-07-10',
      '2026-07-11',
      '2026-07-12',
    ]);
  });

  it('returns the same week when today is a Monday', () => {
    expect(currentWeekDates('2026-07-06')).toEqual([
      '2026-07-06',
      '2026-07-07',
      '2026-07-08',
      '2026-07-09',
      '2026-07-10',
      '2026-07-11',
      '2026-07-12',
    ]);
  });

  it('returns the same week when today is a Sunday', () => {
    expect(currentWeekDates('2026-07-12')).toEqual([
      '2026-07-06',
      '2026-07-07',
      '2026-07-08',
      '2026-07-09',
      '2026-07-10',
      '2026-07-11',
      '2026-07-12',
    ]);
  });
});

describe('buildRoutineWeekRows', () => {
  const week = currentWeekDates('2026-07-11');
  const today = '2026-07-11'; // Saturday, index 5 of the week

  const dailyRoutine = {
    id: 'r1',
    name: 'Laufen',
    scheduleType: 'daily' as const,
    scheduledWeekdays: null,
    weeklyTargetCount: null,
  };

  function event(occurrenceDate: string, eventType: OccurrenceEvent['eventType']): OccurrenceEvent {
    return { occurrenceDate, eventType, movedToDate: null, supersededByEventId: null };
  }

  it('marks a completed day as completed', () => {
    const events = [event('2026-07-06', 'completed')];
    const rows = buildRoutineWeekRows([dailyRoutine], { r1: events }, week, today);

    expect(rows[0].days[0]).toBe('completed');
  });

  it('collapses exceeded into completed', () => {
    const events = [event('2026-07-06', 'exceeded')];
    const rows = buildRoutineWeekRows([dailyRoutine], { r1: events }, week, today);

    expect(rows[0].days[0]).toBe('completed');
  });

  it('marks an elapsed unaccounted-for day as missed', () => {
    const rows = buildRoutineWeekRows([dailyRoutine], { r1: [] }, week, today);

    // Mon–Fri (indices 0–4) are in the past relative to Saturday `today` and
    // have no event, so a daily routine is missed on each.
    expect(rows[0].days.slice(0, 5)).toEqual(['missed', 'missed', 'missed', 'missed', 'missed']);
  });

  it('marks today and future days as not_due (hollow) when unresolved', () => {
    const rows = buildRoutineWeekRows([dailyRoutine], { r1: [] }, week, today);

    expect(rows[0].days[5]).toBe('not_due'); // today, still pending
    expect(rows[0].days[6]).toBe('not_due'); // tomorrow
  });

  it('marks a day the routine is not scheduled on as not_due', () => {
    const mondayOnly = {
      id: 'r2',
      name: 'Wochenstart-Ritual',
      scheduleType: 'weekdays' as const,
      scheduledWeekdays: [1],
      weeklyTargetCount: null,
    };
    const rows = buildRoutineWeekRows([mondayOnly], { r2: [] }, week, today);

    expect(rows[0].days[1]).toBe('not_due'); // Tuesday
  });

  it('builds one row per routine, in the given order', () => {
    const rows = buildRoutineWeekRows(
      [dailyRoutine, { ...dailyRoutine, id: 'r2', name: 'Lesen' }],
      {},
      week,
      today,
    );

    expect(rows.map((r) => r.routineName)).toEqual(['Laufen', 'Lesen']);
  });
});
