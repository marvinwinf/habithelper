import {
  dayCompleteLine,
  daypartForHour,
  daypartLine,
  daypartLines,
  type Daypart,
} from '../daypart';

describe('dayCompleteLine', () => {
  it('has its own closing line per daypart, distinct from the rotating lines', () => {
    const dayparts: Daypart[] = ['morning', 'day', 'evening', 'night'];
    const lines = dayparts.map(dayCompleteLine);
    expect(new Set(lines).size).toBe(4);
    for (const daypart of dayparts) {
      expect(daypartLines(daypart)).not.toContain(dayCompleteLine(daypart));
    }
  });
});

describe('daypartForHour', () => {
  it.each<[number, Daypart]>([
    [0, 'night'],
    [4, 'night'],
    [5, 'morning'],
    [10, 'morning'],
    [11, 'day'],
    [16, 'day'],
    [17, 'evening'],
    [21, 'evening'],
    [22, 'night'],
    [23, 'night'],
  ])('maps %i:00 to %s', (hour, expected) => {
    expect(daypartForHour(hour)).toBe(expected);
  });
});

describe('daypartLine', () => {
  const dayparts: Daypart[] = ['morning', 'day', 'evening', 'night'];

  it('is deterministic for a given daypart and date', () => {
    for (const daypart of dayparts) {
      expect(daypartLine(daypart, '2026-11-13')).toBe(daypartLine(daypart, '2026-11-13'));
    }
  });

  it('always returns one of the daypart’s own lines', () => {
    for (const daypart of dayparts) {
      expect(daypartLines(daypart)).toContain(daypartLine(daypart, '2026-03-01'));
    }
  });

  it('rotates across consecutive days', () => {
    const seen = new Set(
      ['2026-11-13', '2026-11-14', '2026-11-15'].map((date) => daypartLine('morning', date)),
    );
    expect(seen.size).toBeGreaterThan(1);
  });

  it('never mentions undone work or streak risk', () => {
    for (const daypart of dayparts) {
      for (const line of daypartLines(daypart)) {
        expect(line.toLowerCase()).not.toMatch(/verpass|noch offen|streak|verlier/);
      }
    }
  });
});
