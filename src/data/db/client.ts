import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

/**
 * Throwaway T006 toolchain-validation client. Uses its own database file
 * (distinct from the app's real database name) so it cannot collide with
 * the real schema/migrations introduced in T007-T009. Replaced entirely then.
 */
export const expoDb = openDatabaseSync('toolchain-check.db');

export const db = drizzle(expoDb);
