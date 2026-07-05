import { afterAll, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Tests run against an in-memory PGlite database (no DATABASE_URL).
delete process.env.DATABASE_URL;
process.env.JWT_SECRET = 'test-secret';

let appPromise: Promise<FastifyInstance> | null = null;

export async function getTestApp(): Promise<FastifyInstance> {
  if (!appPromise) {
    const { buildApp } = await import('../src/app.js');
    appPromise = buildApp();
  }
  return appPromise;
}

export interface AuthedTenant {
  token: string;
  tenantId: string;
  userId: string;
  slug: string;
}

let counter = 0;

/** Register a fresh tenant + admin, returning an auth token. */
export async function newTenant(app: FastifyInstance, opts?: { role?: string }): Promise<AuthedTenant> {
  const slug = `t${Date.now().toString(36)}${counter++}`;
  const res = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { tenantName: `Tenant ${slug}`, tenantSlug: slug, email: `admin@${slug}.test`, password: 'secret1', fullName: 'Admin User' },
  });
  const body = res.json();
  return { token: body.token, tenantId: body.user.tenantId, userId: body.user.id, slug };
}

export function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

export { beforeAll, afterAll };
