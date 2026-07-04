import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

export const expoDb = openDatabaseSync('habithelper.db');

// foreign_keys defaults to off per connection; the schema's FKs
// (docs/DATA_MODEL.md) rely on it to catch bad references. WAL keeps reads
// from blocking behind writes and reduces fsync cost on mobile flash.
expoDb.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export const db = drizzle(expoDb, { schema });
