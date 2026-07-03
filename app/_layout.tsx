import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { runMigrations } from '../src/data/db/migrate';

export default function RootLayout() {
  // Throwaway T006 toolchain validation: proves a drizzle-kit-generated
  // migration runs against a real on-device expo-sqlite database at startup.
  // Replaced by the real migration runner and schema_migrations wiring in T009.
  useEffect(() => {
    runMigrations().catch((error) => {
      console.error('T006 toolchain migration check failed', error);
    });
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
