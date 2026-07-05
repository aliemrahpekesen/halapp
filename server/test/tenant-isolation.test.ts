import { describe, it, expect } from 'vitest';
import { getTestApp, newTenant, auth } from './helpers.js';

describe('Foundation: multi-tenant isolation', () => {
  it('tenant A cannot see tenant B data across entities', async () => {
    const app = await getTestApp();
    const a = await newTenant(app);
    const b = await newTenant(app);

    // A creates rows in three different entities
    const depoA = await app.inject({ method: 'POST', url: '/api/params/depolar', headers: auth(a.token), payload: { kod: 'D1', ad: 'A Deposu' } });
    const kasaA = await app.inject({ method: 'POST', url: '/api/params/kasalar', headers: auth(a.token), payload: { kod: 'K1', ad: 'A Kasa' } });
    const cariA = await app.inject({ method: 'POST', url: '/api/params/cari-hesaplar', headers: auth(a.token), payload: { kod: 'C1', unvan: 'A Cari', tip: 'ALICI' } });
    expect(depoA.statusCode).toBe(201);
    expect(kasaA.statusCode).toBe(201);
    expect(cariA.statusCode).toBe(201);

    // B lists — must be empty
    for (const path of ['/api/params/depolar', '/api/params/kasalar', '/api/params/cari-hesaplar']) {
      const listB = await app.inject({ method: 'GET', url: path, headers: auth(b.token) });
      expect(listB.json()).toHaveLength(0);
    }

    // B cannot fetch A's row by id
    const getB = await app.inject({ method: 'GET', url: `/api/params/depolar/${depoA.json().id}`, headers: auth(b.token) });
    expect(getB.statusCode).toBe(404);

    // B cannot update or delete A's row
    const updB = await app.inject({ method: 'PUT', url: `/api/params/depolar/${depoA.json().id}`, headers: auth(b.token), payload: { ad: 'hack' } });
    expect(updB.statusCode).toBe(404);
    const delB = await app.inject({ method: 'DELETE', url: `/api/params/kasalar/${kasaA.json().id}`, headers: auth(b.token) });
    expect(delB.statusCode).toBe(404);

    // A still sees its own rows intact
    const listA = await app.inject({ method: 'GET', url: '/api/params/depolar', headers: auth(a.token) });
    expect(listA.json()).toHaveLength(1);
    expect(listA.json()[0].ad).toBe('A Deposu');
  });
});
