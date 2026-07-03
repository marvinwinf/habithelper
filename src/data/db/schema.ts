import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

/**
 * Throwaway single-table schema for T006: validates the Drizzle + expo-sqlite
 * migration toolchain end-to-end before the real schema (docs/DATA_MODEL.md)
 * is built on top of it. Replaced entirely in T007.
 */
export const toolchainCheck = sqliteTable('toolchain_check', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  createdAt: integer('created_at').notNull(),
});
