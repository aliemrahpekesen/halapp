import { describe, it, expect, beforeAll } from 'vitest';
import { getTestApp, newTenant, auth } from './helpers.js';
import type { FastifyInstance } from 'fastify';

describe('Boş kasa / ambalaj takibi', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await getTestApp(); });

  it('tracks crates given and returned, and outstanding balance per customer', async () => {
    const t = await newTenant(app); const h = auth(t.token);
    const post = async (u: string, p: any) => (await app.inject({ method: 'POST', url: u, headers: h, payload: p })).json();
    const tur = await post('/api/ambalaj/turleri', { kod: 'PK', ad: 'Plastik Kasa', depozito: 50 });
    const alici = await post('/api/params/cari-hesaplar', { kod: 'A', unvan: 'Manav', tip: 'ALICI' });

    await post('/api/ambalaj/hareket', { tarih: '2026-01-10', cariId: alici.id, ambalajTuruId: tur.id, yon: 'VERILEN', adet: 100 });
    await post('/api/ambalaj/hareket', { tarih: '2026-01-12', cariId: alici.id, ambalajTuruId: tur.id, yon: 'IADE', adet: 60 });

    const bakiye = (await app.inject({ method: 'GET', url: '/api/ambalaj/bakiye', headers: h })).json();
    const row = bakiye.find((r: any) => r.cariId === alici.id && r.ambalajTuruId === tur.id);
    expect(row.bakiye).toBe(40); // 100 verilen - 60 iade

    const detay = (await app.inject({ method: 'GET', url: `/api/ambalaj/cari/${alici.id}`, headers: h })).json();
    expect(detay.acikKap).toBe(40);
    expect(detay.hareketler).toHaveLength(2);
  });

  it('fully returned crates drop off the outstanding list', async () => {
    const t = await newTenant(app); const h = auth(t.token);
    const post = async (u: string, p: any) => (await app.inject({ method: 'POST', url: u, headers: h, payload: p })).json();
    const tur = await post('/api/ambalaj/turleri', { kod: 'TK', ad: 'Tahta Kasa' });
    const alici = await post('/api/params/cari-hesaplar', { kod: 'B', unvan: 'Market', tip: 'ALICI' });
    await post('/api/ambalaj/hareket', { tarih: '2026-01-10', cariId: alici.id, ambalajTuruId: tur.id, yon: 'VERILEN', adet: 30 });
    await post('/api/ambalaj/hareket', { tarih: '2026-01-11', cariId: alici.id, ambalajTuruId: tur.id, yon: 'IADE', adet: 30 });
    const bakiye = (await app.inject({ method: 'GET', url: '/api/ambalaj/bakiye', headers: h })).json();
    expect(bakiye.find((r: any) => r.cariId === alici.id)).toBeUndefined(); // net 0 -> excluded
  });

  it('is tenant-scoped', async () => {
    const a = await newTenant(app); const b = await newTenant(app);
    const post = async (tok: string, u: string, p: any) => (await app.inject({ method: 'POST', url: u, headers: auth(tok), payload: p })).json();
    const tur = await post(a.token, '/api/ambalaj/turleri', { kod: 'PK', ad: 'Plastik' });
    const cari = await post(a.token, '/api/params/cari-hesaplar', { kod: 'A', unvan: 'X', tip: 'ALICI' });
    await post(a.token, '/api/ambalaj/hareket', { tarih: '2026-01-10', cariId: cari.id, ambalajTuruId: tur.id, yon: 'VERILEN', adet: 5 });
    const bBakiye = (await app.inject({ method: 'GET', url: '/api/ambalaj/bakiye', headers: auth(b.token) })).json();
    expect(bBakiye).toHaveLength(0);
  });
});
