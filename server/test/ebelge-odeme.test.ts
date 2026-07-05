import { describe, it, expect, beforeAll } from 'vitest';
import { getTestApp, newTenant, auth } from './helpers.js';
import type { FastifyInstance } from 'fastify';

async function setup(app: FastifyInstance) {
  const t = await newTenant(app); const h = auth(t.token);
  const post = async (url: string, payload: any) => (await app.inject({ method: 'POST', url, headers: h, payload })).json();
  await post('/api/params/isyeri', { kod: 'M', unvan: 'Hal' });
  const depo = await post('/api/params/depolar', { kod: 'ANA', ad: 'Ana' });
  const kasa = await post('/api/params/kasalar', { kod: 'K', ad: 'Kasa' });
  const cins = await post('/api/params/balik-cinsleri', { kod: 'H', ad: 'Hamsi', rusumOrani: 0.02 });
  const alici = await post('/api/params/cari-hesaplar', { kod: 'A', unvan: 'Manav', tip: 'ALICI' });
  const mustahsil = await post('/api/params/cari-hesaplar', { kod: 'M', unvan: 'Balıkçı', tip: 'MUSTAHSIL' });
  return { t, h, depo, kasa, cins, alici, mustahsil, post };
}

describe('e-Belge (mock Uyumsoft)', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await getTestApp(); });

  it('issues an e-fatura from a sales slip with a UUID and KABUL status', async () => {
    const { h, depo, cins, alici, mustahsil } = await setup(app);
    const fis = (await app.inject({ method: 'POST', url: '/api/satis/fisler', headers: h, payload: { tip: 'SATIS', tarih: '2026-01-10', aliciCariId: alici.id, mustahsilCariId: mustahsil.id, depoId: depo.id, odemeTipi: 'VERESIYE', satirlar: [{ balikCinsId: cins.id, miktar: 100, birimFiyat: 50 }] } })).json();
    const res = await app.inject({ method: 'POST', url: '/api/ebelge/gonder', headers: h, payload: { tur: 'EFATURA', fisId: fis.id } });
    expect(res.statusCode).toBe(201);
    const eb = res.json();
    expect(eb.uuid).toMatch(/[a-z0-9]{8}-/);
    expect(eb.durum).toBe('KABUL');
    expect(eb.tutar).toBe(5000);
    expect(eb.html).toContain('EFATURA');
    // fis is linked
    const fis2 = (await app.inject({ method: 'GET', url: `/api/satis/fisler/${fis.id}`, headers: h })).json();
    expect(fis2.efaturaId).toBe(eb.id);
  });

  it('e-müstahsil and e-irsaliye can be issued ad-hoc', async () => {
    const { h } = await setup(app);
    for (const tur of ['EMUSTAHSIL', 'EIRSALIYE']) {
      const res = await app.inject({ method: 'POST', url: '/api/ebelge/gonder', headers: h, payload: { tur, tutar: 1000 } });
      expect(res.statusCode).toBe(201);
      expect(res.json().tur).toBe(tur);
    }
  });

  it('dashboard counts and incoming feed work', async () => {
    const { h } = await setup(app);
    await app.inject({ method: 'POST', url: '/api/ebelge/gonder', headers: h, payload: { tur: 'EFATURA', tutar: 100 } });
    await app.inject({ method: 'POST', url: '/api/ebelge/gelen/simule', headers: h, payload: { tutar: 250 } });
    const dash = (await app.inject({ method: 'GET', url: '/api/ebelge/dashboard', headers: h })).json();
    expect(dash.length).toBeGreaterThanOrEqual(2);
    const gelen = (await app.inject({ method: 'GET', url: '/api/ebelge/gelen', headers: h })).json();
    expect(gelen).toHaveLength(1);
    expect(gelen[0].yon).toBe('GELEN');
  });

  it('settings round-trip', async () => {
    const { h } = await setup(app);
    const put = (await app.inject({ method: 'PUT', url: '/api/ebelge/ayarlar', headers: h, payload: { seri: 'BLK' } })).json();
    expect(put.seri).toBe('BLK');
    const get = (await app.inject({ method: 'GET', url: '/api/ebelge/ayarlar', headers: h })).json();
    expect(get.seri).toBe('BLK');
  });
});

describe('Ödeme (mock gateway)', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await getTestApp(); });

  it('card collection init→confirm posts to cari and kasa', async () => {
    const { h, kasa, alici } = await setup(app);
    const init = (await app.inject({ method: 'POST', url: '/api/odeme/baslat', headers: h, payload: { cariId: alici.id, tutar: 1200 } })).json();
    expect(init.token).toMatch(/^tok_/);
    const conf = (await app.inject({ method: 'POST', url: '/api/odeme/onayla', headers: h, payload: { odemeId: init.id, kasaId: kasa.id } })).json();
    expect(conf.durum).toBe('BASARILI');
    const durum = (await app.inject({ method: 'GET', url: `/api/finans/kasa/${kasa.id}/durum`, headers: h })).json();
    expect(durum.bakiye).toBe(1200);
    const ekstre = (await app.inject({ method: 'GET', url: `/api/cari/${alici.id}/ekstre`, headers: h })).json();
    expect(ekstre.kapanisBakiye).toBe(-1200);
  });

  it('failed payment leaves no postings', async () => {
    const { h, kasa, alici } = await setup(app);
    const init = (await app.inject({ method: 'POST', url: '/api/odeme/baslat', headers: h, payload: { cariId: alici.id, tutar: 500 } })).json();
    const conf = (await app.inject({ method: 'POST', url: '/api/odeme/onayla', headers: h, payload: { odemeId: init.id, kasaId: kasa.id, force: 'fail' } })).json();
    expect(conf.durum).toBe('BASARISIZ');
    const durum = (await app.inject({ method: 'GET', url: `/api/finans/kasa/${kasa.id}/durum`, headers: h })).json();
    expect(durum.bakiye).toBe(0);
  });

  it('refund only allowed on successful payment', async () => {
    const { h, kasa, alici } = await setup(app);
    const init = (await app.inject({ method: 'POST', url: '/api/odeme/baslat', headers: h, payload: { cariId: alici.id, tutar: 500 } })).json();
    await app.inject({ method: 'POST', url: '/api/odeme/onayla', headers: h, payload: { odemeId: init.id, kasaId: kasa.id } });
    const refund = await app.inject({ method: 'POST', url: `/api/odeme/${init.id}/iade`, headers: h });
    expect(refund.json().durum).toBe('IADE');
  });
});
