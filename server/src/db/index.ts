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

/** Full idempotent schema DDL: CREATE TABLE/INDEX IF NOT EXISTS + self-healing
 *  ADD COLUMN IF NOT EXISTS for columns added after a table's first creation. */
function fullDdl(): string {
  const parts: string[] = allTables().flatMap(ddlFor);
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
      parts.push(stmt + ';');
    }
  }
  // One-time idempotent backfill: rows created before komisyon_kdv_tutar existed
  // have 0; reconstruct from the standard %20 commission VAT (only touches legacy
  // rows — new sales always store it, so this matches nothing after first run).
  parts.push(`UPDATE "fisler" SET "komisyon_kdv_tutar" = round(("komisyon_tutar" * 0.2)::numeric, 2) WHERE "tip" = 'SATIS' AND "komisyon_kdv_tutar" = 0 AND "komisyon_tutar" > 0;`);
  return parts.join('\n');
}

async function build(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  const ddl = fullDdl();
  if (url) {
    const postgres = (await import('postgres')).default;
    const { drizzle } = await import('drizzle-orm/postgres-js');
    // Supabase/Neon poolers: disable prepared statements for transaction pooling.
    // SSL is always on; set DB_SSL=verify for full cert verification (needs provider CA).
    const ssl = process.env.DB_SSL === 'verify' ? ('verify-full' as const) : ('require' as const);
    const client = postgres(url, { prepare: false, max: 3, ssl });
    // One round-trip for the whole idempotent schema (simple protocol, multi-statement).
    await client.unsafe(ddl);
    return drizzle(client, { schema });
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const client = new PGlite(); // in-memory
  await client.exec(ddl); // multi-statement in one call
  return drizzle(client, { schema });
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
