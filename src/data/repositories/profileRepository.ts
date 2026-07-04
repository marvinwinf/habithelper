import { randomUUID } from 'expo-crypto';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { profile } from '../db/schema';

// Accepts any sync-dialect SQLite drizzle database (both the real
// expo-sqlite-backed client and a better-sqlite3-backed test database
// satisfy this), so tests can run against a real SQLite engine per
// docs/TEST_STRATEGY.md without needing expo-sqlite's native module, which
// cannot run under Jest.
type ProfileDb = BaseSQLiteDatabase<'sync', unknown, { profile: typeof profile }>;

export type Profile = typeof profile.$inferSelect;

const DEFAULT_DISPLAY_NAME = 'Nutzer';

// TODO(T023): add an updateDisplayName(db, id, name) path here when the
// Settings screen makes profile.display_name editable.

/**
 * Creates the single local profile row (docs/USER_MODEL.md) if none exists
 * yet; otherwise returns the existing one. Safe to call on every app
 * startup — the MVP has exactly one profile, so any existing row means
 * there is nothing to do.
 */
export async function ensureProfile(db: ProfileDb): Promise<Profile> {
  const [existing] = await db.select().from(profile).limit(1);
  if (existing) {
    return existing;
  }

  const created: Profile = {
    id: randomUUID(),
    displayName: DEFAULT_DISPLAY_NAME,
    createdAt: new Date().toISOString(),
  };
  await db.insert(profile).values(created);
  return created;
}
