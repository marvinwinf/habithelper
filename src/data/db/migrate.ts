import migrations from '../../../migrations/migrations';
import { expoDb } from './client';
import { runPendingMigrations, type MigrationDriver } from './migrationRunner';

const driver: MigrationDriver = {
  execAsync: (sql) => expoDb.execAsync(sql),
  runAsync: async (sql, params) => {
    await expoDb.runAsync(sql, params);
  },
  getAllAsync: (sql) => expoDb.getAllAsync(sql),
  withTransactionAsync: (task) => expoDb.withTransactionAsync(task),
};

export async function runMigrations(): Promise<void> {
  await runPendingMigrations(driver, migrations);
}
