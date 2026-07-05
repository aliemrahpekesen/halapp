import type { FastifyInstance } from 'fastify';
import { and, eq, asc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { registerCrud } from '../core/crud.js';
import { getDb } from '../db/index.js';
import * as s from '../db/schema.js';
import { assertCan } from '../core/rbac.js';
import { writeAudit } from '../core/audit.js';
import { badRequest, notFound } from '../core/errors.js';
import { round2 } from '../lib/money.js';

/**
 * Boş kasa / ambalaj (crate deposit) tracking — the sector's biggest invisible
 * loss item. Tracks crates given to and returned by each customer, their
 * outstanding balance, and optional deposit valuation.
 */
export async function registerAmbalaj(app: FastifyInstance) {
  registerCrud(app, {
    table: s.ambalajTurleri, page: 'stok', entity: 'ambalaj_turu',
    basePath: '/api/ambalaj/turleri',
    createSchema: z.object({ kod: z.string().min(1), ad: z.string().min(1), depozito: z.number().min(0).optional() }),
  });

  const hareketSchema = z.object({
    tarih: z.string().min(1), cariId: z.string().min(1), ambalajTuruId: z.string().min(1),
    yon: z.enum(['VERILEN', 'IADE']), adet: z.number().positive(), aciklama: z.string().optional(),
  });

  app.post('/api/ambalaj/hareket', async (req, reply) => {
    assertCan(req.ctx.role, 'stok', 'write');
    const p = hareketSchema.safeParse(req.body);
    if (!p.success) throw badRequest(p.error.issues.map((i) => i.message).join('; '));
    const db = getDb(); const id = nanoid();
    await db.insert(s.ambalajHareketler).values({
      id, tenantId: req.ctx.tenantId, cariId: p.data.cariId, ambalajTuruId: p.data.ambalajTuruId, tarih: p.data.tarih,
      verilen: p.data.yon === 'VERILEN' ? p.data.adet : 0, iade: p.data.yon === 'IADE' ? p.data.adet : 0,
      aciklama: p.data.aciklama ?? null, belgeTip: 'MANUEL', belgeId: id,
    });
    await writeAudit(db, req.ctx, 'ambalaj_hareket', id, 'create', null, p.data);
    reply.code(201); return { id };
  });

  // Outstanding crate balances per customer & type (verilen - iade > 0 = customer holds).
  app.get('/api/ambalaj/bakiye', async (req) => {
    assertCan(req.ctx.role, 'stok', 'read');
    const db = getDb();
    const q = req.query as { cariId?: string };
    const conds = [eq(s.ambalajHareketler.tenantId, req.ctx.tenantId)];
    if (q.cariId) conds.push(eq(s.ambalajHareketler.cariId, q.cariId));
    return db.select({
      cariId: s.ambalajHareketler.cariId,
      ambalajTuruId: s.ambalajHareketler.ambalajTuruId,
      bakiye: sql<number>`coalesce(sum(${s.ambalajHareketler.verilen} - ${s.ambalajHareketler.iade}),0)`,
    }).from(s.ambalajHareketler).where(and(...conds))
      .groupBy(s.ambalajHareketler.cariId, s.ambalajHareketler.ambalajTuruId)
      .having(sql`coalesce(sum(${s.ambalajHareketler.verilen} - ${s.ambalajHareketler.iade}),0) <> 0`);
  });

  // Ledger for one customer.
  app.get('/api/ambalaj/cari/:cariId', async (req) => {
    assertCan(req.ctx.role, 'stok', 'read');
    const db = getDb(); const tenantId = req.ctx.tenantId;
    const { cariId } = req.params as { cariId: string };
    const [cari] = await db.select().from(s.cariHesaplar).where(and(eq(s.cariHesaplar.tenantId, tenantId), eq(s.cariHesaplar.id, cariId)));
    if (!cari) throw notFound();
    const hareketler = await db.select().from(s.ambalajHareketler)
      .where(and(eq(s.ambalajHareketler.tenantId, tenantId), eq(s.ambalajHareketler.cariId, cariId)))
      .orderBy(asc(s.ambalajHareketler.tarih), asc(s.ambalajHareketler.createdAt)).limit(500);
    let bakiye = 0;
    const rows = hareketler.map((h: any) => { bakiye = round2(bakiye + h.verilen - h.iade); return { ...h, bakiye }; });
    return { cari, hareketler: rows, acikKap: bakiye };
  });
}
