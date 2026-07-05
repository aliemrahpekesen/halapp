import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { ZodError } from 'zod';
import { AppError } from './core/errors.js';
import type { Role } from './core/types.js';
import { authRoutes } from './auth/routes.js';
import { registerModules } from './modules/index.js';
import { initDb } from './db/index.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'halboxpro-dev-secret-change-in-prod';

const PUBLIC_PREFIXES = ['/api/auth/register', '/api/auth/login', '/api/auth/forgot-password', '/api/auth/reset-password', '/health'];

export async function buildApp(): Promise<FastifyInstance> {
  await initDb();
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: JWT_SECRET });

  app.get('/health', async () => ({ ok: true, service: 'halboxpro', ts: new Date().toISOString() }));

  // Auth guard + context injection for all non-public routes.
  app.addHook('preHandler', async (req, reply) => {
    if (PUBLIC_PREFIXES.some((p) => req.url === p || req.url.startsWith(p + '?'))) return;
    if (!req.url.startsWith('/api/')) return;
    try {
      const payload = await req.jwtVerify<{ sub: string; tenantId: string; role: Role; email: string }>();
      req.ctx = { userId: payload.sub, tenantId: payload.tenantId, role: payload.role, userEmail: payload.email };
    } catch {
      reply.code(401);
      throw new AppError(401, 'Yetkisiz - geçersiz veya eksik token');
    }
  });

  app.setErrorHandler((err: any, _req, reply) => {
    if (err instanceof AppError) return reply.code(err.statusCode).send({ error: err.message });
    if (err instanceof ZodError) return reply.code(400).send({ error: err.issues.map((i) => i.message).join('; ') });
    if (err?.statusCode === 401) return reply.code(401).send({ error: err.message });
    return reply.code(500).send({ error: err?.message || 'Sunucu hatası' });
  });

  await app.register(authRoutes);
  await registerModules(app);

  return app;
}
