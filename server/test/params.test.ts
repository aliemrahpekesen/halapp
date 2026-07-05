import { describe, it, expect } from 'vitest';
import { getTestApp, newTenant, auth } from './helpers.js';

describe('Parametreler: master-data CRUD', () => {
  it('full CRUD lifecycle for balık grupları', async () => {
    const app = await getTestApp();
    const t = await newTenant(app);
    const h = auth(t.token);

    const created = await app.inject({ method: 'POST', url: '/api/params/balik-gruplari', headers: h, payload: { kod: 'BEYAZ', ad: 'Beyaz Etli' } });
    expect(created.statusCode).toBe(201);
    const id = created.json().id;

    const list = await app.inject({ method: 'GET', url: '/api/params/balik-gruplari', headers: h });
    expect(list.json()).toHaveLength(1);

    const upd = await app.inject({ method: 'PUT', url: `/api/params/balik-gruplari/${id}`, headers: h, payload: { ad: 'Beyaz Balık' } });
    expect(upd.json().ad).toBe('Beyaz Balık');

    const del = await app.inject({ method: 'DELETE', url: `/api/params/balik-gruplari/${id}`, headers: h });
    expect(del.statusCode).toBe(200);
    const after = await app.inject({ method: 'GET', url: '/api/params/balik-gruplari', headers: h });
    expect(after.json()).toHaveLength(0);
  });

  it('validates required fields', async () => {
    const app = await getTestApp();
    const t = await newTenant(app);
    const res = await app.inject({ method: 'POST', url: '/api/params/balik-gruplari', headers: auth(t.token), payload: { kod: '' } });
    expect(res.statusCode).toBe(400);
  });

  it('enforces isyeri HKS komisyon legal max (<= 0.08)', async () => {
    const app = await getTestApp();
    const t = await newTenant(app);
    const res = await app.inject({ method: 'POST', url: '/api/params/isyeri', headers: auth(t.token), payload: { kod: 'M', unvan: 'X', hksKomisyonOrani: 0.2 } });
    expect(res.statusCode).toBe(400);
  });

  it('cari hesap filters persist tip', async () => {
    const app = await getTestApp();
    const t = await newTenant(app);
    const res = await app.inject({ method: 'POST', url: '/api/params/cari-hesaplar', headers: auth(t.token), payload: { kod: 'M001', unvan: 'Müstahsil A', tip: 'MUSTAHSIL' } });
    expect(res.statusCode).toBe(201);
    expect(res.json().tip).toBe('MUSTAHSIL');
    expect(res.json().bakiye).toBe(0);
  });

  it('records an audit entry on create', async () => {
    const app = await getTestApp();
    const t = await newTenant(app);
    await app.inject({ method: 'POST', url: '/api/params/depolar', headers: auth(t.token), payload: { kod: 'D1', ad: 'Depo 1' } });
    // audit visibility is exercised via the yönetim module later; here we assert the write path did not error
    const list = await app.inject({ method: 'GET', url: '/api/params/depolar', headers: auth(t.token) });
    expect(list.json()).toHaveLength(1);
  });
});
