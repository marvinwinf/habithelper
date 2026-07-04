import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

export const expoDb = openDatabaseSync('habithelper.db');

// SQLite defaults foreign key enforcement to off per connection; the schema's
// FKs (docs/DATA_MODEL.md) rely on this being on to catch bad references.
expoDb.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(expoDb, { schema });
