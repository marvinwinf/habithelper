// The long-horizon view of a single routine: how many times it has been done
// in total, and how that total accumulated over the months.
//
// Every existing progress surface is scoped to the current week (Progress
// screen: completion rate this week, completions this period, the week chart)
// or to a single month (the routine calendar). Nothing showed accumulation.
// "Die 1%-Methode" is explicit that small gains compound and that the
// *plateau of latent potential* makes progress feel invisible long before it
// shows — so the app was loudest exactly where motivation is easiest, and
// silent through the stretch where people give up. This derives the missing
// view from the event log; nothing new is stored.

import type { RoutineEvent } from '../../data/repositories/routineEventRepository';

/** One month of the cumulative curve. */
export interface CumulativePoint {
  /** `YYYY-MM`. */
  month: string;
  /** Completions recorded in this month alone. */
  completions: number;
  /** Completions from the first month up to and including this one. */
  cumulative: number;
}

export interface CompoundingOverview {
  /** All-time completions (`completed` + `exceeded`, superseded events excluded). */
  totalCompletions: number;
  /** `YYYY-MM-DD` of the earliest completion, or undefined when there are none. */
  firstCompletionDate?: string;
  /** Contiguous monthly series from the first completion through `throughMonth`. */
  series: CumulativePoint[];
}

const COMPLETION_TYPES = new Set(['completed', 'exceeded']);

function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** Advances a `YYYY-MM` string by one month. */
function nextMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return monthNumber === 12
    ? `${year + 1}-01`
    : `${year}-${String(monthNumber + 1).padStart(2, '0')}`;
}

/**
 * Builds the cumulative completion curve for one routine.
 *
 * Counts the same events the level and total-completions cache counts
 * (docs/DATA_MODEL.md's `routine_state_cache.total_completions`): `completed`
 * and `exceeded`, ignoring any event that has been superseded — so an undone
 * completion does not inflate the curve, and a retroactive completion lands
 * on the month it was *for*, not the month it was entered.
 *
 * Months with no completions are still emitted, with a flat cumulative value.
 * A gap is part of the story this chart tells; collapsing it would compress
 * an inactive stretch into the same width as an active one and make an
 * abandoned routine look continuous.
 */
export function buildCompoundingOverview(
  events: readonly RoutineEvent[],
  throughMonth: string,
): CompoundingOverview {
  const completions = events
    .filter(
      (event) => COMPLETION_TYPES.has(event.eventType) && event.supersededByEventId === null,
    )
    .map((event) => event.occurrenceDate)
    .sort();

  if (completions.length === 0) {
    return { totalCompletions: 0, series: [] };
  }

  const perMonth = new Map<string, number>();
  for (const date of completions) {
    const month = monthOf(date);
    perMonth.set(month, (perMonth.get(month) ?? 0) + 1);
  }

  const firstCompletionDate = completions[0];
  const series: CumulativePoint[] = [];
  let cumulative = 0;
  // Guard against a `throughMonth` earlier than the first completion (a
  // backdated event, or a device clock moved backwards): the series always
  // runs at least to the last month that actually holds a completion.
  const lastMonth = [...perMonth.keys()].sort().at(-1) ?? monthOf(firstCompletionDate);
  const endMonth = throughMonth > lastMonth ? throughMonth : lastMonth;

  for (let month = monthOf(firstCompletionDate); month <= endMonth; month = nextMonth(month)) {
    const monthly = perMonth.get(month) ?? 0;
    cumulative += monthly;
    series.push({ month, completions: monthly, cumulative });
  }

  return { totalCompletions: completions.length, firstCompletionDate, series };
}
