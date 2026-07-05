import { describe, it, expect, beforeAll } from 'vitest';
import { getTestApp, newTenant, auth } from './helpers.js';
import type { FastifyInstance } from 'fastify';

/** Helper: build a tenant with isyeri, depo, kasa, species, buyer & producer. */
async function setupTenant(app: FastifyInstance) {
  const t = await newTenant(app);
  const h = auth(t.token);
  const post = async (url: string, payload: any) => (await app.inject({ method: 'POST', url, headers: h, payload })).json();
  await post('/api/params/isyeri', { kod: 'MERKEZ', unvan: 'Test Hal', hksKomisyonOrani: 0.08, hksKomisyonKdvOrani: 0.2, hksGelirVergisiOrani: 0.02 });
  const depo = await post('/api/params/depolar', { kod: 'ANA', ad: 'Ana Depo' });
  const kasa = await post('/api/params/kasalar', { kod: 'K', ad: 'Merkez Kasa' });
  const cins = await post('/api/params/balik-cinsleri', { kod: 'HAMSI', ad: 'Hamsi', rusumOrani: 0.02, birim: 'KG' });
  const alici = await post('/api/params/cari-hesaplar', { kod: 'A1', unvan: 'Manav', tip: 'ALICI', riskLimiti: 1000000 });
  const mustahsil = await post('/api/params/cari-hesaplar', { kod: 'M1', unvan: 'Balıkçı', tip: 'MUSTAHSIL' });
  return { t, h, depo, kasa, cins, alici, mustahsil, post };
}

