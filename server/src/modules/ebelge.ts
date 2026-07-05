import type { FastifyInstance } from 'fastify';
import { and, eq, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import * as s from '../db/schema.js';
import { assertCan } from '../core/rbac.js';
import { writeAudit } from '../core/audit.js';
import { badRequest, notFound } from '../core/errors.js';
import { getEbelgeProvider, type EbelgeDoc } from '../providers/ebelge.js';

// In Phase 1 provider settings are mock; stored per-tenant in memory.
const settingsStore = new Map<string, Record<string, unknown>>();
const defaultSettings = () => ({ saglayici: 'UYUMSOFT_MOCK', kullaniciAdi: 'mock_user', sifre: '***', seri: 'HAL', testMod: true });

export async function registerEbelge(app: FastifyInstance) {
  const gonderSchema = z.object({
    tur: z.enum(['EFATURA', 'EMUSTAHSIL', 'EIRSALIYE']),
    fisId: z.string().optional(),
    cariId: z.string().optional(),
    tutar: z.number().min(0).optional(),
  });

  app.post('/api/ebelge/gonder', async (req, reply) => {
    assertCan(req.ctx.role, 'ebelge', 'write');
    const p = gonderSchema.safeParse(req.body);
    if (!p.success) throw badRequest(p.error.issues.map((i) => i.message).join('; '));
    const db = getDb(); const tenantId = req.ctx.tenantId;

    let tutar = p.data.tutar ?? 0;
    let aliciUnvan: string | undefined;
    let kalemler: EbelgeDoc['kalemler'] = [];
    if (p.data.fisId) {
      const [fis] = await db.select().from(s.fisler).where(and(eq(s.fisler.tenantId, tenantId), eq(s.fisler.id, p.data.fisId)));
      if (!fis) throw notFound('Fiş bulunamadı');
      tutar = fis.brutTutar;
      const satirlar = await db.select().from(s.fisSatirlari).where(and(eq(s.fisSatirlari.tenantId, tenantId), eq(s.fisSatirlari.fisId, fis.id)));
      kalemler = satirlar.map((l) => ({ ad: l.balikCinsId, miktar: l.miktar, birimFiyat: l.birimFiyat, tutar: l.tutar }));
      if (fis.aliciCariId) {
        const [cari] = await db.select().from(s.cariHesaplar).where(and(eq(s.cariHesaplar.tenantId, tenantId), eq(s.cariHesaplar.id, fis.aliciCariId)));
        aliciUnvan = cari?.unvan;
      }
    }

    const provider = getEbelgeProvider();
    const sent = await provider.send({ tur: p.data.tur, tutar, aliciUnvan, kalemler });
    const status = await provider.getStatus(sent.uuid); // mock → KABUL

    const id = nanoid();
    await db.insert(s.ebelgeler).values({
      id, tenantId, tur: p.data.tur, yon: 'GIDEN', fisId: p.data.fisId ?? null, cariId: p.data.cariId ?? null,
      uuid: sent.uuid, no: sent.no, tutar, durum: status, saglayici: provider.name, html: sent.html,
    });
    if (p.data.fisId) {
      await db.update(s.fisler).set({ efaturaId: id }).where(and(eq(s.fisler.tenantId, tenantId), eq(s.fisler.id, p.data.fisId)));
    }
    await writeAudit(db, req.ctx, 'ebelge', id, 'send', null, { tur: p.data.tur, uuid: sent.uuid, durum: status });
    reply.code(201);
    const [row] = await db.select().from(s.ebelgeler).where(and(eq(s.ebelgeler.tenantId, tenantId), eq(s.ebelgeler.id, id)));
    return row;
  });

  app.get('/api/ebelge', async (req) => {
    assertCan(req.ctx.role, 'ebelge', 'read');
    const db = getDb();
    const q = req.query as { tur?: string; yon?: string; durum?: string };
    const conds = [eq(s.ebelgeler.tenantId, req.ctx.tenantId)];
    if (q.tur) conds.push(eq(s.ebelgeler.tur, q.tur));
    if (q.yon) conds.push(eq(s.ebelgeler.yon, q.yon));
    if (q.durum) conds.push(eq(s.ebelgeler.durum, q.durum));
    return db.select().from(s.ebelgeler).where(and(...conds)).orderBy(desc(s.ebelgeler.createdAt));
  });

  app.get('/api/ebelge/dashboard', async (req) => {
    assertCan(req.ctx.role, 'ebelge', 'read');
    const db = getDb();
    return db.select({ tur: s.ebelgeler.tur, yon: s.ebelgeler.yon, durum: s.ebelgeler.durum, adet: sql<number>`count(*)`, toplam: sql<number>`round(coalesce(sum(${s.ebelgeler.tutar}),0),2)` })
      .from(s.ebelgeler).where(eq(s.ebelgeler.tenantId, req.ctx.tenantId)).groupBy(s.ebelgeler.tur, s.ebelgeler.yon, s.ebelgeler.durum);
  });

  app.get('/api/ebelge/gelen', async (req) => {
    assertCan(req.ctx.role, 'ebelge', 'read');
    const db = getDb();
    return db.select().from(s.ebelgeler).where(and(eq(s.ebelgeler.tenantId, req.ctx.tenantId), eq(s.ebelgeler.yon, 'GELEN'))).orderBy(desc(s.ebelgeler.createdAt));
  });

  // Simulate receiving an incoming e-invoice (mock supplier feed).
  app.post('/api/ebelge/gelen/simule', async (req, reply) => {
    assertCan(req.ctx.role, 'ebelge', 'write');
    const p = z.object({ tutar: z.number().min(0), cariId: z.string().optional() }).safeParse(req.body);
    if (!p.success) throw badRequest('Geçersiz istek');
    const db = getDb(); const id = nanoid();
    const provider = getEbelgeProvider();
    const sent = await provider.send({ tur: 'EFATURA', tutar: p.data.tutar, aliciUnvan: 'Tedarikçi' });
    await db.insert(s.ebelgeler).values({ id, tenantId: req.ctx.tenantId, tur: 'EFATURA', yon: 'GELEN', cariId: p.data.cariId ?? null, uuid: sent.uuid, no: sent.no, tutar: p.data.tutar, durum: 'KABUL', saglayici: provider.name, html: sent.html });
    reply.code(201);
    const [row] = await db.select().from(s.ebelgeler).where(and(eq(s.ebelgeler.tenantId, req.ctx.tenantId), eq(s.ebelgeler.id, id)));
    return row;
  });

  app.get('/api/ebelge/:id', async (req) => {
    assertCan(req.ctx.role, 'ebelge', 'read');
    const db = getDb();
    const [row] = await db.select().from(s.ebelgeler).where(and(eq(s.ebelgeler.tenantId, req.ctx.tenantId), eq(s.ebelgeler.id, (req.params as { id: string }).id)));
    if (!row) throw notFound();
    return row;
  });

  app.get('/api/ebelge/ayarlar', async (req) => {
    assertCan(req.ctx.role, 'ebelge', 'read');
    return settingsStore.get(req.ctx.tenantId) ?? defaultSettings();
  });

  app.put('/api/ebelge/ayarlar', async (req) => {
    assertCan(req.ctx.role, 'ebelge', 'write');
    const merged = { ...defaultSettings(), ...(settingsStore.get(req.ctx.tenantId) ?? {}), ...(req.body as object) };
    settingsStore.set(req.ctx.tenantId, merged);
    return merged;
  });
}
