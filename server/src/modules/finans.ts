import type { FastifyInstance } from 'fastify';
import { and, eq, asc, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb, transaction } from '../db/index.js';
import * as s from '../db/schema.js';
import { assertCan } from '../core/rbac.js';
import { writeAudit } from '../core/audit.js';
import { badRequest, notFound } from '../core/errors.js';
import { round2 } from '../lib/money.js';
import { postCari, postKasa } from '../lib/ledger.js';

const CEK_TRANSITIONS: Record<string, string[]> = {
  PORTFOYDE: ['TAHSILDE', 'CIRO', 'KARSILIKSIZ'],
  TAHSILDE: ['ODENDI', 'KARSILIKSIZ', 'PORTFOYDE'],
  CIRO: ['ODENDI', 'KARSILIKSIZ'],
  KARSILIKSIZ: ['PORTFOYDE'],
  ODENDI: [],
};

export async function registerFinans(app: FastifyInstance) {
  // Tahsil: collect money from a cari into a kasa.
  const tahsilSchema = z.object({ tarih: z.string().min(1), cariId: z.string().min(1), kasaId: z.string().min(1), tutar: z.number().positive(), aciklama: z.string().optional() });
  app.post('/api/finans/tahsil', async (req, reply) => {
    assertCan(req.ctx.role, 'finans', 'write');
    const p = tahsilSchema.safeParse(req.body);
    if (!p.success) throw badRequest(p.error.issues.map((i) => i.message).join('; '));
    const db = getDb(); const tenantId = req.ctx.tenantId; const belgeId = nanoid();
    transaction(() => {
      postKasa(db, tenantId, { kasaId: p.data.kasaId, tarih: p.data.tarih, aciklama: p.data.aciklama || 'Tahsilat', giris: p.data.tutar, belgeTip: 'TAHSIL', belgeId });
      postCari(db, tenantId, { cariId: p.data.cariId, tarih: p.data.tarih, aciklama: p.data.aciklama || 'Tahsilat', alacak: p.data.tutar, belgeTip: 'TAHSIL', belgeId });
    });
    await writeAudit(db, req.ctx, 'tahsil', belgeId, 'post', null, p.data);
    reply.code(201); return { id: belgeId, ...p.data };
  });

  // Tediye: pay money to a cari from a kasa.
  app.post('/api/finans/tediye', async (req, reply) => {
    assertCan(req.ctx.role, 'finans', 'write');
    const p = tahsilSchema.safeParse(req.body);
    if (!p.success) throw badRequest(p.error.issues.map((i) => i.message).join('; '));
    const db = getDb(); const tenantId = req.ctx.tenantId; const belgeId = nanoid();
    transaction(() => {
      postKasa(db, tenantId, { kasaId: p.data.kasaId, tarih: p.data.tarih, aciklama: p.data.aciklama || 'Tediye', cikis: p.data.tutar, belgeTip: 'TEDIYE', belgeId });
      postCari(db, tenantId, { cariId: p.data.cariId, tarih: p.data.tarih, aciklama: p.data.aciklama || 'Tediye', borc: p.data.tutar, belgeTip: 'TEDIYE', belgeId });
    });
    await writeAudit(db, req.ctx, 'tediye', belgeId, 'post', null, p.data);
    reply.code(201); return { id: belgeId, ...p.data };
  });

  // Manual cash movement.
  const kasaIslemSchema = z.object({ tarih: z.string().min(1), kasaId: z.string().min(1), yon: z.enum(['GIRIS', 'CIKIS']), tutar: z.number().positive(), aciklama: z.string().optional() });
  app.post('/api/finans/kasa-islem', async (req, reply) => {
    assertCan(req.ctx.role, 'finans', 'write');
    const p = kasaIslemSchema.safeParse(req.body);
    if (!p.success) throw badRequest(p.error.issues.map((i) => i.message).join('; '));
    const db = getDb(); const belgeId = nanoid();
    transaction(() => {
      postKasa(db, req.ctx.tenantId, {
        kasaId: p.data.kasaId, tarih: p.data.tarih, aciklama: p.data.aciklama || 'Kasa işlem',
        giris: p.data.yon === 'GIRIS' ? p.data.tutar : 0, cikis: p.data.yon === 'CIKIS' ? p.data.tutar : 0,
        belgeTip: 'KASA', belgeId,
      });
    });
    reply.code(201); return { id: belgeId };
  });

  app.get('/api/finans/kasa/:kasaId/durum', async (req) => {
    assertCan(req.ctx.role, 'finans', 'read');
    const db = getDb(); const tenantId = req.ctx.tenantId;
    const { kasaId } = req.params as { kasaId: string };
    const [kasa] = await db.select().from(s.kasalar).where(and(eq(s.kasalar.tenantId, tenantId), eq(s.kasalar.id, kasaId)));
    if (!kasa) throw notFound();
    const hareketler = await db.select().from(s.kasaHareketler)
      .where(and(eq(s.kasaHareketler.tenantId, tenantId), eq(s.kasaHareketler.kasaId, kasaId)))
      .orderBy(asc(s.kasaHareketler.tarih), asc(s.kasaHareketler.createdAt));
    let bakiye = 0;
    const rows = hareketler.map((h) => { bakiye = round2(bakiye + h.giris - h.cikis); return { ...h, bakiye }; });
    return { kasa, hareketler: rows, bakiye };
  });

  // Kasa devir: snapshot closing balance to a new day (records a devir marker).
  app.post('/api/finans/kasa-devir', async (req, reply) => {
    assertCan(req.ctx.role, 'finans', 'write');
    const p = z.object({ kasaId: z.string().min(1), tarih: z.string().min(1) }).safeParse(req.body);
    if (!p.success) throw badRequest('Geçersiz istek');
    const db = getDb();
    const [kasa] = await db.select().from(s.kasalar).where(and(eq(s.kasalar.tenantId, req.ctx.tenantId), eq(s.kasalar.id, p.data.kasaId)));
    if (!kasa) throw notFound();
    return { kasaId: kasa.id, devirBakiye: kasa.bakiye, tarih: p.data.tarih };
  });

  // Masraf: expense paid from kasa.
  const masrafSchema = z.object({ tarih: z.string().min(1), masrafTuruId: z.string().optional(), kasaId: z.string().min(1), tutar: z.number().positive(), aciklama: z.string().optional() });
  app.post('/api/finans/masraf', async (req, reply) => {
    assertCan(req.ctx.role, 'finans', 'write');
    const p = masrafSchema.safeParse(req.body);
    if (!p.success) throw badRequest(p.error.issues.map((i) => i.message).join('; '));
    const db = getDb(); const tenantId = req.ctx.tenantId; const id = nanoid();
    transaction(() => {
      db.insert(s.masraflar).values({ id, tenantId, tarih: p.data.tarih, masrafTuruId: p.data.masrafTuruId ?? null, kasaId: p.data.kasaId, aciklama: p.data.aciklama ?? null, tutar: round2(p.data.tutar) }).run();
      postKasa(db, tenantId, { kasaId: p.data.kasaId, tarih: p.data.tarih, aciklama: p.data.aciklama || 'Masraf', cikis: p.data.tutar, belgeTip: 'MASRAF', belgeId: id });
    });
    await writeAudit(db, req.ctx, 'masraf', id, 'create', null, p.data);
    reply.code(201); return { id, ...p.data };
  });

  app.get('/api/finans/masraflar', async (req) => {
    assertCan(req.ctx.role, 'finans', 'read');
    const db = getDb();
    return db.select().from(s.masraflar).where(eq(s.masraflar.tenantId, req.ctx.tenantId)).orderBy(desc(s.masraflar.tarih));
  });

  // ---- Çek yönetimi ----
  const cekSchema = z.object({
    yon: z.enum(['GIRIS', 'CIKIS']), cariId: z.string().optional(), bankaId: z.string().optional(),
    cekNo: z.string().min(1), tutar: z.number().positive(), vadeTarihi: z.string().optional(),
    tarih: z.string().min(1),
  });
  app.post('/api/finans/cekler', async (req, reply) => {
    assertCan(req.ctx.role, 'finans', 'write');
    const p = cekSchema.safeParse(req.body);
    if (!p.success) throw badRequest(p.error.issues.map((i) => i.message).join('; '));
    const db = getDb(); const tenantId = req.ctx.tenantId; const id = nanoid();
    transaction(() => {
      db.insert(s.cekler).values({
        id, tenantId, yon: p.data.yon, cariId: p.data.cariId ?? null, bankaId: p.data.bankaId ?? null,
        cekNo: p.data.cekNo, tutar: round2(p.data.tutar), vadeTarihi: p.data.vadeTarihi ?? null, durum: 'PORTFOYDE',
      }).run();
      // A received cheque reduces the customer's receivable; an issued cheque reduces our payable.
      if (p.data.cariId) {
        if (p.data.yon === 'GIRIS') postCari(db, tenantId, { cariId: p.data.cariId, tarih: p.data.tarih, aciklama: `Çek ${p.data.cekNo}`, alacak: p.data.tutar, belgeTip: 'CEK', belgeId: id });
        else postCari(db, tenantId, { cariId: p.data.cariId, tarih: p.data.tarih, aciklama: `Çek ${p.data.cekNo}`, borc: p.data.tutar, belgeTip: 'CEK', belgeId: id });
      }
    });
    reply.code(201);
    const [row] = await db.select().from(s.cekler).where(and(eq(s.cekler.tenantId, tenantId), eq(s.cekler.id, id)));
    return row;
  });

  app.get('/api/finans/cekler', async (req) => {
    assertCan(req.ctx.role, 'finans', 'read');
    const db = getDb();
    const q = req.query as { durum?: string; yon?: string };
    const conds = [eq(s.cekler.tenantId, req.ctx.tenantId)];
    if (q.durum) conds.push(eq(s.cekler.durum, q.durum));
    if (q.yon) conds.push(eq(s.cekler.yon, q.yon));
    return db.select().from(s.cekler).where(and(...conds)).orderBy(asc(s.cekler.vadeTarihi));
  });

  app.post('/api/finans/cekler/:id/durum', async (req) => {
    assertCan(req.ctx.role, 'finans', 'write');
    const p = z.object({ durum: z.enum(['PORTFOYDE', 'TAHSILDE', 'CIRO', 'ODENDI', 'KARSILIKSIZ']) }).safeParse(req.body);
    if (!p.success) throw badRequest('Geçersiz durum');
    const db = getDb(); const tenantId = req.ctx.tenantId;
    const id = (req.params as { id: string }).id;
    const [cek] = await db.select().from(s.cekler).where(and(eq(s.cekler.tenantId, tenantId), eq(s.cekler.id, id)));
    if (!cek) throw notFound();
    const allowed = CEK_TRANSITIONS[cek.durum] ?? [];
    if (!allowed.includes(p.data.durum)) throw badRequest(`${cek.durum} → ${p.data.durum} geçişine izin yok`);
    await db.update(s.cekler).set({ durum: p.data.durum }).where(and(eq(s.cekler.tenantId, tenantId), eq(s.cekler.id, id)));
    await writeAudit(db, req.ctx, 'cek', id, 'update', cek, { ...cek, durum: p.data.durum });
    const [after] = await db.select().from(s.cekler).where(and(eq(s.cekler.tenantId, tenantId), eq(s.cekler.id, id)));
    return after;
  });

  app.get('/api/finans/cek-portfoy-durumu', async (req) => {
    assertCan(req.ctx.role, 'finans', 'read');
    const db = getDb();
    return db.select({ durum: s.cekler.durum, yon: s.cekler.yon, adet: sql<number>`count(*)`, toplam: sql<number>`round(sum(${s.cekler.tutar}),2)` })
      .from(s.cekler).where(eq(s.cekler.tenantId, req.ctx.tenantId)).groupBy(s.cekler.durum, s.cekler.yon);
  });
}
