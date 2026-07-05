import { describe, it, expect, beforeAll } from 'vitest';
import { getTestApp, newTenant, auth } from './helpers.js';
import { toCsv } from '../src/lib/export.js';
import type { FastifyInstance } from 'fastify';

async function setupWithSale(app: FastifyInstance) {
  const t = await newTenant(app); const h = auth(t.token);
  const post = async (url: string, payload: any) => (await app.inject({ method: 'POST', url, headers: h, payload })).json();
  await post('/api/params/isyeri', { kod: 'M', unvan: 'Hal', hksKomisyonOrani: 0.08, hksKomisyonKdvOrani: 0.2, hksGelirVergisiOrani: 0.02 });
  const depo = await post('/api/params/depolar', { kod: 'ANA', ad: 'Ana' });
  const kasa = await post('/api/params/kasalar', { kod: 'K', ad: 'Kasa' });
  const cins = await post('/api/params/balik-cinsleri', { kod: 'H', ad: 'Hamsi', rusumOrani: 0.02 });
  const alici = await post('/api/params/cari-hesaplar', { kod: 'A', unvan: 'Manav', tip: 'ALICI' });
  const mustahsil = await post('/api/params/cari-hesaplar', { kod: 'M', unvan: 'Balıkçı', tip: 'MUSTAHSIL' });
  await post('/api/satis/fisler', { tip: 'SATIS', tarih: '2026-01-10', aliciCariId: alici.id, mustahsilCariId: mustahsil.id, depoId: depo.id, odemeTipi: 'VERESIYE', satirlar: [{ balikCinsId: cins.id, miktar: 100, birimFiyat: 100 }] });
  return { t, h, depo, kasa, cins, alici, mustahsil, post };
}

describe('Raporlar', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await getTestApp(); });

  it('komisyon raporu totals the deductions', async () => {
    const { h } = await setupWithSale(app);
    const rep = (await app.inject({ method: 'GET', url: '/api/rapor/komisyon', headers: h })).json();
    expect(rep.toplam.brut).toBe(10000);
    expect(rep.toplam.komisyon).toBe(800);
    expect(rep.toplam.net).toBe(8640);
  });

  it('mizan balances per cari', async () => {
    const { h, alici } = await setupWithSale(app);
    const mizan = (await app.inject({ method: 'GET', url: '/api/rapor/mizan', headers: h })).json();
    const row = mizan.find((r: any) => r.cariId === alici.id);
    expect(row.bakiye).toBe(10000);
  });

  it('mali analiz dashboard reflects ledger', async () => {
    const { h } = await setupWithSale(app);
    const ma = (await app.inject({ method: 'GET', url: '/api/rapor/mali-analiz', headers: h })).json();
    expect(ma.ciro).toBe(10000);
    expect(ma.acikVeresiye).toBe(10000);
  });

  it('CSV export returns a downloadable file', async () => {
    const { h } = await setupWithSale(app);
    const res = await app.inject({ method: 'GET', url: '/api/rapor/export?rapor=komisyon', headers: h });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.body).toContain('komisyon');
  });

  it('toCsv escapes correctly', () => {
    const csv = toCsv([{ a: 'x,y', b: 'he said "hi"' }]);
    expect(csv).toBe('a,b\n"x,y","he said ""hi"""');
  });
});

