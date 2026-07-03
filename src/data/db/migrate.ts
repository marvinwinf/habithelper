import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../../../migrations/migrations';
import { db } from './client';

export async function runMigrations(): Promise<void> {
  await migrate(db, migrations);
}
