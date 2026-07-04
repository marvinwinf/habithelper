import { getCalendarDayState, listMonthDates } from '../calendar';
import type { OccurrenceEvent } from '../completion';
import type { DailySchedule, WeekdaySchedule } from '../schedule';

const daily: DailySchedule = { type: 'daily' };
const START = '2026-06-01';
const TODAY = '2026-06-20';

function event(partial: Partial<OccurrenceEvent> & Pick<OccurrenceEvent, 'occurrenceDate' | 'eventType'>): OccurrenceEvent {
  return partial;
}

describe('getCalendarDayState', () => {
  const events: OccurrenceEvent[] = [
    event({ occurrenceDate: '2026-06-10', eventType: 'completed' }),
    event({ occurrenceDate: '2026-06-11', eventType: 'exceeded' }),
    event({ occurrenceDate: '2026-06-12', eventType: 'skipped' }),
    event({ occurrenceDate: '2026-06-13', eventType: 'moved', movedToDate: '2026-06-14' }),
    event({ occurrenceDate: '2026-06-16', eventType: 'paused' }),
    event({ occurrenceDate: '2026-06-18', eventType: 'reactivated' }),
  ];

  function stateOf(date: string) {
    return getCalendarDayState(daily, events, START, date, TODAY);
  }

  it('marks days before the routine existed as not due, never missed', () => {
    expect(stateOf('2026-05-30')).toBe('not_due');
  });

  it('maps explicit completed/exceeded/skipped events', () => {
    expect(stateOf('2026-06-10')).toBe('completed');
    expect(stateOf('2026-06-11')).toBe('exceeded');
    expect(stateOf('2026-06-12')).toBe('skipped');
  });

  it("marks a moved occurrence's original date as moved, and its uncompleted target date as missed", () => {
    expect(stateOf('2026-06-13')).toBe('moved');
    expect(stateOf('2026-06-14')).toBe('missed');
  });

  it('marks an elapsed due day with no events as missed', () => {
    expect(stateOf('2026-06-15')).toBe('missed');
  });

  it('marks days inside a pause period as paused, resuming missed-detection after reactivation', () => {
    expect(stateOf('2026-06-16')).toBe('paused');
    expect(stateOf('2026-06-17')).toBe('paused');
    expect(stateOf('2026-06-19')).toBe('missed');
  });

  it('keeps an explicit completion visible even inside a pause period', () => {
    const withPausedCompletion = [
      ...events,
      event({ occurrenceDate: '2026-06-17', eventType: 'completed' }),
    ];
    expect(getCalendarDayState(daily, withPausedCompletion, START, '2026-06-17', TODAY)).toBe(
      'completed',
    );
  });

  it('marks today and future due days as pending', () => {
    expect(stateOf(TODAY)).toBe('pending');
    expect(stateOf('2026-06-25')).toBe('pending');
  });

  it('marks unscheduled days as not due for a weekdays schedule', () => {
    const mondayOnly: WeekdaySchedule = { type: 'weekdays', weekdays: [1] };
    // 2026-06-16 is a Tuesday.
    expect(getCalendarDayState(mondayOnly, [], START, '2026-06-16', TODAY)).toBe('not_due');
  });
});

describe('listMonthDates', () => {
  it('lists every date of a 31-day month in order', () => {
    const dates = listMonthDates(2026, 7);
    expect(dates).toHaveLength(31);
    expect(dates[0]).toBe('2026-07-01');
    expect(dates[30]).toBe('2026-07-31');
  });

  it('handles February of a non-leap year', () => {
    expect(listMonthDates(2026, 2)).toHaveLength(28);
  });

  it('handles February of a leap year', () => {
    expect(listMonthDates(2028, 2)).toHaveLength(29);
  });
});
