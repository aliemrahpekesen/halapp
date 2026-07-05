import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { ZodError } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { AppError } from './core/errors.js';
import type { Role } from './core/types.js';
import { authRoutes } from './auth/routes.js';
import { registerModules } from './modules/index.js';
import { initDb } from './db/index.js';

const DEV_SECRET = 'halboxpro-dev-secret-change-in-prod';
export const JWT_SECRET = process.env.JWT_SECRET || DEV_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';
const IS_PROD = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
const IS_TEST = process.env.NODE_ENV === 'test';

// Fail-fast: never run in production with the public dev secret or a weak one.
if (IS_PROD && (JWT_SECRET === DEV_SECRET || JWT_SECRET.length < 24)) {
  throw new Error('JWT_SECRET must be set to a strong (>=24 char) value in production');
}

const PUBLIC_PREFIXES = ['/api/auth/register', '/api/auth/login', '/api/auth/forgot-password', '/api/auth/reset-password', '/health'];

export async function buildApp(): Promise<FastifyInstance> {
  await initDb();
  // Trust exactly one proxy hop (the platform edge) so req.ip is the real client
  // and cannot be spoofed via a prepended X-Forwarded-For.
  const app = Fastify({ logger: false, trustProxy: 1, bodyLimit: 1_048_576 });

  // Same-origin SPA; restrict CORS to the known app origin(s) when configured.
  const appUrl = process.env.APP_URL;
  await app.register(cors, { origin: appUrl ? [appUrl] : true });
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Ant Design injects runtime styles
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        workerSrc: ["'self'", 'blob:'],
        manifestSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });
  // Rate limiting is skipped under test (many logins from one IP would 429);
  // it is verified against the live deployment. Per-route `config.rateLimit`
  // settings are simply ignored when the plugin is not registered.
  if (!IS_TEST) {
    await app.register(rateLimit, {
      global: true,
      max: Number(process.env.RATE_LIMIT_MAX || 300),
      timeWindow: '1 minute',
      allowList: (req) => req.url === '/health' || (!req.url.startsWith('/api/')),
    });
  }
  await app.register(jwt, { secret: JWT_SECRET, sign: { expiresIn: JWT_EXPIRES_IN } });

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
      throw new AppError(401, 'Yetkisiz - geçersiz veya süresi dolmuş oturum');
    }
  });

  app.setErrorHandler((err: any, req, reply) => {
    if (err instanceof AppError) return reply.code(err.statusCode).send({ error: err.message });
    if (err instanceof ZodError) return reply.code(400).send({ error: err.issues.map((i) => i.message).join('; ') });
    if (err?.statusCode === 401) return reply.code(401).send({ error: err.message });
    if (err?.statusCode === 429) return reply.code(429).send({ error: 'Çok fazla istek — lütfen biraz bekleyin' });
    // Mask internal errors in production; log full detail server-side.
    req.log?.error?.(err);
    if (IS_PROD) console.error('[500]', err?.message, err?.stack);
    return reply.code(500).send({ error: IS_PROD ? 'Sunucu hatası' : (err?.message || 'Sunucu hatası') });
  });

  await app.register(authRoutes);
  await registerModules(app);

  // Serve the built SPA when present (single-service deploy). Guarded so tests
  // and API-only runs are unaffected.
  const staticDir = process.env.STATIC_DIR
    ? path.resolve(process.env.STATIC_DIR)
    : path.resolve(process.cwd(), 'client/dist');
  if (fs.existsSync(path.join(staticDir, 'index.html'))) {
    await app.register(fastifyStatic, { root: staticDir, wildcard: false });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'Bulunamadı' });
      return reply.sendFile('index.html');
    });
  }

  return app;
}
