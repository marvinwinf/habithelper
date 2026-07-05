import type { RoutineEventType } from '../../data/db/schema';

// The minimal shape of a routine_event row this module reads. Whether an
// occurrence was missed, protected by a joker, or earned one is a decision
// already made elsewhere (reconciliation for missed/joker_protected/
// joker_consumed, the completion service for joker_earned) — replay only
// folds those recorded outcomes into current state, per
// docs/DATA_MODEL.md's Streak and Joker Source Data section.
export interface StreakReplayEvent {
  readonly occurrenceDate: string;
  readonly eventType: RoutineEventType;
  readonly supersededByEventId?: string | null;
}

// Mirrors routine_state_cache's derived columns (docs/DATA_MODEL.md), minus
// reconciledThroughDate/recalculatedAt, which are persistence bookkeeping
// rather than output of the replay itself.
export interface RoutineStreakState {
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly totalCompletions: number;
  readonly levelRank: number;
  readonly jokerInventory: number;
  readonly jokerProgress: number;
  readonly consecutiveMissedAfter66: number;
}

const MAX_JOKER_INVENTORY = 2;
// Shared with src/domain/routines/reconcile.ts: the pre-66/post-66 joker
// regime boundary (docs/ROUTINE_RULES.md) and the level segment size
// (docs/ROUTINE_RULES.md's Levels section) are documented as the same 66.
export const LEVEL_SEGMENT_SIZE = 66;
const POST_66_TOLERATED_MISSES = 3;
// Shared with src/services/routineService.ts: "one joker is earned after
// every 5 successful completions" (docs/ROUTINE_RULES.md) — the completion
// action checks jokerProgress against this threshold to decide when to
// write a joker_earned event; replay itself never grants a joker from
// jokerProgress alone (see applyEvent's joker_earned case below).
export const JOKER_EARN_THRESHOLD = 5;

const INITIAL_STATE: RoutineStreakState = {
  currentStreak: 0,
  bestStreak: 0,
  totalCompletions: 0,
  levelRank: 0,
  jokerInventory: 0,
  jokerProgress: 0,
  consecutiveMissedAfter66: 0,
};

/**
 * Replays a routine's event log into its current streak/joker/level state,
 * per docs/ROUTINE_RULES.md. Events are folded in `occurrenceDate` order
 * (ties keep their given relative order); superseded events are excluded,
 * since a later retroactive edit replaced their outcome (docs/DATA_MODEL.md).
 * Assumes the log is reconciled up to the query date — see
 * docs/ARCHITECTURE.md's Missed-Occurrence Reconciliation.
 */
export function replayRoutineStreak(events: readonly StreakReplayEvent[]): RoutineStreakState {
  return events
    .filter((event) => !event.supersededByEventId)
    .slice()
    .sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate))
    .reduce(applyEvent, INITIAL_STATE);
}

function applyEvent(state: RoutineStreakState, event: StreakReplayEvent): RoutineStreakState {
  switch (event.eventType) {
    case 'completed':
    case 'exceeded':
      return applyCompletion(state);
    case 'missed':
      return applyMissed(state);
    case 'joker_earned':
      return {
        ...state,
        jokerInventory: Math.min(state.jokerInventory + 1, MAX_JOKER_INVENTORY),
        jokerProgress: 0,
      };
    case 'joker_consumed':
      return { ...state, jokerInventory: Math.max(state.jokerInventory - 1, 0) };
    // A joker_restored event is always paired with superseding the
    // joker_consumed event it restores (docs/DATA_MODEL.md). Since superseded
    // events are excluded above, that consumption's -1 already never applies
    // here — crediting +1 on top would double-count. joker_restored needs no
    // numeric effect of its own; it exists as the audit-trail record of why
    // the consumption no longer counts.
    // Conscious skips and joker-protected occurrences count as neither a
    // completion nor a miss (docs/ROUTINE_RULES.md); moved/paused/reactivated
    // affect scheduling (src/domain/routines), not streak/joker/level state.
    case 'joker_restored':
    case 'skipped':
    case 'joker_protected':
    case 'moved':
    case 'paused':
    case 'reactivated':
      return state;
  }
}

function applyCompletion(state: RoutineStreakState): RoutineStreakState {
  const totalCompletions = state.totalCompletions + 1;
  const currentStreak = state.currentStreak + 1;

  return {
    ...state,
    totalCompletions,
    currentStreak,
    bestStreak: Math.max(state.bestStreak, currentStreak),
    levelRank: Math.floor(totalCompletions / LEVEL_SEGMENT_SIZE),
    // Joker-earning progress only accrues before a streak reaches 66 — past
    // that point "normal jokers are no longer used for that routine".
    jokerProgress: currentStreak < LEVEL_SEGMENT_SIZE ? state.jokerProgress + 1 : state.jokerProgress,
    consecutiveMissedAfter66: 0,
  };
}

function applyMissed(state: RoutineStreakState): RoutineStreakState {
  const isPost66 = state.currentStreak >= LEVEL_SEGMENT_SIZE;

  if (!isPost66) {
    // Conscious skips and pauses do not reset joker-earning progress
    // (docs/ROUTINE_RULES.md) — an actual, unprotected miss does.
    return { ...state, currentStreak: 0, jokerProgress: 0 };
  }

  const consecutiveMissedAfter66 = state.consecutiveMissedAfter66 + 1;
  if (consecutiveMissedAfter66 > POST_66_TOLERATED_MISSES) {
    // The streak collapses back into the pre-66 regime, so joker-earning
    // progress (frozen at whatever it was when the streak passed 66) starts
    // over too — otherwise it would stay stuck above the 0-4 range
    // docs/DATA_MODEL.md documents for routine_state_cache.joker_progress.
    return { ...state, currentStreak: 0, jokerProgress: 0, consecutiveMissedAfter66: 0 };
  }
  return { ...state, consecutiveMissedAfter66 };
}