describe('Yönetim & RBAC enforcement', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await getTestApp(); });

  it('admin creates a ReadOnly user who cannot write', async () => {
    const t = await newTenant(app);
    const adminH = auth(t.token);
    const create = await app.inject({ method: 'POST', url: '/api/yonetim/kullanicilar', headers: adminH, payload: { email: `ro@${t.slug}.test`, fullName: 'Read Only', password: 'secret1', role: 'ReadOnly' } });
    expect(create.statusCode).toBe(201);
    // login as the read-only user
    const login = (await app.inject({ method: 'POST', url: '/api/auth/login', payload: { tenantSlug: t.slug, email: `ro@${t.slug}.test`, password: 'secret1' } })).json();
    const roH = auth(login.token);
    // read allowed
    const read = await app.inject({ method: 'GET', url: '/api/params/depolar', headers: roH });
    expect(read.statusCode).toBe(200);
    // write forbidden
    const write = await app.inject({ method: 'POST', url: '/api/params/depolar', headers: roH, payload: { kod: 'X', ad: 'Y' } });
    expect(write.statusCode).toBe(403);
  });

  it('promoting the user to Admin grants write', async () => {
    const t = await newTenant(app);
    const adminH = auth(t.token);
    const u = (await app.inject({ method: 'POST', url: '/api/yonetim/kullanicilar', headers: adminH, payload: { email: `u@${t.slug}.test`, fullName: 'User Name', password: 'secret1', role: 'ReadOnly' } })).json();
    await app.inject({ method: 'PUT', url: `/api/yonetim/kullanicilar/${u.id}`, headers: adminH, payload: { role: 'Admin' } });
    const login = (await app.inject({ method: 'POST', url: '/api/auth/login', payload: { tenantSlug: t.slug, email: `u@${t.slug}.test`, password: 'secret1' } })).json();
    const write = await app.inject({ method: 'POST', url: '/api/params/depolar', headers: auth(login.token), payload: { kod: 'X', ad: 'Y' } });
    expect(write.statusCode).toBe(201);
  });

  it('audit log records mutations', async () => {
    const t = await newTenant(app);
    const h = auth(t.token);
    await app.inject({ method: 'POST', url: '/api/params/depolar', headers: h, payload: { kod: 'D', ad: 'Depo' } });
    const audit = (await app.inject({ method: 'GET', url: '/api/yonetim/audit?entity=depo', headers: h })).json();
    expect(audit.length).toBeGreaterThanOrEqual(1);
    expect(audit[0].action).toBe('create');
  });

  it('yetki matris lists roles and pages', async () => {
    const t = await newTenant(app);
    const matris = (await app.inject({ method: 'GET', url: '/api/yonetim/yetki-matris', headers: auth(t.token) })).json();
    expect(matris.roller).toContain('Admin');
    expect(matris.matris.ReadOnly.satis).toEqual(['read']);
  });

  it('notifications: create, unread count, mark read', async () => {
    const t = await newTenant(app);
    const h = auth(t.token);
    await app.inject({ method: 'POST', url: '/api/bildirim', headers: h, payload: { title: 'Test' } });
    let cnt = (await app.inject({ method: 'GET', url: '/api/bildirim/okunmamis-sayisi', headers: h })).json();
    expect(cnt.adet).toBe(1);
    await app.inject({ method: 'POST', url: '/api/bildirim/tumunu-okundu', headers: h });
    cnt = (await app.inject({ method: 'GET', url: '/api/bildirim/okunmamis-sayisi', headers: h })).json();
    expect(cnt.adet).toBe(0);
  });

  it('support ticket lifecycle', async () => {
    const t = await newTenant(app);
    const h = auth(t.token);
    const ticket = (await app.inject({ method: 'POST', url: '/api/yonetim/destek', headers: h, payload: { subject: 'Yardım' } })).json();
    const upd = await app.inject({ method: 'PUT', url: `/api/yonetim/destek/${ticket.id}`, headers: h, payload: { status: 'closed' } });
    expect(upd.json().status).toBe('closed');
  });

  it('non-SuperAdmin cannot list tenants', async () => {
    const t = await newTenant(app);
    const res = await app.inject({ method: 'GET', url: '/api/yonetim/tenants', headers: auth(t.token) });
    expect(res.statusCode).toBe(403);
  });

  it('dashboard KPIs load', async () => {
    const { h } = await setupWithSale(app);
    const dash = (await app.inject({ method: 'GET', url: '/api/dashboard', headers: h })).json();
    expect(dash.satisAdet).toBe(1);
    expect(dash.cariAdet).toBe(2);
  });
});
