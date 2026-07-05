import { describe, it, expect, beforeAll } from 'vitest';
import { getTestApp, newTenant, auth } from './helpers.js';
import type { FastifyInstance } from 'fastify';

async function setup(app: FastifyInstance) {
  const t = await newTenant(app); const h = auth(t.token);
  const post = async (url: string, payload: any) => (await app.inject({ method: 'POST', url, headers: h, payload })).json();
  const kasa = await post('/api/params/kasalar', { kod: 'K', ad: 'Kasa' });
  const cari = await post('/api/params/cari-hesaplar', { kod: 'A1', unvan: 'Alıcı', tip: 'ALICI' });
  return { t, h, kasa, cari, post };
}

describe('Finans', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await getTestApp(); });

  it('tahsil increases kasa and reduces cari receivable', async () => {
    const { h, kasa, cari } = await setup(app);
    const res = await app.inject({ method: 'POST', url: '/api/finans/tahsil', headers: h, payload: { tarih: '2026-01-10', cariId: cari.id, kasaId: kasa.id, tutar: 1500 } });
    expect(res.statusCode).toBe(201);
    const durum = (await app.inject({ method: 'GET', url: `/api/finans/kasa/${kasa.id}/durum`, headers: h })).json();
    expect(durum.bakiye).toBe(1500);
    const ekstre = (await app.inject({ method: 'GET', url: `/api/cari/${cari.id}/ekstre`, headers: h })).json();
    expect(ekstre.kapanisBakiye).toBe(-1500);
  });

  it('tediye decreases kasa and increases cari (payment out)', async () => {
    const { h, kasa, cari } = await setup(app);
    await app.inject({ method: 'POST', url: '/api/finans/kasa-islem', headers: h, payload: { tarih: '2026-01-01', kasaId: kasa.id, yon: 'GIRIS', tutar: 5000 } });
    await app.inject({ method: 'POST', url: '/api/finans/tediye', headers: h, payload: { tarih: '2026-01-10', cariId: cari.id, kasaId: kasa.id, tutar: 2000 } });
    const durum = (await app.inject({ method: 'GET', url: `/api/finans/kasa/${kasa.id}/durum`, headers: h })).json();
    expect(durum.bakiye).toBe(3000);
    const ekstre = (await app.inject({ method: 'GET', url: `/api/cari/${cari.id}/ekstre`, headers: h })).json();
    expect(ekstre.kapanisBakiye).toBe(2000);
  });

  it('masraf posts a cash-out and lists', async () => {
    const { h, kasa } = await setup(app);
    await app.inject({ method: 'POST', url: '/api/finans/kasa-islem', headers: h, payload: { tarih: '2026-01-01', kasaId: kasa.id, yon: 'GIRIS', tutar: 1000 } });
    await app.inject({ method: 'POST', url: '/api/finans/masraf', headers: h, payload: { tarih: '2026-01-05', kasaId: kasa.id, tutar: 250, aciklama: 'Nakliye' } });
    const durum = (await app.inject({ method: 'GET', url: `/api/finans/kasa/${kasa.id}/durum`, headers: h })).json();
    expect(durum.bakiye).toBe(750);
    const list = (await app.inject({ method: 'GET', url: '/api/finans/masraflar', headers: h })).json();
    expect(list).toHaveLength(1);
    expect(list[0].tutar).toBe(250);
  });

  it('kasa devir returns closing balance', async () => {
    const { h, kasa } = await setup(app);
    await app.inject({ method: 'POST', url: '/api/finans/kasa-islem', headers: h, payload: { tarih: '2026-01-01', kasaId: kasa.id, yon: 'GIRIS', tutar: 4200 } });
    const devir = (await app.inject({ method: 'POST', url: '/api/finans/kasa-devir', headers: h, payload: { kasaId: kasa.id, tarih: '2026-01-02' } })).json();
    expect(devir.devirBakiye).toBe(4200);
  });

  it('çek received reduces receivable and follows status lifecycle', async () => {
    const { h, cari } = await setup(app);
    const cek = (await app.inject({ method: 'POST', url: '/api/finans/cekler', headers: h, payload: { yon: 'GIRIS', cariId: cari.id, cekNo: '123', tutar: 3000, tarih: '2026-01-10', vadeTarihi: '2026-03-10' } })).json();
    expect(cek.durum).toBe('PORTFOYDE');
    const ekstre = (await app.inject({ method: 'GET', url: `/api/cari/${cari.id}/ekstre`, headers: h })).json();
    expect(ekstre.kapanisBakiye).toBe(-3000);
    // valid transition
    const toTahsil = await app.inject({ method: 'POST', url: `/api/finans/cekler/${cek.id}/durum`, headers: h, payload: { durum: 'TAHSILDE' } });
    expect(toTahsil.json().durum).toBe('TAHSILDE');
    const toOdendi = await app.inject({ method: 'POST', url: `/api/finans/cekler/${cek.id}/durum`, headers: h, payload: { durum: 'ODENDI' } });
    expect(toOdendi.json().durum).toBe('ODENDI');
  });

  it('rejects illegal çek status transition', async () => {
    const { h, cari } = await setup(app);
    const cek = (await app.inject({ method: 'POST', url: '/api/finans/cekler', headers: h, payload: { yon: 'GIRIS', cariId: cari.id, cekNo: '9', tutar: 100, tarih: '2026-01-10' } })).json();
    const res = await app.inject({ method: 'POST', url: `/api/finans/cekler/${cek.id}/durum`, headers: h, payload: { durum: 'ODENDI' } });
    expect(res.statusCode).toBe(400); // PORTFOYDE -> ODENDI not allowed
  });

  it('çek portföy durumu aggregates', async () => {
    const { h, cari } = await setup(app);
    await app.inject({ method: 'POST', url: '/api/finans/cekler', headers: h, payload: { yon: 'GIRIS', cariId: cari.id, cekNo: 'A', tutar: 100, tarih: '2026-01-10' } });
    await app.inject({ method: 'POST', url: '/api/finans/cekler', headers: h, payload: { yon: 'GIRIS', cariId: cari.id, cekNo: 'B', tutar: 200, tarih: '2026-01-10' } });
    const rep = (await app.inject({ method: 'GET', url: '/api/finans/cek-portfoy-durumu', headers: h })).json();
    const portfoy = rep.find((r: any) => r.durum === 'PORTFOYDE');
    expect(portfoy.adet).toBe(2);
    expect(portfoy.toplam).toBe(300);
  });
});
