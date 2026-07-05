import type { FastifyInstance } from 'fastify';
import { and, eq, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb, transaction, type DB } from '../db/index.js';
import * as s from '../db/schema.js';
import { assertCan } from '../core/rbac.js';
import { writeAudit } from '../core/audit.js';
import { badRequest, notFound } from '../core/errors.js';
import { round2, sum } from '../lib/money.js';
import { postCari, postKasa, postStok, reverseDocument } from '../lib/ledger.js';

const satirSchema = z.object({
  balikCinsId: z.string().min(1),
  kapAdet: z.number().min(0).optional(),
  miktar: z.number().positive('Miktar 0 dan büyük olmalı'),
  birimFiyat: z.number().min(0),
});

const createSchema = z.object({
  tip: z.enum(['SATIS', 'ALIS_SATIS']).default('SATIS'),
  no: z.string().optional(),
  tarih: z.string().min(1),
  aliciCariId: z.string().min(1, 'Alıcı zorunlu'),
  mustahsilCariId: z.string().optional(),
  kunyeNo: z.string().optional(),
  depoId: z.string().min(1, 'Depo zorunlu'),
  kasaId: z.string().optional(),
  odemeTipi: z.enum(['PESIN', 'VERESIYE', 'KART']).default('VERESIYE'),
  riskOnay: z.boolean().optional(),
  satirlar: z.array(satirSchema).min(1, 'En az bir satır gerekli'),
});

interface Totals {
  brut: number; komisyon: number; komisyonKdv: number; rusum: number; stopaj: number; net: number;
  lines: { balikCinsId: string; kapAdet: number; miktar: number; birimFiyat: number; tutar: number; rusumOrani: number }[];
}

async function computeTotals(db: DB, tenantId: string, tip: string, satirlar: z.infer<typeof satirSchema>[]): Promise<Totals> {
  const [isyeri] = await db.select().from(s.isyeri).where(eq(s.isyeri.tenantId, tenantId));
  const komisyonOrani = isyeri?.hksKomisyonOrani ?? 0.08;
  const komisyonKdvOrani = isyeri?.hksKomisyonKdvOrani ?? 0.2;
  const gvOrani = isyeri?.hksGelirVergisiOrani ?? 0.02;

  const lines = [] as Totals['lines'];
  for (const l of satirlar) {
    const [cins] = await db.select().from(s.balikCinsleri)
      .where(and(eq(s.balikCinsleri.tenantId, tenantId), eq(s.balikCinsleri.id, l.balikCinsId)));
    if (!cins) throw badRequest(`Balık cinsi bulunamadı: ${l.balikCinsId}`);
    const tutar = round2(l.miktar * l.birimFiyat);
    lines.push({ balikCinsId: l.balikCinsId, kapAdet: l.kapAdet ?? 0, miktar: l.miktar, birimFiyat: l.birimFiyat, tutar, rusumOrani: cins.rusumOrani });
  }

  const brut = sum(lines.map((l) => l.tutar));
  if (tip === 'ALIS_SATIS') return { brut, komisyon: 0, komisyonKdv: 0, rusum: 0, stopaj: 0, net: brut, lines };
  const komisyon = round2(brut * komisyonOrani);
  const komisyonKdv = round2(komisyon * komisyonKdvOrani);
  const stopaj = round2(brut * gvOrani);
  const rusum = sum(lines.map((l) => l.tutar * l.rusumOrani));
  const net = round2(brut - komisyon - komisyonKdv - stopaj - rusum);
  return { brut, komisyon, komisyonKdv, rusum, stopaj, net, lines };
}

async function loadFis(db: DB, tenantId: string, id: string) {
  const [fis] = await db.select().from(s.fisler).where(and(eq(s.fisler.tenantId, tenantId), eq(s.fisler.id, id)));
  if (!fis) throw notFound();
  const satirlar = await db.select().from(s.fisSatirlari).where(and(eq(s.fisSatirlari.tenantId, tenantId), eq(s.fisSatirlari.fisId, id)));
  return { ...fis, satirlar };
}

