import type { FastifyInstance } from 'fastify';
import { and, eq, asc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb, transaction } from '../db/index.js';
import * as s from '../db/schema.js';
import { assertCan } from '../core/rbac.js';
import { writeAudit } from '../core/audit.js';
import { badRequest, notFound } from '../core/errors.js';
import { round2 } from '../lib/money.js';
import { postStok } from '../lib/ledger.js';

async function currentQty(db: ReturnType<typeof getDb>, tenantId: string, depoId: string, balikCinsId: string): Promise<number> {
  const [row] = await db.select({ q: sql<number>`coalesce(sum(${s.stokHareketler.giris} - ${s.stokHareketler.cikis}),0)` })
    .from(s.stokHareketler)
    .where(and(eq(s.stokHareketler.tenantId, tenantId), eq(s.stokHareketler.depoId, depoId), eq(s.stokHareketler.balikCinsId, balikCinsId)));
  return row?.q ?? 0;
}

export async function registerStok(app: FastifyInstance) {
  // Balances per depo & species.
  app.get('/api/stok/bakiye', async (req) => {
    assertCan(req.ctx.role, 'stok', 'read');
    const db = getDb();
    const q = req.query as { depoId?: string };
    const conds = [eq(s.stokHareketler.tenantId, req.ctx.tenantId)];
    if (q.depoId) conds.push(eq(s.stokHareketler.depoId, q.depoId));
    return db.select({
      depoId: s.stokHareketler.depoId, balikCinsId: s.stokHareketler.balikCinsId,
      bakiye: sql<number>`sum(${s.stokHareketler.giris} - ${s.stokHareketler.cikis})`,
    }).from(s.stokHareketler).where(and(...conds)).groupBy(s.stokHareketler.depoId, s.stokHareketler.balikCinsId);
  });

  app.get('/api/stok/sorgu', async (req) => {
    assertCan(req.ctx.role, 'stok', 'read');
    const db = getDb();
    const q = req.query as { depoId?: string; balikCinsId?: string };
    const conds = [eq(s.stokHareketler.tenantId, req.ctx.tenantId)];
    if (q.depoId) conds.push(eq(s.stokHareketler.depoId, q.depoId));
    if (q.balikCinsId) conds.push(eq(s.stokHareketler.balikCinsId, q.balikCinsId));
    return db.select().from(s.stokHareketler).where(and(...conds)).orderBy(asc(s.stokHareketler.tarih));
  });

  // Stock ledger with running quantity.
  app.get('/api/stok/ekstre', async (req) => {
    assertCan(req.ctx.role, 'stok', 'read');
    const db = getDb();
    const q = req.query as { depoId: string; balikCinsId: string };
    if (!q.depoId || !q.balikCinsId) throw badRequest('depoId ve balikCinsId zorunlu');
    const hareketler = await db.select().from(s.stokHareketler)
      .where(and(eq(s.stokHareketler.tenantId, req.ctx.tenantId), eq(s.stokHareketler.depoId, q.depoId), eq(s.stokHareketler.balikCinsId, q.balikCinsId)))
      .orderBy(asc(s.stokHareketler.tarih), asc(s.stokHareketler.createdAt));
    let bakiye = 0;
    return hareketler.map((h: any) => { bakiye = round2(bakiye + h.giris - h.cikis); return { ...h, bakiye }; });
  });

  // Manual stock movement.
  const hareketSchema = z.object({ tarih: z.string().min(1), depoId: z.string().min(1), balikCinsId: z.string().min(1), yon: z.enum(['GIRIS', 'CIKIS']), miktar: z.number().positive(), birimMaliyet: z.number().min(0).optional() });
  app.post('/api/stok/hareket', async (req, reply) => {
    assertCan(req.ctx.role, 'stok', 'write');
    const p = hareketSchema.safeParse(req.body);
    if (!p.success) throw badRequest(p.error.issues.map((i) => i.message).join('; '));
    const tenantId = req.ctx.tenantId; const belgeId = nanoid();
    await transaction(async (tx) => {
      await postStok(tx, tenantId, {
        depoId: p.data.depoId, balikCinsId: p.data.balikCinsId, tarih: p.data.tarih,
        giris: p.data.yon === 'GIRIS' ? p.data.miktar : 0, cikis: p.data.yon === 'CIKIS' ? p.data.miktar : 0,
        birimMaliyet: p.data.birimMaliyet ?? 0, belgeTip: 'STOK_HAREKET', belgeId,
      });
    });
    reply.code(201); return { id: belgeId };
  });

  // Transfer between warehouses.
  const transferSchema = z.object({ tarih: z.string().min(1), kaynakDepoId: z.string().min(1), hedefDepoId: z.string().min(1), balikCinsId: z.string().min(1), miktar: z.number().positive() });
  app.post('/api/stok/transfer', async (req, reply) => {
    assertCan(req.ctx.role, 'stok', 'write');
    const p = transferSchema.safeParse(req.body);
    if (!p.success) throw badRequest(p.error.issues.map((i) => i.message).join('; '));
    if (p.data.kaynakDepoId === p.data.hedefDepoId) throw badRequest('Kaynak ve hedef depo aynı olamaz');
    const tenantId = req.ctx.tenantId; const belgeId = nanoid();
    await transaction(async (tx) => {
      await postStok(tx, tenantId, { depoId: p.data.kaynakDepoId, balikCinsId: p.data.balikCinsId, tarih: p.data.tarih, cikis: p.data.miktar, belgeTip: 'TRANSFER', belgeId });
      await postStok(tx, tenantId, { depoId: p.data.hedefDepoId, balikCinsId: p.data.balikCinsId, tarih: p.data.tarih, giris: p.data.miktar, belgeTip: 'TRANSFER', belgeId });
    });
    await writeAudit(getDb(), req.ctx, 'stok_transfer', belgeId, 'post', null, p.data);
    reply.code(201); return { id: belgeId };
  });

  // Count slip: reconcile to actual, posting the difference.
  const sayimSchema = z.object({ tarih: z.string().min(1), depoId: z.string().min(1), balikCinsId: z.string().min(1), sayilanMiktar: z.number().min(0) });
  app.post('/api/stok/sayim', async (req, reply) => {
    assertCan(req.ctx.role, 'stok', 'write');
    const p = sayimSchema.safeParse(req.body);
    if (!p.success) throw badRequest(p.error.issues.map((i) => i.message).join('; '));
    const db = getDb(); const tenantId = req.ctx.tenantId;
    const mevcut = await currentQty(db, tenantId, p.data.depoId, p.data.balikCinsId);
    const fark = round2(p.data.sayilanMiktar - mevcut);
    const belgeId = nanoid();
    if (fark !== 0) {
      await transaction(async (tx) => {
        await postStok(tx, tenantId, {
          depoId: p.data.depoId, balikCinsId: p.data.balikCinsId, tarih: p.data.tarih,
          giris: fark > 0 ? fark : 0, cikis: fark < 0 ? -fark : 0, belgeTip: 'SAYIM', belgeId,
        });
      });
    }
    await writeAudit(db, req.ctx, 'stok_sayim', belgeId, 'post', { mevcut }, { sayilan: p.data.sayilanMiktar, fark });
    reply.code(201); return { id: belgeId, mevcut, sayilan: p.data.sayilanMiktar, fark };
  });
}
