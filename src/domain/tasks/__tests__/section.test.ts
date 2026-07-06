import { isDueTodayOrEarlier } from '../section';

describe('isDueTodayOrEarlier', () => {
  const today = '2026-07-05';

  it('is true for a past date', () => {
    expect(isDueTodayOrEarlier('2026-07-04', today)).toBe(true);
  });

  it('is true for exactly today', () => {
    expect(isDueTodayOrEarlier(today, today)).toBe(true);
  });

  it('is false for a future date', () => {
    expect(isDueTodayOrEarlier('2026-07-06', today)).toBe(false);
  });

  it('is false for an undated task', () => {
    expect(isDueTodayOrEarlier(null, today)).toBe(false);
  });
});
