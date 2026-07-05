// Visible level names, per docs/ROUTINE_RULES.md's Levels section — each
// level segment is 66 successful completions, matching
// replay.ts's LEVEL_SEGMENT_SIZE and routine_state_cache.level_rank.
const LEVEL_NAMES = ['Im Aufbau', 'Stabil', 'Gefestigt', 'Meister'] as const;

/**
 * Maps a routine's `level_rank` (docs/DATA_MODEL.md) to its visible level
 * name. Any rank at or beyond the last named level shows as "Meister" —
 * there is no higher tier.
 */
export function levelName(levelRank: number): string {
  const index = Math.min(Math.max(levelRank, 0), LEVEL_NAMES.length - 1);
  return LEVEL_NAMES[index];
}
