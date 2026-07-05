import { compareByDateThenTime } from '../ordering';

describe('compareByDateThenTime', () => {
  it('orders earlier dates before later dates', () => {
    expect(compareByDateThenTime({ date: '2026-07-01', timeOfDay: null }, { date: '2026-07-02', timeOfDay: null })).toBeLessThan(0);
  });

  it('sorts an undated item after any dated item', () => {
    expect(compareByDateThenTime({ date: null, timeOfDay: null }, { date: '2026-07-01', timeOfDay: null })).toBeGreaterThan(0);
    expect(compareByDateThenTime({ date: '2026-07-01', timeOfDay: null }, { date: null, timeOfDay: null })).toBeLessThan(0);
  });

  it('breaks ties on the same date by time, undated time last', () => {
    const early = { date: '2026-07-01', timeOfDay: '08:00' };
    const late = { date: '2026-07-01', timeOfDay: '18:00' };
    const noTime = { date: '2026-07-01', timeOfDay: null };
    expect(compareByDateThenTime(early, late)).toBeLessThan(0);
    expect(compareByDateThenTime(noTime, early)).toBeGreaterThan(0);
    expect(compareByDateThenTime(early, noTime)).toBeLessThan(0);
  });

  it('treats two fully-equal items as equal', () => {
    const a = { date: '2026-07-01', timeOfDay: '08:00' };
    const b = { date: '2026-07-01', timeOfDay: '08:00' };
    expect(compareByDateThenTime(a, b)).toBe(0);
  });
});
