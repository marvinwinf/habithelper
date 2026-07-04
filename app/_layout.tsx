import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { runMigrations } from '../src/data/db/migrate';

export default function RootLayout() {
  // T009 will replace this with schema_migrations-tracked reconciliation and
  // a dedicated startup-failure recovery screen (docs/ARCHITECTURE.md).
  useEffect(() => {
    runMigrations().catch((error) => {
      console.error('Database migration failed', error);
    });
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
