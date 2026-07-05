import type { FastifyInstance } from 'fastify';
import { and, eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb, transaction } from '../db/index.js';
import * as s from '../db/schema.js';
import { assertCan } from '../core/rbac.js';
import { writeAudit } from '../core/audit.js';
import { badRequest, notFound } from '../core/errors.js';
import { round2 } from '../lib/money.js';
import { postCari, postKasa } from '../lib/ledger.js';
import { getPaymentProvider } from '../providers/odeme.js';

export async function registerOdeme(app: FastifyInstance) {
  // Initialize a card payment (mock gateway).
  const initSchema = z.object({ cariId: z.string().min(1), posId: z.string().optional(), tutar: z.number().positive(), cardNumber: z.string().optional() });
  app.post('/api/odeme/baslat', async (req, reply) => {
    assertCan(req.ctx.role, 'odeme', 'write');
    const p = initSchema.safeParse(req.body);
    if (!p.success) throw badRequest(p.error.issues.map((i) => i.message).join('; '));
    const db = getDb();
    const provider = getPaymentProvider();
    const init = await provider.initialize({ amount: p.data.tutar, cardNumber: p.data.cardNumber });
    const id = nanoid();
    await db.insert(s.odemeler).values({ id, tenantId: req.ctx.tenantId, cariId: p.data.cariId, posId: p.data.posId ?? null, token: init.token, tutar: round2(p.data.tutar), durum: 'BASLATILDI', saglayici: provider.name });
    reply.code(201);
    return { id, token: init.token, durum: init.durum };
  });

  // Confirm the payment; on success post to cari (collection) + kasa/pos.
  const confirmSchema = z.object({ odemeId: z.string().min(1), kasaId: z.string().min(1), force: z.enum(['success', 'fail']).optional(), tarih: z.string().optional() });
  app.post('/api/odeme/onayla', async (req) => {
    assertCan(req.ctx.role, 'odeme', 'write');
    const p = confirmSchema.safeParse(req.body);
    if (!p.success) throw badRequest(p.error.issues.map((i) => i.message).join('; '));
    const db = getDb(); const tenantId = req.ctx.tenantId;
    const [odeme] = await db.select().from(s.odemeler).where(and(eq(s.odemeler.tenantId, tenantId), eq(s.odemeler.id, p.data.odemeId)));
    if (!odeme) throw notFound('Ödeme bulunamadı');
    if (odeme.durum !== 'BASLATILDI') throw badRequest('Ödeme zaten sonuçlanmış');

    const provider = getPaymentProvider();
    const result = await provider.confirm(odeme.token!, { force: p.data.force });
    const tarih = p.data.tarih || new Date().toISOString().slice(0, 10);

    if (!result.success) {
      await db.update(s.odemeler).set({ durum: 'BASARISIZ' }).where(and(eq(s.odemeler.tenantId, tenantId), eq(s.odemeler.id, odeme.id)));
      await writeAudit(db, req.ctx, 'odeme', odeme.id, 'fail', null, { durum: 'BASARISIZ' });
      return { id: odeme.id, durum: 'BASARISIZ', message: result.message };
    }

    await transaction(async (tx) => {
      await tx.update(s.odemeler).set({ durum: 'BASARILI' }).where(and(eq(s.odemeler.tenantId, tenantId), eq(s.odemeler.id, odeme.id)));
      // Card collection: cash into kasa + reduce customer receivable.
      await postKasa(tx, tenantId, { kasaId: p.data.kasaId, tarih, aciklama: 'Kart tahsilat', giris: odeme.tutar, belgeTip: 'ODEME', belgeId: odeme.id });
      if (odeme.cariId) await postCari(tx, tenantId, { cariId: odeme.cariId, tarih, aciklama: 'Kart tahsilat', alacak: odeme.tutar, belgeTip: 'ODEME', belgeId: odeme.id });
    });
    await writeAudit(db, req.ctx, 'odeme', odeme.id, 'success', null, { durum: 'BASARILI', tutar: odeme.tutar });
    return { id: odeme.id, durum: 'BASARILI', message: result.message };
  });

  app.post('/api/odeme/:id/iade', async (req) => {
    assertCan(req.ctx.role, 'odeme', 'write');
    const db = getDb(); const tenantId = req.ctx.tenantId;
    const id = (req.params as { id: string }).id;
    const [odeme] = await db.select().from(s.odemeler).where(and(eq(s.odemeler.tenantId, tenantId), eq(s.odemeler.id, id)));
    if (!odeme) throw notFound();
    if (odeme.durum !== 'BASARILI') throw badRequest('Sadece başarılı ödemeler iade edilebilir');
    const provider = getPaymentProvider();
    await provider.refund(odeme.token!);
    await db.update(s.odemeler).set({ durum: 'IADE' }).where(and(eq(s.odemeler.tenantId, tenantId), eq(s.odemeler.id, id)));
    await writeAudit(db, req.ctx, 'odeme', id, 'refund', odeme, { durum: 'IADE' });
    return { id, durum: 'IADE' };
  });

  app.get('/api/odeme', async (req) => {
    assertCan(req.ctx.role, 'odeme', 'read');
    const db = getDb();
    return db.select().from(s.odemeler).where(eq(s.odemeler.tenantId, req.ctx.tenantId)).orderBy(desc(s.odemeler.createdAt));
  });
}
