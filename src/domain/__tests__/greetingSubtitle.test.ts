import { greetingSubtitle } from '../greetingSubtitle';

describe('greetingSubtitle', () => {
  it('is deterministic for the same date and hour', () => {
    expect(greetingSubtitle('2026-07-15', 9)).toBe(greetingSubtitle('2026-07-15', 9));
  });

  it('is stable within a time-of-day bucket regardless of the exact hour', () => {
    expect(greetingSubtitle('2026-07-15', 0)).toBe(greetingSubtitle('2026-07-15', 11));
    expect(greetingSubtitle('2026-07-15', 12)).toBe(greetingSubtitle('2026-07-15', 17));
    expect(greetingSubtitle('2026-07-15', 18)).toBe(greetingSubtitle('2026-07-15', 23));
  });

  it('rotates by day of year within a pool', () => {
    // Five-line pools: five consecutive days give five distinct lines, and
    // the rotation wraps back around on the sixth.
    const days = ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17'];
    const lines = days.map((day) => greetingSubtitle(day, 9));
    expect(new Set(lines).size).toBe(days.length);
    expect(greetingSubtitle('2026-07-18', 9)).toBe(lines[0]);
  });

  it('uses the greeting time-of-day buckets (morning/afternoon/evening pools differ)', () => {
    // On a day whose rotation index picks a bucket-specific line, the three
    // buckets read differently. Index 1 of each pool is distinct by design.
    const day = '2026-01-02'; // day-of-year 2 -> pool index 1
    const morning = greetingSubtitle(day, 9);
    const afternoon = greetingSubtitle(day, 14);
    const evening = greetingSubtitle(day, 20);
    expect(new Set([morning, afternoon, evening]).size).toBe(3);
  });

  it('always returns a short, non-empty line', () => {
    for (let hour = 0; hour < 24; hour += 3) {
      for (const day of ['2026-01-01', '2026-06-15', '2026-12-31']) {
        const line = greetingSubtitle(day, hour);
        expect(line.length).toBeGreaterThan(0);
        expect(line.length).toBeLessThanOrEqual(60);
      }
    }
  });
});
