import { scheduleLabel } from '../scheduleLabel';

describe('scheduleLabel', () => {
  it('labels a daily schedule', () => {
    expect(scheduleLabel({ type: 'daily' })).toBe('Jeden Tag');
  });

  it('labels a weekday schedule with sorted German short names', () => {
    expect(scheduleLabel({ type: 'weekdays', weekdays: [5, 1, 3] })).toBe('Mo, Mi, Fr');
    expect(scheduleLabel({ type: 'weekdays', weekdays: [6, 7] })).toBe('Sa, So');
  });

  it('labels a weekly target schedule with its count', () => {
    expect(
      scheduleLabel({ type: 'weekly_target', weekdays: [1, 3, 5], targetCount: 3 }),
    ).toBe('3x pro Woche');
  });
});
