import { and, eq } from 'drizzle-orm';
import type { DB } from '../db/index.js';
import { badRequest } from './errors.js';

/** Assert a referenced row exists within the caller's tenant (prevents orphan
 *  postings that reference non-existent/foreign IDs). Returns the row. */
export async function assertOwned(db: DB, table: any, tenantId: string, id: string, label: string) {
  const [row] = await db.select().from(table).where(and(eq(table.tenantId, tenantId), eq(table.id, id)));
  if (!row) throw badRequest(`${label} bulunamadı`);
  return row;
}
