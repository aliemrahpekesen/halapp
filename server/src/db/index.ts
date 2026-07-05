import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { getTableConfig, type SQLiteTable } from 'drizzle-orm/sqlite-core';
import { is } from 'drizzle-orm';
import { SQLiteTable as SQLiteTableClass } from 'drizzle-orm/sqlite-core';
import * as schema from './schema.js';
import fs from 'node:fs';
import path from 'node:path';

export type DB = BetterSQLite3Database<typeof schema>;

/** Build CREATE TABLE / CREATE INDEX DDL directly from the Drizzle schema. */
export function ddlFor(table: SQLiteTable): string[] {
  const cfg = getTableConfig(table);
  const cols = cfg.columns.map((c) => {
    let def = `"${c.name}" ${c.getSQLType()}`;
    if (c.primary) def += ' PRIMARY KEY';
    if (c.notNull) def += ' NOT NULL';
    if (c.hasDefault && c.default !== undefined) {
      const d = c.default;
      def += ` DEFAULT ${typeof d === 'string' ? `'${d}'` : d}`;
    }
    if (c.isUnique) def += ' UNIQUE';
    return def;
  });
  const stmts = [`CREATE TABLE IF NOT EXISTS "${cfg.name}" (\n  ${cols.join(',\n  ')}\n);`];
  for (const idx of cfg.indexes) {
    const b = (idx as any).config;
    const idxCols = b.columns.map((x: any) => `"${x.name}"`).join(', ');
    stmts.push(`CREATE ${b.unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS "${b.name}" ON "${cfg.name}" (${idxCols});`);
  }
  return stmts;
}

export function allTables(): SQLiteTable[] {
  return Object.values(schema).filter((v) => is(v, SQLiteTableClass)) as SQLiteTable[];
}

export function migrate(sqlite: Database.Database): void {
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  for (const table of allTables()) {
    for (const stmt of ddlFor(table)) sqlite.exec(stmt);
  }
}

export interface CreatedDb {
  db: DB;
  sqlite: Database.Database;
}

/** Create a DB. Pass ':memory:' for tests. */
export function createDb(file: string): CreatedDb {
  if (file !== ':memory:') {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  const sqlite = new Database(file);
  migrate(sqlite);
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

// Singleton for the running server
let _db: CreatedDb | null = null;
function ensure(): CreatedDb {
  if (!_db) {
    const file = process.env.DB_FILE || path.resolve(process.cwd(), 'data/halboxpro.sqlite');
    _db = createDb(file);
  }
  return _db;
}
export function getDb(): DB {
  return ensure().db;
}
export function getSqlite(): Database.Database {
  return ensure().sqlite;
}
/** Run `fn` in a synchronous SQLite transaction (better-sqlite3). Use drizzle
 *  sync execution (`.run()`/`.get()`/`.all()`) inside `fn`. Rolls back on throw. */
export function transaction<T>(fn: () => T): T {
  return ensure().sqlite.transaction(fn)();
}
