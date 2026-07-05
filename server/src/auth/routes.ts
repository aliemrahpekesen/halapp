import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { tenants, users } from '../db/schema.js';
import { badRequest, unauthorized } from '../core/errors.js';
import type { Role } from '../core/types.js';

const registerSchema = z.object({
  tenantName: z.string().min(2),
  tenantSlug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
});

const loginSchema = z.object({
  tenantSlug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  // Register a brand-new tenant with its first Admin user.
  app.post('/api/auth/register', async (req, reply) => {
    const p = registerSchema.safeParse(req.body);
    if (!p.success) throw badRequest(p.error.issues.map((i) => i.message).join('; '));
    const db = getDb();
    const existing = await db.select().from(tenants).where(eq(tenants.slug, p.data.tenantSlug));
    if (existing.length) throw badRequest('Bu tenant slug zaten kullanımda');
    const tenantId = nanoid();
    await db.insert(tenants).values({ id: tenantId, name: p.data.tenantName, slug: p.data.tenantSlug });
    const userId = nanoid();
    await db.insert(users).values({
      id: userId, tenantId, email: p.data.email.toLowerCase(),
      passwordHash: bcrypt.hashSync(p.data.password, 8),
      fullName: p.data.fullName, role: 'Admin',
    });
    const token = await reply.jwtSign({ sub: userId, tenantId, role: 'Admin', email: p.data.email.toLowerCase() });
    reply.code(201);
    return { token, user: { id: userId, email: p.data.email.toLowerCase(), fullName: p.data.fullName, role: 'Admin', tenantId } };
  });

  app.post('/api/auth/login', async (req, reply) => {
    const p = loginSchema.safeParse(req.body);
    if (!p.success) throw badRequest(p.error.issues.map((i) => i.message).join('; '));
    const db = getDb();
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, p.data.tenantSlug));
    if (!tenant) throw unauthorized('Geçersiz tenant, e-posta veya şifre');
    const [user] = await db.select().from(users)
      .where(and(eq(users.tenantId, tenant.id), eq(users.email, p.data.email.toLowerCase())));
    if (!user || !user.active) throw unauthorized('Geçersiz tenant, e-posta veya şifre');
    if (!bcrypt.compareSync(p.data.password, user.passwordHash)) throw unauthorized('Geçersiz tenant, e-posta veya şifre');
    const token = await reply.jwtSign({ sub: user.id, tenantId: user.tenantId, role: user.role as Role, email: user.email });
    return { token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, tenantId: user.tenantId } };
  });

  app.post('/api/auth/forgot-password', async (req) => {
    const p = z.object({ tenantSlug: z.string(), email: z.string().email() }).safeParse(req.body);
    if (!p.success) throw badRequest('Geçersiz istek');
    const db = getDb();
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, p.data.tenantSlug));
    if (!tenant) return { ok: true }; // do not leak existence
    const [user] = await db.select().from(users)
      .where(and(eq(users.tenantId, tenant.id), eq(users.email, p.data.email.toLowerCase())));
    if (!user) return { ok: true };
    const token = nanoid();
    await db.update(users).set({ resetToken: token, resetTokenExp: new Date(Date.now() + 3600_000).toISOString() })
      .where(eq(users.id, user.id));
    // In Phase 2 this token is emailed. For now return it so the flow is testable.
    return { ok: true, resetToken: token };
  });

  app.post('/api/auth/reset-password', async (req) => {
    const p = z.object({ token: z.string(), password: z.string().min(6) }).safeParse(req.body);
    if (!p.success) throw badRequest('Geçersiz istek');
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.resetToken, p.data.token));
    if (!user || !user.resetTokenExp || new Date(user.resetTokenExp) < new Date()) throw badRequest('Token geçersiz veya süresi dolmuş');
    await db.update(users).set({
      passwordHash: bcrypt.hashSync(p.data.password, 8), resetToken: null, resetTokenExp: null,
    }).where(eq(users.id, user.id));
    return { ok: true };
  });

  app.get('/api/auth/me', async (req) => {
    const db = getDb();
    const [user] = await db.select().from(users)
      .where(and(eq(users.tenantId, req.ctx.tenantId), eq(users.id, req.ctx.userId)));
    if (!user) throw unauthorized();
    return { id: user.id, email: user.email, fullName: user.fullName, role: user.role, tenantId: user.tenantId };
  });
}
