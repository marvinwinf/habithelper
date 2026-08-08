import type { RoutineEvent } from '../../../data/repositories/routineEventRepository';
import { buildCompoundingOverview } from '../compounding';

let counter = 0;

function event(overrides: Partial<RoutineEvent> & { occurrenceDate: string }): RoutineEvent {
  counter += 1;
  return {
    id: `event-${counter}`,
    routineId: 'routine-1',
    eventType: 'completed',
    recordedAt: `${overrides.occurrenceDate}T09:00:00.000Z`,
    movedToDate: null,
    skipReason: null,
    supersededByEventId: null,
    ...overrides,
  };
}

describe('buildCompoundingOverview', () => {
  it('reports nothing for a routine with no completions', () => {
    const overview = buildCompoundingOverview(
      [event({ occurrenceDate: '2026-01-02', eventType: 'missed' })],
      '2026-03',
    );

    expect(overview).toEqual({ totalCompletions: 0, series: [] });
  });

  it('counts completed and exceeded alike', () => {
    const overview = buildCompoundingOverview(
      [
        event({ occurrenceDate: '2026-01-02' }),
        event({ occurrenceDate: '2026-01-03', eventType: 'exceeded' }),
      ],
      '2026-01',
    );

    expect(overview.totalCompletions).toBe(2);
  });

  it('ignores skips, misses, and joker events', () => {
    const overview = buildCompoundingOverview(
      [
        event({ occurrenceDate: '2026-01-02' }),
        event({ occurrenceDate: '2026-01-03', eventType: 'skipped' }),
        event({ occurrenceDate: '2026-01-04', eventType: 'missed' }),
        event({ occurrenceDate: '2026-01-05', eventType: 'joker_protected' }),
        event({ occurrenceDate: '2026-01-06', eventType: 'joker_earned' }),
      ],
      '2026-01',
    );

    expect(overview.totalCompletions).toBe(1);
  });

  it('ignores a completion that was undone', () => {
    // An undone completion is superseded, exactly as total_completions treats
    // it (docs/DATA_MODEL.md) — the curve must not drift from the cache.
    const overview = buildCompoundingOverview(
      [
        event({ occurrenceDate: '2026-01-02', supersededByEventId: 'undo-1' }),
        event({ occurrenceDate: '2026-01-03' }),
      ],
      '2026-01',
    );

    expect(overview.totalCompletions).toBe(1);
  });

  it('accumulates month over month', () => {
    const overview = buildCompoundingOverview(
      [
        event({ occurrenceDate: '2026-01-02' }),
        event({ occurrenceDate: '2026-01-20' }),
        event({ occurrenceDate: '2026-02-05' }),
        event({ occurrenceDate: '2026-03-01' }),
        event({ occurrenceDate: '2026-03-02' }),
        event({ occurrenceDate: '2026-03-03' }),
      ],
      '2026-03',
    );

    expect(overview.series).toEqual([
      { month: '2026-01', completions: 2, cumulative: 2 },
      { month: '2026-02', completions: 1, cumulative: 3 },
      { month: '2026-03', completions: 3, cumulative: 6 },
    ]);
  });

  it('never decreases', () => {
    const overview = buildCompoundingOverview(
      [event({ occurrenceDate: '2026-01-02' }), event({ occurrenceDate: '2026-04-02' })],
      '2026-05',
    );

    const values = overview.series.map((point) => point.cumulative);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  it('keeps empty months flat rather than dropping them', () => {
    const overview = buildCompoundingOverview(
      [event({ occurrenceDate: '2026-01-02' }), event({ occurrenceDate: '2026-04-02' })],
      '2026-04',
    );

    // A three-month gap must read as a gap; collapsing it would make an
    // abandoned stretch look continuous.
    expect(overview.series.map((point) => point.month)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
    ]);
    expect(overview.series.map((point) => point.cumulative)).toEqual([1, 1, 1, 2]);
  });

  it('extends the series through the requested month even with no recent activity', () => {
    const overview = buildCompoundingOverview([event({ occurrenceDate: '2026-01-02' })], '2026-03');

    expect(overview.series.at(-1)).toEqual({ month: '2026-03', completions: 0, cumulative: 1 });
  });

  it('crosses a year boundary', () => {
    const overview = buildCompoundingOverview(
      [event({ occurrenceDate: '2026-11-02' }), event({ occurrenceDate: '2027-01-02' })],
      '2027-01',
    );

    expect(overview.series.map((point) => point.month)).toEqual(['2026-11', '2026-12', '2027-01']);
  });

  it('reports the earliest completion date', () => {
    const overview = buildCompoundingOverview(
      [event({ occurrenceDate: '2026-03-09' }), event({ occurrenceDate: '2026-01-30' })],
      '2026-03',
    );

    expect(overview.firstCompletionDate).toBe('2026-01-30');
  });

  it('places a retroactive completion in the month it was for', () => {
    // Recorded in March, but for a January occurrence.
    const overview = buildCompoundingOverview(
      [event({ occurrenceDate: '2026-01-15', recordedAt: '2026-03-20T10:00:00.000Z' })],
      '2026-03',
    );

    expect(overview.series[0]).toEqual({ month: '2026-01', completions: 1, cumulative: 1 });
  });

  it('still produces a series when the requested month precedes the last completion', () => {
    // Defensive: a backdated `throughMonth` (device clock moved back) must not
    // produce an empty or truncated series.
    const overview = buildCompoundingOverview(
      [event({ occurrenceDate: '2026-05-02' })],
      '2026-01',
    );

    expect(overview.series).toEqual([{ month: '2026-05', completions: 1, cumulative: 1 }]);
  });
});
