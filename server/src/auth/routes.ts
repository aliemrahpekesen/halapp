import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { tenants, users, loginAttempts } from '../db/schema.js';
import { badRequest, unauthorized, tooMany } from '../core/errors.js';

const MAX_FAILED_LOGINS = 8;
const LOGIN_WINDOW = "15 minutes";
import type { Role } from '../core/types.js';
import { getEmailProvider } from '../providers/email.js';

const BCRYPT_ROUNDS = 10;

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
  app.post('/api/auth/register', { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } }, async (req, reply) => {
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
      passwordHash: bcrypt.hashSync(p.data.password, BCRYPT_ROUNDS),
      fullName: p.data.fullName, role: 'Admin',
    });
    const token = await reply.jwtSign({ sub: userId, tenantId, role: 'Admin', email: p.data.email.toLowerCase() });
    reply.code(201);
    return { token, user: { id: userId, email: p.data.email.toLowerCase(), fullName: p.data.fullName, role: 'Admin', tenantId } };
  });

  app.post('/api/auth/login', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (req, reply) => {
    const p = loginSchema.safeParse(req.body);
    if (!p.success) throw badRequest(p.error.issues.map((i) => i.message).join('; '));
    const db = getDb();
    const key = `${p.data.tenantSlug}:${p.data.email.toLowerCase()}`;

    // Distributed brute-force lockout (works across serverless instances).
    const [{ c }] = await db.select({ c: sql<number>`cast(count(*) as integer)` }).from(loginAttempts)
      .where(and(eq(loginAttempts.k, key), sql`${loginAttempts.createdAt} > now() - interval '${sql.raw(LOGIN_WINDOW)}'`));
    if (c >= MAX_FAILED_LOGINS) throw tooMany('Çok fazla hatalı giriş denemesi — 15 dakika sonra tekrar deneyin');

    const fail = async () => {
      await db.insert(loginAttempts).values({ id: nanoid(), k: key });
      throw unauthorized('Geçersiz işletme kodu, e-posta veya şifre');
    };

    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, p.data.tenantSlug));
    if (!tenant) return fail();
    const [user] = await db.select().from(users)
      .where(and(eq(users.tenantId, tenant.id), eq(users.email, p.data.email.toLowerCase())));
    if (!user || !user.active) return fail();
    if (!bcrypt.compareSync(p.data.password, user.passwordHash)) return fail();

    // success — clear failed attempts
    await db.delete(loginAttempts).where(eq(loginAttempts.k, key));
    const token = await reply.jwtSign({ sub: user.id, tenantId: user.tenantId, role: user.role as Role, email: user.email });
    return { token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, tenantId: user.tenantId } };
  });

  app.post('/api/auth/forgot-password', { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (req) => {
    const p = z.object({ tenantSlug: z.string(), email: z.string().email() }).safeParse(req.body);
    if (!p.success) throw badRequest('Geçersiz istek');
    const db = getDb();
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, p.data.tenantSlug));
    if (!tenant) return { ok: true }; // do not leak existence
    const [user] = await db.select().from(users)
      .where(and(eq(users.tenantId, tenant.id), eq(users.email, p.data.email.toLowerCase())));
    if (!user) return { ok: true };
    const token = nanoid(32);
    await db.update(users).set({ resetToken: token, resetTokenExp: new Date(Date.now() + 3600_000).toISOString() })
      .where(eq(users.id, user.id));
    // The token is delivered by email — NEVER returned in the response body.
    const resetLink = `${process.env.APP_URL || ''}/reset-password?token=${token}`;
    await getEmailProvider().send({
      to: user.email,
      subject: 'HalBoxPro — Şifre sıfırlama',
      body: `Şifrenizi sıfırlamak için: ${resetLink}\nBu bağlantı 1 saat geçerlidir. Talebi siz yapmadıysanız bu e-postayı yok sayın.`,
      meta: { token, userId: user.id },
    });
    return { ok: true };
  });

  app.post('/api/auth/reset-password', async (req) => {
    const p = z.object({ token: z.string(), password: z.string().min(6) }).safeParse(req.body);
    if (!p.success) throw badRequest('Geçersiz istek');
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.resetToken, p.data.token));
    if (!user || !user.resetTokenExp || new Date(user.resetTokenExp) < new Date()) throw badRequest('Token geçersiz veya süresi dolmuş');
    await db.update(users).set({
      passwordHash: bcrypt.hashSync(p.data.password, BCRYPT_ROUNDS), resetToken: null, resetTokenExp: null,
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
