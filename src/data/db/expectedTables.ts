// Single source of truth for "which tables does the schema define" across
// schema.test.ts (validates schema.ts directly) and migrate.test.ts
// (validates the committed migration file) so the two can't silently drift.
export const EXPECTED_TABLE_NAMES = [
  'app_streak_cache',
  'category',
  'profile',
  'routine',
  'routine_event',
  'routine_state_cache',
  'schema_migrations',
  'task',
].sort();
