import type { FastifyInstance } from 'fastify';
import { and, eq, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import * as s from '../db/schema.js';
import { assertCan, describeMatrix } from '../core/rbac.js';
import { ROLES } from '../core/types.js';
import { writeAudit } from '../core/audit.js';
import { badRequest, notFound, forbidden } from '../core/errors.js';

const genelAyarStore = new Map<string, Record<string, unknown>>();

export async function registerYonetim(app: FastifyInstance) {
  // ---- Users ----
  const userSchema = z.object({
    email: z.string().email(), fullName: z.string().min(2),
    password: z.string().min(6), role: z.enum(['Admin', 'Muhasebe', 'Tahsilatci', 'ReadOnly']),
  });

  app.get('/api/yonetim/kullanicilar', async (req) => {
    assertCan(req.ctx.role, 'yonetim', 'read');
    const db = getDb();
    const rows = await db.select().from(s.users).where(eq(s.users.tenantId, req.ctx.tenantId)).orderBy(desc(s.users.createdAt));
    return rows.map(({ passwordHash, resetToken, resetTokenExp, ...u }: any) => u);
  });

  app.post('/api/yonetim/kullanicilar', async (req, reply) => {
    assertCan(req.ctx.role, 'yonetim', 'write');
    const p = userSchema.safeParse(req.body);
    if (!p.success) throw badRequest(p.error.issues.map((i) => i.message).join('; '));
    const db = getDb(); const tenantId = req.ctx.tenantId;
    const dup = await db.select().from(s.users).where(and(eq(s.users.tenantId, tenantId), eq(s.users.email, p.data.email.toLowerCase())));
    if (dup.length) throw badRequest('Bu e-posta zaten kayıtlı');
    const id = nanoid();
    await db.insert(s.users).values({ id, tenantId, email: p.data.email.toLowerCase(), passwordHash: bcrypt.hashSync(p.data.password, 8), fullName: p.data.fullName, role: p.data.role });
    await writeAudit(db, req.ctx, 'user', id, 'create', null, { email: p.data.email, role: p.data.role });
    reply.code(201);
    return { id, email: p.data.email.toLowerCase(), fullName: p.data.fullName, role: p.data.role };
  });

  app.put('/api/yonetim/kullanicilar/:id', async (req) => {
    assertCan(req.ctx.role, 'yonetim', 'write');
    const p = z.object({ fullName: z.string().min(2).optional(), role: z.enum(['Admin', 'Muhasebe', 'Tahsilatci', 'ReadOnly']).optional(), active: z.boolean().optional(), password: z.string().min(6).optional() }).safeParse(req.body);
    if (!p.success) throw badRequest('Geçersiz istek');
    const db = getDb(); const tenantId = req.ctx.tenantId;
    const id = (req.params as { id: string }).id;
    const [before] = await db.select().from(s.users).where(and(eq(s.users.tenantId, tenantId), eq(s.users.id, id)));
    if (!before) throw notFound();
    const patch: any = {};
    if (p.data.fullName) patch.fullName = p.data.fullName;
    if (p.data.role) patch.role = p.data.role;
    if (p.data.active !== undefined) patch.active = p.data.active;
    if (p.data.password) patch.passwordHash = bcrypt.hashSync(p.data.password, 8);
    await db.update(s.users).set(patch).where(and(eq(s.users.tenantId, tenantId), eq(s.users.id, id)));
    await writeAudit(db, req.ctx, 'user', id, 'update', { role: before.role, active: before.active }, patch);
    const [after] = await db.select().from(s.users).where(and(eq(s.users.tenantId, tenantId), eq(s.users.id, id)));
    const { passwordHash, resetToken, resetTokenExp, ...u } = after;
    return u;
  });

  app.delete('/api/yonetim/kullanicilar/:id', async (req) => {
    assertCan(req.ctx.role, 'yonetim', 'delete');
    const db = getDb(); const tenantId = req.ctx.tenantId;
    const id = (req.params as { id: string }).id;
    if (id === req.ctx.userId) throw badRequest('Kendi hesabınızı silemezsiniz');
    const [before] = await db.select().from(s.users).where(and(eq(s.users.tenantId, tenantId), eq(s.users.id, id)));
    if (!before) throw notFound();
    await db.delete(s.users).where(and(eq(s.users.tenantId, tenantId), eq(s.users.id, id)));
    await writeAudit(db, req.ctx, 'user', id, 'delete', { email: before.email }, null);
    return { ok: true };
  });

  // ---- Role/permission matrix (effective) ----
  app.get('/api/yonetim/yetki-matris', async (req) => {
    assertCan(req.ctx.role, 'yonetim', 'read');
    return { roller: ROLES, matris: describeMatrix() };
  });

  // ---- Audit log viewer ----
  app.get('/api/yonetim/audit', async (req) => {
    assertCan(req.ctx.role, 'yonetim', 'read');
    const db = getDb();
    const q = req.query as { entity?: string; userEmail?: string };
    const conds = [eq(s.auditLogs.tenantId, req.ctx.tenantId)];
    if (q.entity) conds.push(eq(s.auditLogs.entity, q.entity));
    if (q.userEmail) conds.push(eq(s.auditLogs.userEmail, q.userEmail));
    return db.select().from(s.auditLogs).where(and(...conds)).orderBy(desc(s.auditLogs.createdAt)).limit(500);
  });

  // ---- Support tickets ----
  app.get('/api/yonetim/destek', async (req) => {
    assertCan(req.ctx.role, 'yonetim', 'read');
    const db = getDb();
    return db.select().from(s.supportTickets).where(eq(s.supportTickets.tenantId, req.ctx.tenantId)).orderBy(desc(s.supportTickets.createdAt));
  });
  app.post('/api/yonetim/destek', async (req, reply) => {
    // any authenticated user can open a ticket
    const p = z.object({ subject: z.string().min(2), body: z.string().optional() }).safeParse(req.body);
    if (!p.success) throw badRequest('Konu zorunlu');
    const db = getDb(); const id = nanoid();
    await db.insert(s.supportTickets).values({ id, tenantId: req.ctx.tenantId, userId: req.ctx.userId, subject: p.data.subject, body: p.data.body ?? null, status: 'open' });
    reply.code(201); return { id, status: 'open' };
  });
  app.put('/api/yonetim/destek/:id', async (req) => {
    assertCan(req.ctx.role, 'yonetim', 'write');
    const p = z.object({ status: z.enum(['open', 'in_progress', 'closed']) }).safeParse(req.body);
    if (!p.success) throw badRequest('Geçersiz durum');
    const db = getDb(); const tenantId = req.ctx.tenantId; const id = (req.params as { id: string }).id;
    const [t] = await db.select().from(s.supportTickets).where(and(eq(s.supportTickets.tenantId, tenantId), eq(s.supportTickets.id, id)));
    if (!t) throw notFound();
    await db.update(s.supportTickets).set({ status: p.data.status }).where(and(eq(s.supportTickets.tenantId, tenantId), eq(s.supportTickets.id, id)));
    return { id, status: p.data.status };
  });

  // ---- Tenant administration (SuperAdmin only) ----
  app.get('/api/yonetim/tenants', async (req) => {
    if (req.ctx.role !== 'SuperAdmin') throw forbidden('Sadece SuperAdmin');
    return getDb().select().from(s.tenants).orderBy(desc(s.tenants.createdAt));
  });
  app.post('/api/yonetim/tenants', async (req, reply) => {
    if (req.ctx.role !== 'SuperAdmin') throw forbidden('Sadece SuperAdmin');
    const p = z.object({ name: z.string().min(2), slug: z.string().regex(/^[a-z0-9-]+$/), adminEmail: z.string().email(), adminPassword: z.string().min(6) }).safeParse(req.body);
    if (!p.success) throw badRequest(p.error.issues.map((i) => i.message).join('; '));
    const db = getDb();
    if ((await db.select().from(s.tenants).where(eq(s.tenants.slug, p.data.slug))).length) throw badRequest('Slug kullanımda');
    const tenantId = nanoid();
    await db.insert(s.tenants).values({ id: tenantId, name: p.data.name, slug: p.data.slug });
    const uid = nanoid();
    await db.insert(s.users).values({ id: uid, tenantId, email: p.data.adminEmail.toLowerCase(), passwordHash: bcrypt.hashSync(p.data.adminPassword, 8), fullName: 'Admin', role: 'Admin' });
    reply.code(201); return { id: tenantId, slug: p.data.slug };
  });

  // ---- General settings (per tenant) ----
  app.get('/api/yonetim/genel-ayar', async (req) => {
    assertCan(req.ctx.role, 'yonetim', 'read');
    return genelAyarStore.get(req.ctx.tenantId) ?? { paraBirimi: 'TRY', tarihFormat: 'DD.MM.YYYY', kunyeZorunlu: true };
  });
  app.put('/api/yonetim/genel-ayar', async (req) => {
    assertCan(req.ctx.role, 'yonetim', 'write');
    const merged = { ...(genelAyarStore.get(req.ctx.tenantId) ?? {}), ...(req.body as object) };
    genelAyarStore.set(req.ctx.tenantId, merged);
    return merged;
  });

  // ---- Main dashboard KPIs ----
  app.get('/api/dashboard', async (req) => {
    const db = getDb(); const tid = req.ctx.tenantId;
    const [satisAdet] = await db.select({ v: sql<number>`cast(count(*) as integer)` }).from(s.fisler).where(and(eq(s.fisler.tenantId, tid), eq(s.fisler.durum, 'ISLENDI')));
    const [kasa] = await db.select({ v: sql<number>`coalesce(sum(${s.kasalar.bakiye}),0)` }).from(s.kasalar).where(eq(s.kasalar.tenantId, tid));
    const [cariAdet] = await db.select({ v: sql<number>`cast(count(*) as integer)` }).from(s.cariHesaplar).where(eq(s.cariHesaplar.tenantId, tid));
    const [ebelgeAdet] = await db.select({ v: sql<number>`cast(count(*) as integer)` }).from(s.ebelgeler).where(eq(s.ebelgeler.tenantId, tid));
    return { satisAdet: satisAdet.v, kasaToplam: kasa.v, cariAdet: cariAdet.v, ebelgeAdet: ebelgeAdet.v };
  });
}
