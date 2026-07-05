import type { FastifyInstance } from 'fastify';
import { and, eq, or, isNull, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import * as s from '../db/schema.js';
import { assertCan } from '../core/rbac.js';
import { badRequest } from '../core/errors.js';

/** Create a notification (used internally and via API). */
export async function notify(db: ReturnType<typeof getDb>, tenantId: string, userId: string | null, title: string, body?: string) {
  await db.insert(s.notifications).values({ id: nanoid(), tenantId, userId, title, body: body ?? null });
}

// A user sees their own notifications plus tenant-wide broadcasts (userId null).
const visibleTo = (tenantId: string, userId: string) =>
  and(eq(s.notifications.tenantId, tenantId), or(eq(s.notifications.userId, userId), isNull(s.notifications.userId)));

export async function registerBildirim(app: FastifyInstance) {
  app.get('/api/bildirim', async (req) => {
    const db = getDb();
    return db.select().from(s.notifications).where(visibleTo(req.ctx.tenantId, req.ctx.userId)).orderBy(desc(s.notifications.createdAt)).limit(100);
  });

  app.get('/api/bildirim/okunmamis-sayisi', async (req) => {
    const db = getDb();
    const [row] = await db.select({ v: sql<number>`cast(count(*) as integer)` }).from(s.notifications)
      .where(and(visibleTo(req.ctx.tenantId, req.ctx.userId), eq(s.notifications.read, false)));
    return { adet: row.v };
  });

  // Creating a notification targeted at another user is an admin action.
  app.post('/api/bildirim', async (req, reply) => {
    const p = z.object({ title: z.string().min(1), body: z.string().optional(), userId: z.string().optional() }).safeParse(req.body);
    if (!p.success) throw badRequest('Başlık zorunlu');
    if (p.data.userId && p.data.userId !== req.ctx.userId) assertCan(req.ctx.role, 'yonetim', 'write');
    const db = getDb();
    await notify(db, req.ctx.tenantId, p.data.userId ?? req.ctx.userId, p.data.title, p.data.body);
    reply.code(201); return { ok: true };
  });

  // Mark only the caller's own (and broadcast) notifications read.
  app.post('/api/bildirim/tumunu-okundu', async (req) => {
    const db = getDb();
    await db.update(s.notifications).set({ read: true }).where(visibleTo(req.ctx.tenantId, req.ctx.userId));
    return { ok: true };
  });
}
