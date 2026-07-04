import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { db } from '../src/data/db/client';
import { runMigrations } from '../src/data/db/migrate';
import { ensureProfile } from '../src/data/repositories/profileRepository';

export default function RootLayout() {
  // The dedicated startup-failure recovery screen (docs/ARCHITECTURE.md) is
  // not built yet; a failure here is only logged.
  useEffect(() => {
    async function initialize() {
      await runMigrations();
      await ensureProfile(db);
    }
    initialize().catch((error) => {
      console.error('App startup initialization failed', error);
    });
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
