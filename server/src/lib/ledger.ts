import { nanoid } from 'nanoid';
import { eq, and, sql } from 'drizzle-orm';
import type { DB } from '../db/index.js';
import * as s from '../db/schema.js';
import { round2 } from './money.js';

/**
 * Ledger posting helpers. ALL functions here use synchronous drizzle execution
 * (`.run()`) so they can be composed inside `transaction(() => { ... })`.
 * Account/cash balances are kept as cached running totals updated atomically
 * with each movement (source of truth is the *_hareketler movement tables).
 */

export interface CariPost {
  cariId: string; tarih: string; aciklama?: string;
  borc?: number; alacak?: number; belgeTip: string; belgeId: string;
}

export function postCari(db: DB, tenantId: string, p: CariPost): string {
  const id = nanoid();
  const borc = round2(p.borc ?? 0);
  const alacak = round2(p.alacak ?? 0);
  db.insert(s.cariHareketler).values({
    id, tenantId, cariId: p.cariId, tarih: p.tarih, aciklama: p.aciklama ?? null,
    borc, alacak, belgeTip: p.belgeTip, belgeId: p.belgeId,
  }).run();
  db.update(s.cariHesaplar)
    .set({ bakiye: sql`round(${s.cariHesaplar.bakiye} + ${borc} - ${alacak}, 2)` })
    .where(and(eq(s.cariHesaplar.tenantId, tenantId), eq(s.cariHesaplar.id, p.cariId)))
    .run();
  return id;
}

export interface KasaPost {
  kasaId: string; tarih: string; aciklama?: string;
  giris?: number; cikis?: number; belgeTip: string; belgeId: string;
}

export function postKasa(db: DB, tenantId: string, p: KasaPost): string {
  const id = nanoid();
  const giris = round2(p.giris ?? 0);
  const cikis = round2(p.cikis ?? 0);
  db.insert(s.kasaHareketler).values({
    id, tenantId, kasaId: p.kasaId, tarih: p.tarih, aciklama: p.aciklama ?? null,
    giris, cikis, belgeTip: p.belgeTip, belgeId: p.belgeId,
  }).run();
  db.update(s.kasalar)
    .set({ bakiye: sql`round(${s.kasalar.bakiye} + ${giris} - ${cikis}, 2)` })
    .where(and(eq(s.kasalar.tenantId, tenantId), eq(s.kasalar.id, p.kasaId)))
    .run();
  return id;
}

export interface StokPost {
  depoId: string; balikCinsId: string; tarih: string;
  giris?: number; cikis?: number; birimMaliyet?: number; belgeTip: string; belgeId: string;
}

export function postStok(db: DB, tenantId: string, p: StokPost): string {
  const id = nanoid();
  db.insert(s.stokHareketler).values({
    id, tenantId, depoId: p.depoId, balikCinsId: p.balikCinsId, tarih: p.tarih,
    giris: round2(p.giris ?? 0), cikis: round2(p.cikis ?? 0),
    birimMaliyet: round2(p.birimMaliyet ?? 0), belgeTip: p.belgeTip, belgeId: p.belgeId,
  }).run();
  return id;
}

/** Reverse every movement produced by a document (used on cancel). */
export function reverseDocument(db: DB, tenantId: string, belgeId: string): void {
  const cari = db.select().from(s.cariHareketler)
    .where(and(eq(s.cariHareketler.tenantId, tenantId), eq(s.cariHareketler.belgeId, belgeId))).all();
  for (const h of cari) {
    db.update(s.cariHesaplar)
      .set({ bakiye: sql`round(${s.cariHesaplar.bakiye} - ${h.borc} + ${h.alacak}, 2)` })
      .where(and(eq(s.cariHesaplar.tenantId, tenantId), eq(s.cariHesaplar.id, h.cariId))).run();
  }
  db.delete(s.cariHareketler).where(and(eq(s.cariHareketler.tenantId, tenantId), eq(s.cariHareketler.belgeId, belgeId))).run();

  const kasa = db.select().from(s.kasaHareketler)
    .where(and(eq(s.kasaHareketler.tenantId, tenantId), eq(s.kasaHareketler.belgeId, belgeId))).all();
  for (const h of kasa) {
    db.update(s.kasalar)
      .set({ bakiye: sql`round(${s.kasalar.bakiye} - ${h.giris} + ${h.cikis}, 2)` })
      .where(and(eq(s.kasalar.tenantId, tenantId), eq(s.kasalar.id, h.kasaId))).run();
  }
  db.delete(s.kasaHareketler).where(and(eq(s.kasaHareketler.tenantId, tenantId), eq(s.kasaHareketler.belgeId, belgeId))).run();

  db.delete(s.stokHareketler).where(and(eq(s.stokHareketler.tenantId, tenantId), eq(s.stokHareketler.belgeId, belgeId))).run();
}
