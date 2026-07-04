import type { Config } from 'drizzle-kit';

export default {
  schema: './src/data/db/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  // Makes drizzle-kit also emit migrations/migrations.js (journal + inlined
  // .sql), which migrate.ts imports so migrations can be Metro-bundled and
  // run on-device via drizzle-orm/expo-sqlite/migrator. Without this, only
  // the raw .sql files are generated. https://orm.drizzle.team/quick-sqlite/expo
  driver: 'expo',
} satisfies Config;
