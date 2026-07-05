import { describe, it, expect, beforeAll } from 'vitest';
import { getTestApp, newTenant, auth } from './helpers.js';
import type { FastifyInstance } from 'fastify';

async function base(app: FastifyInstance) {
  const t = await newTenant(app); const h = auth(t.token);
  const post = async (u: string, p: any) => (await app.inject({ method: 'POST', url: u, headers: h, payload: p })).json();
  await post('/api/params/isyeri', { kod: 'M', unvan: 'Hal', hksKomisyonOrani: 0.08, hksKomisyonKdvOrani: 0.2, hksGelirVergisiOrani: 0.02 });
  const depo = await post('/api/params/depolar', { kod: 'D', ad: 'D' });
  const kasa = await post('/api/params/kasalar', { kod: 'K', ad: 'K' });
  const cins = await post('/api/params/balik-cinsleri', { kod: 'H', ad: 'Hamsi', rusumOrani: 0.02 });
  const alici = await post('/api/params/cari-hesaplar', { kod: 'A', unvan: 'Manav', tip: 'ALICI' });
  const must = await post('/api/params/cari-hesaplar', { kod: 'M2', unvan: 'Balıkçı', tip: 'MUSTAHSIL' });
  return { t, h, post, depo, kasa, cins, alici, must };
}
const ekstre = async (app: FastifyInstance, h: any, id: string) => (await app.inject({ method: 'GET', url: `/api/cari/${id}/ekstre`, headers: h })).json();
const kasaBakiye = async (app: FastifyInstance, h: any, id: string) => (await app.inject({ method: 'GET', url: `/api/finans/kasa/${id}/durum`, headers: h })).json().bakiye;

describe('Audit fixes (Wave 5)', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await getTestApp(); });

  it('C1: card refund reverses cari + kasa postings', async () => {
    const { h, kasa, alici } = await base(app);
    const init = (await app.inject({ method: 'POST', url: '/api/odeme/baslat', headers: h, payload: { cariId: alici.id, tutar: 1000 } })).json();
    await app.inject({ method: 'POST', url: '/api/odeme/onayla', headers: h, payload: { odemeId: init.id, kasaId: kasa.id } });
    expect(await kasaBakiye(app, h, kasa.id)).toBe(1000);
    expect((await ekstre(app, h, alici.id)).kapanisBakiye).toBe(-1000);
    // refund
    await app.inject({ method: 'POST', url: `/api/odeme/${init.id}/iade`, headers: h });
    expect(await kasaBakiye(app, h, kasa.id)).toBe(0);
    expect((await ekstre(app, h, alici.id)).kapanisBakiye).toBe(0);
  });

  it('H1: bounced çek restores the receivable', async () => {
    const { h, alici } = await base(app);
    const cek = (await app.inject({ method: 'POST', url: '/api/finans/cekler', headers: h, payload: { yon: 'GIRIS', cariId: alici.id, cekNo: '55', tutar: 3000, tarih: '2026-01-10' } })).json();
    expect((await ekstre(app, h, alici.id)).kapanisBakiye).toBe(-3000); // receipt cleared debt
    await app.inject({ method: 'POST', url: `/api/finans/cekler/${cek.id}/durum`, headers: h, payload: { durum: 'KARSILIKSIZ' } });
    expect((await ekstre(app, h, alici.id)).kapanisBakiye).toBe(0); // debt restored
  });

  it('H1: collected çek records cash into the kasa', async () => {
    const { h, kasa, alici } = await base(app);
    const cek = (await app.inject({ method: 'POST', url: '/api/finans/cekler', headers: h, payload: { yon: 'GIRIS', cariId: alici.id, cekNo: '56', tutar: 2000, tarih: '2026-01-10' } })).json();
    await app.inject({ method: 'POST', url: `/api/finans/cekler/${cek.id}/durum`, headers: h, payload: { durum: 'TAHSILDE' } });
    await app.inject({ method: 'POST', url: `/api/finans/cekler/${cek.id}/durum`, headers: h, payload: { durum: 'ODENDI', kasaId: kasa.id } });
    expect(await kasaBakiye(app, h, kasa.id)).toBe(2000);
  });

  it('H2: komisyon KDV is persisted and the komisyon report reconciles', async () => {
    const { h, depo, cins, alici, must } = await base(app);
    await app.inject({ method: 'POST', url: '/api/satis/fisler', headers: h, payload: { tip: 'SATIS', tarih: '2026-01-10', aliciCariId: alici.id, mustahsilCariId: must.id, depoId: depo.id, odemeTipi: 'VERESIYE', satirlar: [{ balikCinsId: cins.id, miktar: 100, birimFiyat: 100 }] } });
    const rep = (await app.inject({ method: 'GET', url: '/api/rapor/komisyon', headers: h })).json();
    const tp = rep.toplam;
    expect(tp.komisyonKdv).toBe(160);
    // reconciles: brut - (komisyon + komisyonKdv + rusum + stopaj) = net
    expect(tp.brut - (tp.komisyon + tp.komisyonKdv + tp.rusum + tp.stopaj)).toBeCloseTo(tp.net, 2);
  });

  it('M1: mahsup is excluded from ciro', async () => {
    const { h, alici, must } = await base(app);
    await app.inject({ method: 'POST', url: '/api/cari/mahsup', headers: h, payload: { tarih: '2026-01-10', borcluCariId: alici.id, alacakliCariId: must.id, tutar: 5000 } });
    const ma = (await app.inject({ method: 'GET', url: '/api/rapor/mali-analiz', headers: h })).json();
    expect(ma.ciro).toBe(0); // only the mahsup exists; must not count as turnover
  });

  it('L1: FK validation rejects a foreign/nonexistent cari on tahsil', async () => {
    const { h, kasa } = await base(app);
    const res = await app.inject({ method: 'POST', url: '/api/finans/tahsil', headers: h, payload: { tarih: '2026-01-10', cariId: 'nonexistent', kasaId: kasa.id, tutar: 100 } });
    expect(res.statusCode).toBe(400);
  });

  it('M2-security: dashboard is RBAC-gated; ReadOnly cannot spoof notifications to others', async () => {
    const t = await newTenant(app); const adminH = auth(t.token);
    const u = (await app.inject({ method: 'POST', url: '/api/yonetim/kullanicilar', headers: adminH, payload: { email: `ro@${t.slug}.test`, fullName: 'Read Only', password: 'secret1', role: 'ReadOnly' } })).json();
    const login = (await app.inject({ method: 'POST', url: '/api/auth/login', payload: { tenantSlug: t.slug, email: `ro@${t.slug}.test`, password: 'secret1' } })).json();
    const roH = auth(login.token);
    // dashboard now runs an assertCan(rapor,read); ReadOnly has rapor:read -> 200
    expect((await app.inject({ method: 'GET', url: '/api/dashboard', headers: roH })).statusCode).toBe(200);
    // but ReadOnly cannot create a notification targeted at ANOTHER user (the admin) — needs yonetim:write
    void u;
    const spoof = await app.inject({ method: 'POST', url: '/api/bildirim', headers: roH, payload: { title: 'x', userId: t.userId } });
    expect(spoof.statusCode).toBe(403);
    // targeting self is fine
    const self = await app.inject({ method: 'POST', url: '/api/bildirim', headers: roH, payload: { title: 'kendime' } });
    expect(self.statusCode).toBe(201);
  });
});
