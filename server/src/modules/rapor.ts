import type { FastifyInstance } from 'fastify';
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import * as s from '../db/schema.js';
import { assertCan } from '../core/rbac.js';
import { toCsv } from '../lib/export.js';
import { badRequest } from '../core/errors.js';

function dateConds(table: any, q: { baslangic?: string; bitis?: string }) {
  const c: any[] = [];
  if (q.baslangic) c.push(sql`${table.tarih} >= ${q.baslangic}`);
  if (q.bitis) c.push(sql`${table.tarih} <= ${q.bitis}`);
  return c;
}

export async function registerRapor(app: FastifyInstance) {
  // Commission report: total komisyon/rüsum/stopaj/net over posted sales.
  app.get('/api/rapor/komisyon', async (req) => {
    assertCan(req.ctx.role, 'rapor', 'read');
    const db = getDb();
    const q = req.query as any;
    const rows = await db.select({
      no: s.fisler.no, tarih: s.fisler.tarih, brut: s.fisler.brutTutar, komisyon: s.fisler.komisyonTutar,
      rusum: s.fisler.rusumTutar, stopaj: s.fisler.stopajTutar, net: s.fisler.netTutar,
    }).from(s.fisler).where(and(eq(s.fisler.tenantId, req.ctx.tenantId), eq(s.fisler.durum, 'ISLENDI'), eq(s.fisler.tip, 'SATIS'), ...dateConds(s.fisler, q)));
    const toplam = rows.reduce((a: any, r: any) => ({
      brut: a.brut + r.brut, komisyon: a.komisyon + r.komisyon, rusum: a.rusum + r.rusum, stopaj: a.stopaj + r.stopaj, net: a.net + r.net,
    }), { brut: 0, komisyon: 0, rusum: 0, stopaj: 0, net: 0 });
    return { satirlar: rows, toplam };
  });

  // Trial balance (mizan): per cari debit/credit/balance.
  app.get('/api/rapor/mizan', async (req) => {
    assertCan(req.ctx.role, 'rapor', 'read');
    const db = getDb();
    return db.select({
      cariId: s.cariHareketler.cariId,
      borc: sql<number>`coalesce(sum(${s.cariHareketler.borc}),0)`,
      alacak: sql<number>`coalesce(sum(${s.cariHareketler.alacak}),0)`,
      bakiye: sql<number>`coalesce(sum(${s.cariHareketler.borc} - ${s.cariHareketler.alacak}),0)`,
    }).from(s.cariHareketler).where(eq(s.cariHareketler.tenantId, req.ctx.tenantId)).groupBy(s.cariHareketler.cariId);
  });

  // Average purchase cost per species (from stock inflows carrying birimMaliyet).
  app.get('/api/rapor/ortalama-maliyet', async (req) => {
    assertCan(req.ctx.role, 'rapor', 'read');
    const db = getDb();
    return db.select({
      balikCinsId: s.stokHareketler.balikCinsId,
      toplamGiris: sql<number>`coalesce(sum(${s.stokHareketler.giris}),0)`,
      ortalamaMaliyet: sql<number>`case when sum(${s.stokHareketler.giris})>0 then sum(${s.stokHareketler.giris} * ${s.stokHareketler.birimMaliyet})/sum(${s.stokHareketler.giris}) else 0 end`,
    }).from(s.stokHareketler).where(and(eq(s.stokHareketler.tenantId, req.ctx.tenantId), sql`${s.stokHareketler.giris} > 0`)).groupBy(s.stokHareketler.balikCinsId);
  });

  // Financial dashboard: ciro, tahsilat, açık veresiye, kasa toplam.
  app.get('/api/rapor/mali-analiz', async (req) => {
    assertCan(req.ctx.role, 'rapor', 'read');
    const db = getDb(); const tid = req.ctx.tenantId;
    const [ciro] = await db.select({ v: sql<number>`coalesce(sum(${s.fisler.brutTutar}),0)` }).from(s.fisler).where(and(eq(s.fisler.tenantId, tid), eq(s.fisler.durum, 'ISLENDI')));
    const [tahsilat] = await db.select({ v: sql<number>`coalesce(sum(${s.kasaHareketler.giris}),0)` }).from(s.kasaHareketler).where(eq(s.kasaHareketler.tenantId, tid));
    const [kasa] = await db.select({ v: sql<number>`coalesce(sum(${s.kasalar.bakiye}),0)` }).from(s.kasalar).where(eq(s.kasalar.tenantId, tid));
    const [veresiye] = await db.select({ v: sql<number>`coalesce(sum(case when ${s.cariHesaplar.bakiye} > 0 and ${s.cariHesaplar.tip}='ALICI' then ${s.cariHesaplar.bakiye} else 0 end),0)` }).from(s.cariHesaplar).where(eq(s.cariHesaplar.tenantId, tid));
    return { ciro: ciro.v, tahsilat: tahsilat.v, kasaToplam: kasa.v, acikVeresiye: veresiye.v };
  });

  // Seller / collector report: collections grouped by cari (tahsilatçı role usage).
  app.get('/api/rapor/satici-tahsilatci', async (req) => {
    assertCan(req.ctx.role, 'rapor', 'read');
    const db = getDb();
    return db.select({
      cariId: s.cariHareketler.cariId,
      tahsilat: sql<number>`coalesce(sum(case when ${s.cariHareketler.belgeTip} in ('TAHSIL','ODEME') then ${s.cariHareketler.alacak} else 0 end),0)`,
    }).from(s.cariHareketler).where(eq(s.cariHareketler.tenantId, req.ctx.tenantId)).groupBy(s.cariHareketler.cariId);
  });

  // Daily analysis: sales totals per day.
  app.get('/api/rapor/gunluk-analiz', async (req) => {
    assertCan(req.ctx.role, 'rapor', 'read');
    const db = getDb();
    return db.select({
      tarih: s.fisler.tarih, adet: sql<number>`cast(count(*) as integer)`, brut: sql<number>`coalesce(sum(${s.fisler.brutTutar}),0)`,
    }).from(s.fisler).where(and(eq(s.fisler.tenantId, req.ctx.tenantId), eq(s.fisler.durum, 'ISLENDI'))).groupBy(s.fisler.tarih);
  });

  // Generic CSV export for any of the above report/list datasets.
  app.get('/api/rapor/export', async (req, reply) => {
    assertCan(req.ctx.role, 'rapor', 'read');
    const q = req.query as { rapor?: string };
    const db = getDb(); const tid = req.ctx.tenantId;
    let rows: Record<string, unknown>[] = [];
    if (q.rapor === 'mizan') {
      rows = await db.select({ cariId: s.cariHareketler.cariId, borc: sql<number>`coalesce(sum(${s.cariHareketler.borc}),0)`, alacak: sql<number>`coalesce(sum(${s.cariHareketler.alacak}),0)` }).from(s.cariHareketler).where(eq(s.cariHareketler.tenantId, tid)).groupBy(s.cariHareketler.cariId);
    } else if (q.rapor === 'komisyon') {
      rows = await db.select({ no: s.fisler.no, tarih: s.fisler.tarih, brut: s.fisler.brutTutar, komisyon: s.fisler.komisyonTutar, net: s.fisler.netTutar }).from(s.fisler).where(and(eq(s.fisler.tenantId, tid), eq(s.fisler.durum, 'ISLENDI'), eq(s.fisler.tip, 'SATIS')));
    } else {
      throw badRequest('Bilinmeyen rapor: mizan|komisyon');
    }
    reply.header('content-type', 'text/csv; charset=utf-8');
    reply.header('content-disposition', `attachment; filename="${q.rapor}.csv"`);
    return toCsv(rows);
  });
}
