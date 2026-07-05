import type { FastifyInstance } from 'fastify';
import { and, eq, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb, transaction } from '../db/index.js';
import * as s from '../db/schema.js';
import { assertCan } from '../core/rbac.js';
import { writeAudit } from '../core/audit.js';
import { badRequest, notFound } from '../core/errors.js';
import { pageParams } from '../core/pagination.js';
import { assertOwned } from '../core/owned.js';
import { round2 } from '../lib/money.js';
import { postCari } from '../lib/ledger.js';

export async function registerCari(app: FastifyInstance) {
  // Account statement (ekstre) with running balance.
  app.get('/api/cari/:cariId/ekstre', async (req) => {
    assertCan(req.ctx.role, 'cari', 'read');
    const db = getDb();
    const tenantId = req.ctx.tenantId;
    const { cariId } = req.params as { cariId: string };
    const [cari] = await db.select().from(s.cariHesaplar).where(and(eq(s.cariHesaplar.tenantId, tenantId), eq(s.cariHesaplar.id, cariId)));
    if (!cari) throw notFound();
    const hareketler = await db.select().from(s.cariHareketler)
      .where(and(eq(s.cariHareketler.tenantId, tenantId), eq(s.cariHareketler.cariId, cariId)))
      .orderBy(asc(s.cariHareketler.tarih), asc(s.cariHareketler.createdAt));
    let bakiye = 0;
    const rows = hareketler.map((h: any) => {
      bakiye = round2(bakiye + h.borc - h.alacak);
      return { ...h, bakiye };
    });
    return { cari, hareketler: rows, kapanisBakiye: bakiye };
  });

  app.get('/api/cari/hareketler', async (req) => {
    assertCan(req.ctx.role, 'cari', 'read');
    const db = getDb();
    const q = req.query as { cariId?: string };
    const conds = [eq(s.cariHareketler.tenantId, req.ctx.tenantId)];
    if (q.cariId) conds.push(eq(s.cariHareketler.cariId, q.cariId));
    const { limit, offset } = pageParams(q, 500);
    return db.select().from(s.cariHareketler).where(and(...conds)).orderBy(asc(s.cariHareketler.tarih)).limit(limit).offset(offset);
  });

  // Mahsup fişi: offset entry between two accounts.
  const mahsupSchema = z.object({
    tarih: z.string().min(1),
    borcluCariId: z.string().min(1),
    alacakliCariId: z.string().min(1),
    tutar: z.number().positive(),
    aciklama: z.string().optional(),
  });

  app.post('/api/cari/mahsup', async (req, reply) => {
    assertCan(req.ctx.role, 'satis', 'write');
    const p = mahsupSchema.safeParse(req.body);
    if (!p.success) throw badRequest(p.error.issues.map((i) => i.message).join('; '));
    if (p.data.borcluCariId === p.data.alacakliCariId) throw badRequest('Borçlu ve alacaklı cari aynı olamaz');
    const db = getDb();
    const tenantId = req.ctx.tenantId;
    await assertOwned(db, s.cariHesaplar, tenantId, p.data.borcluCariId, 'Borçlu cari');
    await assertOwned(db, s.cariHesaplar, tenantId, p.data.alacakliCariId, 'Alacaklı cari');
    const fisId = nanoid();
    const no = `MH-${nanoid(8).toUpperCase()}`;
    await transaction(async (tx) => {
      await tx.insert(s.fisler).values({
        id: fisId, tenantId, tip: 'MAHSUP', no, tarih: p.data.tarih,
        brutTutar: round2(p.data.tutar), netTutar: round2(p.data.tutar), durum: 'ISLENDI',
      });
      await postCari(tx, tenantId, { cariId: p.data.borcluCariId, tarih: p.data.tarih, aciklama: p.data.aciklama || `Mahsup ${no}`, borc: p.data.tutar, belgeTip: 'MAHSUP', belgeId: fisId });
      await postCari(tx, tenantId, { cariId: p.data.alacakliCariId, tarih: p.data.tarih, aciklama: p.data.aciklama || `Mahsup ${no}`, alacak: p.data.tutar, belgeTip: 'MAHSUP', belgeId: fisId });
    });
    await writeAudit(db, req.ctx, 'mahsup_fisi', fisId, 'post', null, { no, ...p.data });
    reply.code(201);
    return { id: fisId, no };
  });
}