describe('Cari & Satış', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await getTestApp(); });

  it('posts a veresiye sales slip with correct deductions and ledger effects', async () => {
    const { h, depo, cins, alici, mustahsil } = await setupTenant(app);
    const res = await app.inject({
      method: 'POST', url: '/api/satis/fisler', headers: h,
      payload: {
        tip: 'SATIS', tarih: '2026-01-10', aliciCariId: alici.id, mustahsilCariId: mustahsil.id,
        depoId: depo.id, odemeTipi: 'VERESIYE',
        satirlar: [{ balikCinsId: cins.id, kapAdet: 10, miktar: 100, birimFiyat: 100 }],
      },
    });
    expect(res.statusCode).toBe(201);
    const fis = res.json();
    // brut 10000; komisyon 800; kdv 160; stopaj 200; rusum 200; net 8640
    expect(fis.brutTutar).toBe(10000);
    expect(fis.komisyonTutar).toBe(800);
    expect(fis.rusumTutar).toBe(200);
    expect(fis.stopajTutar).toBe(200);
    expect(fis.netTutar).toBe(8640);
    expect(fis.durum).toBe('ISLENDI');

    // Alıcı owes gross
    const ekstreA = (await app.inject({ method: 'GET', url: `/api/cari/${alici.id}/ekstre`, headers: h })).json();
    expect(ekstreA.kapanisBakiye).toBe(10000);
    // Müstahsil credited net (negative running balance = we owe)
    const ekstreM = (await app.inject({ method: 'GET', url: `/api/cari/${mustahsil.id}/ekstre`, headers: h })).json();
    expect(ekstreM.kapanisBakiye).toBe(-8640);
  });

  it('peşin sale settles the buyer and puts cash in the register', async () => {
    const { h, depo, kasa, cins, alici, mustahsil } = await setupTenant(app);
    await app.inject({
      method: 'POST', url: '/api/satis/fisler', headers: h,
      payload: {
        tip: 'SATIS', tarih: '2026-01-11', aliciCariId: alici.id, mustahsilCariId: mustahsil.id,
        depoId: depo.id, kasaId: kasa.id, odemeTipi: 'PESIN',
        satirlar: [{ balikCinsId: cins.id, miktar: 50, birimFiyat: 40 }],
      },
    });
    // brut 2000; alıcı borç 2000 then alacak 2000 => net 0
    const ekstreA = (await app.inject({ method: 'GET', url: `/api/cari/${alici.id}/ekstre`, headers: h })).json();
    expect(ekstreA.kapanisBakiye).toBe(0);
    const kasaRow = (await app.inject({ method: 'GET', url: `/api/params/kasalar/${kasa.id}`, headers: h })).json();
    expect(kasaRow.bakiye).toBe(2000);
  });

  it('cancelling a slip reverses every ledger effect', async () => {
    const { h, depo, cins, alici, mustahsil } = await setupTenant(app);
    const fis = (await app.inject({
      method: 'POST', url: '/api/satis/fisler', headers: h,
      payload: { tip: 'SATIS', tarih: '2026-01-12', aliciCariId: alici.id, mustahsilCariId: mustahsil.id, depoId: depo.id, odemeTipi: 'VERESIYE', satirlar: [{ balikCinsId: cins.id, miktar: 10, birimFiyat: 100 }] },
    })).json();
    const cancel = await app.inject({ method: 'POST', url: `/api/satis/fisler/${fis.id}/iptal`, headers: h });
    expect(cancel.statusCode).toBe(200);
    expect(cancel.json().durum).toBe('IPTAL');
    const ekstreA = (await app.inject({ method: 'GET', url: `/api/cari/${alici.id}/ekstre`, headers: h })).json();
    expect(ekstreA.kapanisBakiye).toBe(0);
    const ekstreM = (await app.inject({ method: 'GET', url: `/api/cari/${mustahsil.id}/ekstre`, headers: h })).json();
    expect(ekstreM.kapanisBakiye).toBe(0);
  });

  it('requires müstahsil for commission sales', async () => {
    const { h, depo, cins, alici } = await setupTenant(app);
    const res = await app.inject({
      method: 'POST', url: '/api/satis/fisler', headers: h,
      payload: { tip: 'SATIS', tarih: '2026-01-13', aliciCariId: alici.id, depoId: depo.id, odemeTipi: 'VERESIYE', satirlar: [{ balikCinsId: cins.id, miktar: 10, birimFiyat: 100 }] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('ALIS_SATIS (own goods) has no deductions', async () => {
    const { h, depo, cins, alici } = await setupTenant(app);
    const fis = (await app.inject({
      method: 'POST', url: '/api/satis/fisler', headers: h,
      payload: { tip: 'ALIS_SATIS', tarih: '2026-01-14', aliciCariId: alici.id, depoId: depo.id, odemeTipi: 'VERESIYE', satirlar: [{ balikCinsId: cins.id, miktar: 10, birimFiyat: 100 }] },
    })).json();
    expect(fis.komisyonTutar).toBe(0);
    expect(fis.netTutar).toBe(1000);
  });

  it('mahsup fişi offsets two accounts', async () => {
    const { h, alici, mustahsil } = await setupTenant(app);
    const res = await app.inject({
      method: 'POST', url: '/api/cari/mahsup', headers: h,
      payload: { tarih: '2026-01-15', borcluCariId: alici.id, alacakliCariId: mustahsil.id, tutar: 500 },
    });
    expect(res.statusCode).toBe(201);
    const a = (await app.inject({ method: 'GET', url: `/api/cari/${alici.id}/ekstre`, headers: h })).json();
    const m = (await app.inject({ method: 'GET', url: `/api/cari/${mustahsil.id}/ekstre`, headers: h })).json();
    expect(a.kapanisBakiye).toBe(500);
    expect(m.kapanisBakiye).toBe(-500);
  });

  it('günlük gelen balık aggregates by species/day', async () => {
    const { h, depo, cins, alici, mustahsil } = await setupTenant(app);
    await app.inject({ method: 'POST', url: '/api/satis/fisler', headers: h, payload: { tip: 'SATIS', tarih: '2026-02-01', aliciCariId: alici.id, mustahsilCariId: mustahsil.id, depoId: depo.id, odemeTipi: 'VERESIYE', satirlar: [{ balikCinsId: cins.id, miktar: 30, birimFiyat: 10 }] } });
    await app.inject({ method: 'POST', url: '/api/satis/fisler', headers: h, payload: { tip: 'SATIS', tarih: '2026-02-01', aliciCariId: alici.id, mustahsilCariId: mustahsil.id, depoId: depo.id, odemeTipi: 'VERESIYE', satirlar: [{ balikCinsId: cins.id, miktar: 20, birimFiyat: 10 }] } });
    const rep = (await app.inject({ method: 'GET', url: '/api/satis/gunluk-gelen-balik', headers: h })).json();
    const row = rep.find((r: any) => r.tarih === '2026-02-01' && r.balikCinsId === cins.id);
    expect(row.toplamMiktar).toBe(50);
  });
});