export async function registerSatis(app: FastifyInstance) {
  app.post('/api/satis/fisler', async (req, reply) => {
    assertCan(req.ctx.role, 'satis', 'write');
    const p = createSchema.safeParse(req.body);
    if (!p.success) throw badRequest(p.error.issues.map((i) => i.message).join('; '));
    const data = p.data;
    if (data.tip === 'SATIS' && !data.mustahsilCariId) throw badRequest('Komisyon satışında müstahsil zorunlu');
    if (data.odemeTipi === 'PESIN' && !data.kasaId) throw badRequest('Peşin satışta kasa zorunlu');
    const db = getDb();
    const tenantId = req.ctx.tenantId;

    const fisId = nanoid();
    const totals = await computeTotals(db, tenantId, data.tip, data.satirlar);
    const no = data.no || `SF-${nanoid(8).toUpperCase()}`;

    // Invariant: müstahsil net payment cannot be negative (deductions exceed gross).
    if (data.tip === 'SATIS' && totals.net < 0) {
      throw badRequest(`Kesintiler brüt tutarı aşıyor; müstahsil neti negatif (${totals.net}). Rüsum/komisyon oranlarını kontrol edin.`);
    }

    if (data.odemeTipi === 'VERESIYE' && !data.riskOnay) {
      const [alici] = await db.select().from(s.cariHesaplar).where(and(eq(s.cariHesaplar.tenantId, tenantId), eq(s.cariHesaplar.id, data.aliciCariId)));
      if (alici && alici.riskLimiti > 0 && alici.bakiye + totals.brut > alici.riskLimiti) {
        throw badRequest(`Risk limiti aşılıyor (limit ${alici.riskLimiti}, mevcut ${alici.bakiye}, yeni ${totals.brut}). Onay için riskOnay=true gönderin.`);
      }
    }

    await transaction(async (tx) => {
      await tx.insert(s.fisler).values({
        id: fisId, tenantId, tip: data.tip, no, tarih: data.tarih,
        aliciCariId: data.aliciCariId, mustahsilCariId: data.mustahsilCariId ?? null,
        kunyeNo: data.kunyeNo ?? null, depoId: data.depoId, kasaId: data.kasaId ?? null,
        odemeTipi: data.odemeTipi, brutTutar: totals.brut, komisyonTutar: totals.komisyon,
        rusumTutar: totals.rusum, stopajTutar: totals.stopaj, tevkifatTutar: 0,
        netTutar: totals.net, durum: 'ISLENDI',
      });
      for (const l of totals.lines) {
        await tx.insert(s.fisSatirlari).values({
          id: nanoid(), tenantId, fisId, balikCinsId: l.balikCinsId,
          kapAdet: l.kapAdet, miktar: l.miktar, birimFiyat: l.birimFiyat, tutar: l.tutar,
        });
        await postStok(tx, tenantId, { depoId: data.depoId, balikCinsId: l.balikCinsId, tarih: data.tarih, cikis: l.miktar, belgeTip: 'SATIS', belgeId: fisId });
      }
      await postCari(tx, tenantId, { cariId: data.aliciCariId, tarih: data.tarih, aciklama: `Satış ${no}`, borc: totals.brut, belgeTip: 'SATIS', belgeId: fisId });
      if (data.tip === 'SATIS' && data.mustahsilCariId) {
        await postCari(tx, tenantId, { cariId: data.mustahsilCariId, tarih: data.tarih, aciklama: `Müstahsil hakedişi ${no}`, alacak: totals.net, belgeTip: 'SATIS', belgeId: fisId });
      }
      if (data.odemeTipi === 'PESIN' && data.kasaId) {
        await postKasa(tx, tenantId, { kasaId: data.kasaId, tarih: data.tarih, aciklama: `Satış tahsilat ${no}`, giris: totals.brut, belgeTip: 'SATIS', belgeId: fisId });
        await postCari(tx, tenantId, { cariId: data.aliciCariId, tarih: data.tarih, aciklama: `Peşin tahsilat ${no}`, alacak: totals.brut, belgeTip: 'SATIS', belgeId: fisId });
      }
    });

    const fis = await loadFis(db, tenantId, fisId);
    await writeAudit(db, req.ctx, 'satis_fisi', fisId, 'post', null, fis);
    if (data.odemeTipi === 'VERESIYE' && data.riskOnay) {
      await writeAudit(db, req.ctx, 'satis_fisi', fisId, 'risk_override', null, { aliciCariId: data.aliciCariId, brut: totals.brut });
    }
    reply.code(201);
    return fis;
  });

  app.get('/api/satis/fisler', async (req) => {
    assertCan(req.ctx.role, 'satis', 'read');
    const db = getDb();
    const q = req.query as { tip?: string; baslangic?: string; bitis?: string };
    const conds = [eq(s.fisler.tenantId, req.ctx.tenantId)];
    if (q.tip) conds.push(eq(s.fisler.tip, q.tip));
    if (q.baslangic) conds.push(sql`${s.fisler.tarih} >= ${q.baslangic}`);
    if (q.bitis) conds.push(sql`${s.fisler.tarih} <= ${q.bitis}`);
    return db.select().from(s.fisler).where(and(...conds)).orderBy(desc(s.fisler.tarih));
  });

  app.get('/api/satis/fisler/:id', async (req) => {
    assertCan(req.ctx.role, 'satis', 'read');
    return loadFis(getDb(), req.ctx.tenantId, (req.params as { id: string }).id);
  });

  app.post('/api/satis/fisler/:id/iptal', async (req) => {
    assertCan(req.ctx.role, 'satis', 'delete');
    const db = getDb();
    const tenantId = req.ctx.tenantId;
    const id = (req.params as { id: string }).id;
    const before = await loadFis(db, tenantId, id);
    if (before.durum === 'IPTAL') throw badRequest('Fiş zaten iptal edilmiş');
    await transaction(async (tx) => {
      await reverseDocument(tx, tenantId, id);
      await tx.update(s.fisler).set({ durum: 'IPTAL' }).where(and(eq(s.fisler.tenantId, tenantId), eq(s.fisler.id, id)));
    });
    const after = await loadFis(db, tenantId, id);
    await writeAudit(db, req.ctx, 'satis_fisi', id, 'cancel', before, after);
    return after;
  });

  app.get('/api/satis/satis-listesi', async (req) => {
    assertCan(req.ctx.role, 'satis', 'read');
    const db = getDb();
    return db.select({
      fisId: s.fisler.id, no: s.fisler.no, tarih: s.fisler.tarih, tip: s.fisler.tip, durum: s.fisler.durum,
      balikCinsId: s.fisSatirlari.balikCinsId, miktar: s.fisSatirlari.miktar,
      birimFiyat: s.fisSatirlari.birimFiyat, tutar: s.fisSatirlari.tutar,
    }).from(s.fisSatirlari)
      .innerJoin(s.fisler, eq(s.fisSatirlari.fisId, s.fisler.id))
      .where(and(eq(s.fisSatirlari.tenantId, req.ctx.tenantId), eq(s.fisler.durum, 'ISLENDI')))
      .orderBy(desc(s.fisler.tarih));
  });

  app.get('/api/satis/gunluk-gelen-balik', async (req) => {
    assertCan(req.ctx.role, 'satis', 'read');
    const db = getDb();
    return db.select({
      tarih: s.fisler.tarih, balikCinsId: s.fisSatirlari.balikCinsId,
      toplamMiktar: sql<number>`coalesce(sum(${s.fisSatirlari.miktar}),0)`,
      toplamTutar: sql<number>`coalesce(sum(${s.fisSatirlari.tutar}),0)`,
    }).from(s.fisSatirlari)
      .innerJoin(s.fisler, eq(s.fisSatirlari.fisId, s.fisler.id))
      .where(and(eq(s.fisSatirlari.tenantId, req.ctx.tenantId), eq(s.fisler.durum, 'ISLENDI')))
      .groupBy(s.fisler.tarih, s.fisSatirlari.balikCinsId);
  });
}
