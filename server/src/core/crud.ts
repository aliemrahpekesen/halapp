import type { FastifyInstance } from 'fastify';
import { and, eq, desc } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { assertCan } from './rbac.js';
import { writeAudit } from './audit.js';
import { notFound, badRequest } from './errors.js';

interface CrudOpts<T extends SQLiteTable> {
  table: T;
  page: string; // rbac page group
  entity: string; // audit entity name
  basePath: string; // e.g. /api/params/balik-gruplari
  createSchema: z.ZodTypeAny;
  updateSchema?: z.ZodTypeAny;
}

/** Registers tenant-scoped list/get/create/update/delete for a master-data table. */
export function registerCrud<T extends SQLiteTable>(app: FastifyInstance, opts: CrudOpts<T>) {
  const { table, page, entity, basePath, createSchema } = opts;
  const updateSchema = opts.updateSchema ?? (createSchema as z.ZodObject<any>).partial?.() ?? createSchema;
  const anyTable = table as any;

  app.get(basePath, async (req) => {
    assertCan(req.ctx.role, page, 'read');
    const db = getDb();
    return db.select().from(table).where(eq(anyTable.tenantId, req.ctx.tenantId)).orderBy(desc(anyTable.createdAt));
  });

  app.get(`${basePath}/:id`, async (req) => {
    assertCan(req.ctx.role, page, 'read');
    const { id } = req.params as { id: string };
    const db = getDb();
    const [row] = await db.select().from(table)
      .where(and(eq(anyTable.tenantId, req.ctx.tenantId), eq(anyTable.id, id)));
    if (!row) throw notFound();
    return row;
  });

  app.post(basePath, async (req, reply) => {
    assertCan(req.ctx.role, page, 'write');
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues.map((i) => i.message).join('; '));
    const db = getDb();
    const id = nanoid();
    const values = { ...(parsed.data as object), id, tenantId: req.ctx.tenantId } as any;
    await db.insert(table).values(values);
    const [row] = await db.select().from(table)
      .where(and(eq(anyTable.tenantId, req.ctx.tenantId), eq(anyTable.id, id)));
    await writeAudit(db, req.ctx, entity, id, 'create', null, row);
    reply.code(201);
    return row;
  });

  app.put(`${basePath}/:id`, async (req) => {
    assertCan(req.ctx.role, page, 'write');
    const { id } = req.params as { id: string };
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues.map((i) => i.message).join('; '));
    const db = getDb();
    const [before] = await db.select().from(table)
      .where(and(eq(anyTable.tenantId, req.ctx.tenantId), eq(anyTable.id, id)));
    if (!before) throw notFound();
    await db.update(table).set(parsed.data as any)
      .where(and(eq(anyTable.tenantId, req.ctx.tenantId), eq(anyTable.id, id)));
    const [after] = await db.select().from(table)
      .where(and(eq(anyTable.tenantId, req.ctx.tenantId), eq(anyTable.id, id)));
    await writeAudit(db, req.ctx, entity, id, 'update', before, after);
    return after;
  });

  app.delete(`${basePath}/:id`, async (req) => {
    assertCan(req.ctx.role, page, 'delete');
    const { id } = req.params as { id: string };
    const db = getDb();
    const [before] = await db.select().from(table)
      .where(and(eq(anyTable.tenantId, req.ctx.tenantId), eq(anyTable.id, id)));
    if (!before) throw notFound();
    await db.delete(table).where(and(eq(anyTable.tenantId, req.ctx.tenantId), eq(anyTable.id, id)));
    await writeAudit(db, req.ctx, entity, id, 'delete', before, null);
    return { ok: true };
  });
}
