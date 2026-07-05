import { describe, it, expect, beforeAll } from 'vitest';
import { getTestApp, newTenant, auth } from './helpers.js';
import type { FastifyInstance } from 'fastify';

async function setup(app: FastifyInstance, riskLimiti: number) {
  const t = await newTenant(app); const h = auth(t.token);
  const post = async (url: string, payload: any) => (await app.inject({ method: 'POST', url, headers: h, payload })).json();
  await post('/api/params/isyeri', { kod: 'M', unvan: 'Hal' });
  const depo = await post('/api/params/depolar', { kod: 'ANA', ad: 'Ana' });
  const cins = await post('/api/params/balik-cinsleri', { kod: 'H', ad: 'Hamsi', rusumOrani: 0.02 });
  const alici = await post('/api/params/cari-hesaplar', { kod: 'A', unvan: 'Manav', tip: 'ALICI', riskLimiti });
  const mustahsil = await post('/api/params/cari-hesaplar', { kod: 'M', unvan: 'Balıkçı', tip: 'MUSTAHSIL' });
  return { h, depo, cins, alici, mustahsil };
}

describe('BUG #47: risk limit enforcement on veresiye sales', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await getTestApp(); });

  const sale = (depoId: string, aliciId: string, mustahsilId: string, cinsId: string, brut: number, riskOnay?: boolean) => ({
    tip: 'SATIS', tarih: '2026-01-10', aliciCariId: aliciId, mustahsilCariId: mustahsilId, depoId, odemeTipi: 'VERESIYE',
    riskOnay, satirlar: [{ balikCinsId: cinsId, miktar: 1, birimFiyat: brut }],
  });

  it('blocks a veresiye sale that exceeds the risk limit', async () => {
    const { h, depo, cins, alici, mustahsil } = await setup(app, 1000);
    const res = await app.inject({ method: 'POST', url: '/api/satis/fisler', headers: h, payload: sale(depo.id, alici.id, mustahsil.id, cins.id, 5000) });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain('Risk limiti');
  });

  it('allows it with riskOnay override and records an audit entry', async () => {
    const { h, depo, cins, alici, mustahsil } = await setup(app, 1000);
    const res = await app.inject({ method: 'POST', url: '/api/satis/fisler', headers: h, payload: sale(depo.id, alici.id, mustahsil.id, cins.id, 5000, true) });
    expect(res.statusCode).toBe(201);
    const audit = (await app.inject({ method: 'GET', url: '/api/yonetim/audit?entity=satis_fisi', headers: h })).json();
    expect(audit.some((a: any) => a.action === 'risk_override')).toBe(true);
  });

  it('allows a sale within the limit', async () => {
    const { h, depo, cins, alici, mustahsil } = await setup(app, 10000);
    const res = await app.inject({ method: 'POST', url: '/api/satis/fisler', headers: h, payload: sale(depo.id, alici.id, mustahsil.id, cins.id, 5000) });
    expect(res.statusCode).toBe(201);
  });

  it('no limit (0) means unlimited', async () => {
    const { h, depo, cins, alici, mustahsil } = await setup(app, 0);
    const res = await app.inject({ method: 'POST', url: '/api/satis/fisler', headers: h, payload: sale(depo.id, alici.id, mustahsil.id, cins.id, 999999) });
    expect(res.statusCode).toBe(201);
  });
});
