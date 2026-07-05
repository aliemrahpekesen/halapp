import { describe, it, expect } from 'vitest';
import { getTestApp, newTenant, auth } from './helpers.js';
import { getEmailProvider, MockEmailProvider } from '../src/providers/email.js';

describe('Foundation: health & auth', () => {
  it('health check works', async () => {
    const app = await getTestApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it('registers a tenant and logs in', async () => {
    const app = await getTestApp();
    const t = await newTenant(app);
    expect(t.token).toBeTruthy();
    const login = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { tenantSlug: t.slug, email: `admin@${t.slug}.test`, password: 'secret1' },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json().user.role).toBe('Admin');
  });

  it('rejects bad credentials', async () => {
    const app = await getTestApp();
    const t = await newTenant(app);
    const login = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { tenantSlug: t.slug, email: `admin@${t.slug}.test`, password: 'wrong' },
    });
    expect(login.statusCode).toBe(401);
  });

  it('forgot + reset password flow', async () => {
    const app = await getTestApp();
    const t = await newTenant(app);
    const forgot = await app.inject({
      method: 'POST', url: '/api/auth/forgot-password',
      payload: { tenantSlug: t.slug, email: `admin@${t.slug}.test` },
    });
    // Token must NOT be in the response body — it is delivered by email.
    expect(forgot.json().resetToken).toBeUndefined();
    const provider = getEmailProvider() as MockEmailProvider;
    const msg = provider.lastTo(`admin@${t.slug}.test`);
    expect(msg).toBeTruthy();
    const resetToken = (msg!.meta as any).token as string;
    expect(resetToken).toBeTruthy();
    const reset = await app.inject({
      method: 'POST', url: '/api/auth/reset-password',
      payload: { token: resetToken, password: 'newpass1' },
    });
    expect(reset.statusCode).toBe(200);
    const login = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { tenantSlug: t.slug, email: `admin@${t.slug}.test`, password: 'newpass1' },
    });
    expect(login.statusCode).toBe(200);
  });

  it('protected route needs a token', async () => {
    const app = await getTestApp();
    const res = await app.inject({ method: 'GET', url: '/api/params/depolar' });
    expect(res.statusCode).toBe(401);
  });

  it('me endpoint returns the current user', async () => {
    const app = await getTestApp();
    const t = await newTenant(app);
    const res = await app.inject({ method: 'GET', url: '/api/auth/me', headers: auth(t.token) });
    expect(res.statusCode).toBe(200);
    expect(res.json().tenantId).toBe(t.tenantId);
  });
});
