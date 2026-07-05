import { nanoid } from 'nanoid';
import type { DB } from '../db/index.js';
import { auditLogs } from '../db/schema.js';
import type { RequestCtx } from './types.js';

export async function writeAudit(
  db: DB,
  ctx: RequestCtx,
  entity: string,
  entityId: string | null,
  action: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  await db.insert(auditLogs).values({
    id: nanoid(),
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    entity,
    entityId: entityId ?? null,
    action,
    before: before ? JSON.stringify(before) : null,
    after: after ? JSON.stringify(after) : null,
  });
}
