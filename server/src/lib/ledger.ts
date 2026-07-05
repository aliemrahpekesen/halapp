import { nanoid } from 'nanoid';
import { eq, and, sql } from 'drizzle-orm';
import type { DB } from '../db/index.js';
import * as s from '../db/schema.js';
import { round2 } from './money.js';

/**
 * Ledger posting helpers. Each takes a tx-scoped `db` and is async, so they
 * compose inside `transaction(async (tx) => { ... })`. Account/cash balances are
 * cached running totals updated atomically with each movement (source of truth
 * is the *_hareketler movement tables).
 */

export interface CariPost {
  cariId: string; tarih: string; aciklama?: string;
  borc?: number; alacak?: number; belgeTip: string; belgeId: string;
}

export async function postCari(db: DB, tenantId: string, p: CariPost): Promise<string> {
  const id = nanoid();
  const borc = round2(p.borc ?? 0);
  const alacak = round2(p.alacak ?? 0);
  await db.insert(s.cariHareketler).values({
    id, tenantId, cariId: p.cariId, tarih: p.tarih, aciklama: p.aciklama ?? null,
    borc, alacak, belgeTip: p.belgeTip, belgeId: p.belgeId,
  });
  await db.update(s.cariHesaplar)
    .set({ bakiye: sql`round(cast(${s.cariHesaplar.bakiye} + ${borc} - ${alacak} as numeric), 2)` })
    .where(and(eq(s.cariHesaplar.tenantId, tenantId), eq(s.cariHesaplar.id, p.cariId)));
  return id;
}

export interface KasaPost {
  kasaId: string; tarih: string; aciklama?: string;
  giris?: number; cikis?: number; belgeTip: string; belgeId: string;
}

export async function postKasa(db: DB, tenantId: string, p: KasaPost): Promise<string> {
  const id = nanoid();
  const giris = round2(p.giris ?? 0);
  const cikis = round2(p.cikis ?? 0);
  await db.insert(s.kasaHareketler).values({
    id, tenantId, kasaId: p.kasaId, tarih: p.tarih, aciklama: p.aciklama ?? null,
    giris, cikis, belgeTip: p.belgeTip, belgeId: p.belgeId,
  });
  await db.update(s.kasalar)
    .set({ bakiye: sql`round(cast(${s.kasalar.bakiye} + ${giris} - ${cikis} as numeric), 2)` })
    .where(and(eq(s.kasalar.tenantId, tenantId), eq(s.kasalar.id, p.kasaId)));
  return id;
}

export interface StokPost {
  depoId: string; balikCinsId: string; tarih: string;
  giris?: number; cikis?: number; birimMaliyet?: number; belgeTip: string; belgeId: string;
}

export async function postStok(db: DB, tenantId: string, p: StokPost): Promise<string> {
  const id = nanoid();
  await db.insert(s.stokHareketler).values({
    id, tenantId, depoId: p.depoId, balikCinsId: p.balikCinsId, tarih: p.tarih,
    giris: round2(p.giris ?? 0), cikis: round2(p.cikis ?? 0),
    birimMaliyet: round2(p.birimMaliyet ?? 0), belgeTip: p.belgeTip, belgeId: p.belgeId,
  });
  return id;
}

/** Reverse every movement produced by a document (used on cancel). */
export async function reverseDocument(db: DB, tenantId: string, belgeId: string): Promise<void> {
  const cari = await db.select().from(s.cariHareketler)
    .where(and(eq(s.cariHareketler.tenantId, tenantId), eq(s.cariHareketler.belgeId, belgeId)));
  for (const h of cari) {
    await db.update(s.cariHesaplar)
      .set({ bakiye: sql`round(cast(${s.cariHesaplar.bakiye} - ${h.borc} + ${h.alacak} as numeric), 2)` })
      .where(and(eq(s.cariHesaplar.tenantId, tenantId), eq(s.cariHesaplar.id, h.cariId)));
  }
  await db.delete(s.cariHareketler).where(and(eq(s.cariHareketler.tenantId, tenantId), eq(s.cariHareketler.belgeId, belgeId)));

  const kasa = await db.select().from(s.kasaHareketler)
    .where(and(eq(s.kasaHareketler.tenantId, tenantId), eq(s.kasaHareketler.belgeId, belgeId)));
  for (const h of kasa) {
    await db.update(s.kasalar)
      .set({ bakiye: sql`round(cast(${s.kasalar.bakiye} - ${h.giris} + ${h.cikis} as numeric), 2)` })
      .where(and(eq(s.kasalar.tenantId, tenantId), eq(s.kasalar.id, h.kasaId)));
  }
  await db.delete(s.kasaHareketler).where(and(eq(s.kasaHareketler.tenantId, tenantId), eq(s.kasaHareketler.belgeId, belgeId)));

  await db.delete(s.stokHareketler).where(and(eq(s.stokHareketler.tenantId, tenantId), eq(s.stokHareketler.belgeId, belgeId)));
}
