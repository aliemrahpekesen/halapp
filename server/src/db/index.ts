import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';
import { is, sql } from 'drizzle-orm';
import { PgTable as PgTableClass } from 'drizzle-orm/pg-core';
import * as schema from './schema.js';

export type DB = any; // drizzle instance (pglite or postgres-js); unified async API

/** Build CREATE TABLE / CREATE INDEX DDL from the Drizzle pg schema. */
export function ddlFor(table: PgTable): string[] {
  const cfg = getTableConfig(table);
  const cols = cfg.columns.map((c) => {
    let def = `"${c.name}" ${c.getSQLType()}`;
    if (c.primary) def += ' PRIMARY KEY';
    if (c.notNull) def += ' NOT NULL';
    if (c.isUnique) def += ' UNIQUE';
    if (c.hasDefault) {
      const d = c.default as unknown;
      if (c.name === 'created_at') def += ' DEFAULT now()';
      else if (typeof d === 'boolean' || typeof d === 'number') def += ` DEFAULT ${d}`;
      else if (typeof d === 'string') def += ` DEFAULT '${d}'`;
    }
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

export function allTables(): PgTable[] {
  return Object.values(schema).filter((v) => is(v, PgTableClass)) as PgTable[];
}

export function ddlScript(): string {
  return allTables().flatMap(ddlFor).join('\n');
}

let _db: DB | null = null;
let _initP: Promise<DB> | null = null;

async function build(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  let db: DB;
  if (url) {
    const postgres = (await import('postgres')).default;
    const { drizzle } = await import('drizzle-orm/postgres-js');
    // Supabase/Neon poolers: disable prepared statements for transaction pooling.
    // SSL is always on; set DB_SSL=verify to require full certificate verification
    // (needs the provider CA available to Node) for hardened production.
    const ssl = process.env.DB_SSL === 'verify' ? ('verify-full' as const) : ('require' as const);
    const client = postgres(url, { prepare: false, max: 3, ssl });
    db = drizzle(client, { schema });
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    const { drizzle } = await import('drizzle-orm/pglite');
    const client = new PGlite(); // in-memory
    db = drizzle(client, { schema });
  }
  // Apply schema (idempotent) — safe on Postgres and PGlite alike.
  for (const stmt of allTables().flatMap(ddlFor)) {
    await db.execute(sql.raw(stmt));
  }
  // Self-healing: add any columns introduced after a table was first created
  // (CREATE TABLE IF NOT EXISTS won't add them). ADD COLUMN IF NOT EXISTS is idempotent.
  for (const table of allTables()) {
    const cfg = getTableConfig(table);
    for (const c of cfg.columns) {
      if (c.primary) continue;
      let stmt = `ALTER TABLE "${cfg.name}" ADD COLUMN IF NOT EXISTS "${c.name}" ${c.getSQLType()}`;
      if (c.hasDefault) {
        const d = c.default as unknown;
        if (c.name === 'created_at') stmt += ' DEFAULT now()';
        else if (typeof d === 'boolean' || typeof d === 'number') stmt += ` DEFAULT ${d}`;
        else if (typeof d === 'string') stmt += ` DEFAULT '${d}'`;
      }
      await db.execute(sql.raw(stmt));
    }
  }
  return db;
}

/** Initialize the singleton DB (driver + schema). Idempotent. */
export async function initDb(): Promise<DB> {
  if (_db) return _db;
  if (!_initP) _initP = build().then((db) => { _db = db; return db; });
  return _initP;
}

export function getDb(): DB {
  if (!_db) throw new Error('DB not initialized — call initDb() first');
  return _db;
}

/** Run `fn` in a transaction. `fn` receives a tx-scoped db and must be async. */
export async function transaction<T>(fn: (tx: DB) => Promise<T>): Promise<T> {
  return getDb().transaction(async (tx: DB) => fn(tx));
}
