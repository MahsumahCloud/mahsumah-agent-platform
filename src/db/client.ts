import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";
import { runMigrations } from "./migrations";

export type Db = BetterSQLite3Database<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var __agentDb: { db: Db; sqlite: Database.Database } | undefined;
}

function open(): { db: Db; sqlite: Database.Database } {
  const dbPath = path.resolve(process.env.DATABASE_PATH ?? "./data/agent.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  runMigrations(sqlite);
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

/** Singleton across Next.js hot reloads. */
export function getDb(): Db {
  if (!globalThis.__agentDb) globalThis.__agentDb = open();
  return globalThis.__agentDb.db;
}

export function getSqlite(): Database.Database {
  if (!globalThis.__agentDb) globalThis.__agentDb = open();
  return globalThis.__agentDb.sqlite;
}

export { schema };
