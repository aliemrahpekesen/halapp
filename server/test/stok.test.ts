import { describe, it, expect, beforeAll } from 'vitest';
import { getTestApp, newTenant, auth } from './helpers.js';
import type { FastifyInstance } from 'fastify';

async function setup(app: FastifyInstance) {
  const t = await newTenant(app); const h = auth(t.token);
  const post = async (url: string, payload: any) => (await app.inject({ method: 'POST', url, headers: h, payload })).json();
  await post('/api/params/isyeri', { kod: 'M', unvan: 'Hal' });
  const depo = await post('/api/params/depolar', { kod: 'ANA', ad: 'Ana' });
  const depo2 = await post('/api/params/depolar', { kod: 'SUBE', ad: 'Şube' });
  const cins = await post('/api/params/balik-cinsleri', { kod: 'H', ad: 'Hamsi', rusumOrani: 0.02 });
  const alici = await post('/api/params/cari-hesaplar', { kod: 'A', unvan: 'Alıcı', tip: 'ALICI' });
  const mustahsil = await post('/api/params/cari-hesaplar', { kod: 'M', unvan: 'Balıkçı', tip: 'MUSTAHSIL' });
  return { t, h, depo, depo2, cins, alici, mustahsil, post };
}

async function bakiye(app: FastifyInstance, h: any, depoId: string, cinsId: string) {
  const rows = (await app.inject({ method: 'GET', url: `/api/stok/bakiye?depoId=${depoId}`, headers: h })).json();
  return rows.find((r: any) => r.balikCinsId === cinsId)?.bakiye ?? 0;
}

describe('Stok', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await getTestApp(); });

  it('manual giriş then sale cikis nets correctly', async () => {
    const { h, depo, cins, alici, mustahsil } = await setup(app);
    await app.inject({ method: 'POST', url: '/api/stok/hareket', headers: h, payload: { tarih: '2026-01-01', depoId: depo.id, balikCinsId: cins.id, yon: 'GIRIS', miktar: 500 } });
    expect(await bakiye(app, h, depo.id, cins.id)).toBe(500);
    await app.inject({ method: 'POST', url: '/api/satis/fisler', headers: h, payload: { tip: 'SATIS', tarih: '2026-01-02', aliciCariId: alici.id, mustahsilCariId: mustahsil.id, depoId: depo.id, odemeTipi: 'VERESIYE', satirlar: [{ balikCinsId: cins.id, miktar: 120, birimFiyat: 10 }] } });
    expect(await bakiye(app, h, depo.id, cins.id)).toBe(380);
  });

  it('transfer moves qty between depolar', async () => {
    const { h, depo, depo2, cins } = await setup(app);
    await app.inject({ method: 'POST', url: '/api/stok/hareket', headers: h, payload: { tarih: '2026-01-01', depoId: depo.id, balikCinsId: cins.id, yon: 'GIRIS', miktar: 300 } });
    await app.inject({ method: 'POST', url: '/api/stok/transfer', headers: h, payload: { tarih: '2026-01-02', kaynakDepoId: depo.id, hedefDepoId: depo2.id, balikCinsId: cins.id, miktar: 100 } });
    expect(await bakiye(app, h, depo.id, cins.id)).toBe(200);
    expect(await bakiye(app, h, depo2.id, cins.id)).toBe(100);
  });

  it('sayım posts the difference to reach counted qty', async () => {
    const { h, depo, cins } = await setup(app);
    await app.inject({ method: 'POST', url: '/api/stok/hareket', headers: h, payload: { tarih: '2026-01-01', depoId: depo.id, balikCinsId: cins.id, yon: 'GIRIS', miktar: 100 } });
    const sayim = (await app.inject({ method: 'POST', url: '/api/stok/sayim', headers: h, payload: { tarih: '2026-01-03', depoId: depo.id, balikCinsId: cins.id, sayilanMiktar: 90 } })).json();
    expect(sayim.fark).toBe(-10);
    expect(await bakiye(app, h, depo.id, cins.id)).toBe(90);
  });

  it('rejects transfer to same depo', async () => {
    const { h, depo, cins } = await setup(app);
    const res = await app.inject({ method: 'POST', url: '/api/stok/transfer', headers: h, payload: { tarih: '2026-01-02', kaynakDepoId: depo.id, hedefDepoId: depo.id, balikCinsId: cins.id, miktar: 10 } });
    expect(res.statusCode).toBe(400);
  });

  it('stok ekstre shows running balance', async () => {
    const { h, depo, cins } = await setup(app);
    await app.inject({ method: 'POST', url: '/api/stok/hareket', headers: h, payload: { tarih: '2026-01-01', depoId: depo.id, balikCinsId: cins.id, yon: 'GIRIS', miktar: 100 } });
    await app.inject({ method: 'POST', url: '/api/stok/hareket', headers: h, payload: { tarih: '2026-01-02', depoId: depo.id, balikCinsId: cins.id, yon: 'CIKIS', miktar: 30 } });
    const ekstre = (await app.inject({ method: 'GET', url: `/api/stok/ekstre?depoId=${depo.id}&balikCinsId=${cins.id}`, headers: h })).json();
    expect(ekstre[ekstre.length - 1].bakiye).toBe(70);
  });
});
