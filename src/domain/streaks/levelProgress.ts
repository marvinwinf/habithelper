import { LEVEL_SEGMENT_SIZE } from './replay';

// Level-segment progress display values for the routine detail hero (T069):
// levels are 66-completion segments (docs/ROUTINE_RULES.md), so progress
// within the current segment is derived from total completions alone.

/** Completions accumulated inside the current 66-completion segment (0–65). */
export function completionsIntoCurrentLevel(totalCompletions: number): number {
  return totalCompletions % LEVEL_SEGMENT_SIZE;
}

/** Completions still needed to finish the current segment (66 down to 1). */
export function remainingCompletionsToNextLevel(totalCompletions: number): number {
  return LEVEL_SEGMENT_SIZE - completionsIntoCurrentLevel(totalCompletions);
}
