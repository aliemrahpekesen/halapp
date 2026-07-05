import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { registerCrud } from '../core/crud.js';
import * as s from '../db/schema.js';

const kodAd = z.object({ kod: z.string().min(1, 'Kod zorunlu'), ad: z.string().min(1, 'Ad zorunlu') });

export async function registerParams(app: FastifyInstance) {
  registerCrud(app, {
    table: s.balikGruplari, page: 'params', entity: 'balik_grubu',
    basePath: '/api/params/balik-gruplari', createSchema: kodAd,
  });

  registerCrud(app, {
    table: s.balikCinsleri, page: 'params', entity: 'balik_cinsi',
    basePath: '/api/params/balik-cinsleri',
    createSchema: kodAd.extend({
      grupId: z.string().optional(),
      // Hal rüsumu genelde ≤ %5; makul üst sınır ile hatalı girişi engelle.
      rusumOrani: z.number().min(0).max(0.05, 'Rüsum oranı en fazla %5 olabilir').optional(),
      birim: z.string().optional(),
    }),
  });

  registerCrud(app, {
    table: s.cariHesaplar, page: 'cari', entity: 'cari_hesap',
    basePath: '/api/params/cari-hesaplar',
    createSchema: z.object({
      kod: z.string().min(1), unvan: z.string().min(1),
      tip: z.enum(['MUSTAHSIL', 'ALICI', 'TEDARIKCI', 'PERSONEL', 'TAHSILATCI']).optional(),
      vknTckn: z.string().optional(), telefon: z.string().optional(), adres: z.string().optional(),
      riskLimiti: z.number().min(0).optional(), ustCariId: z.string().optional(),
    }),
  });

  registerCrud(app, {
    table: s.kasalar, page: 'params', entity: 'kasa',
    basePath: '/api/params/kasalar',
    createSchema: kodAd.extend({ paraBirimi: z.string().optional() }),
  });

  registerCrud(app, { table: s.depolar, page: 'params', entity: 'depo', basePath: '/api/params/depolar', createSchema: kodAd });
  registerCrud(app, { table: s.bankalar, page: 'params', entity: 'banka', basePath: '/api/params/bankalar', createSchema: kodAd });

  registerCrud(app, {
    table: s.bankaHesaplari, page: 'params', entity: 'banka_hesap',
    basePath: '/api/params/banka-hesaplari',
    createSchema: z.object({ ad: z.string().min(1), bankaId: z.string().optional(), iban: z.string().optional(), paraBirimi: z.string().optional() }),
  });

  registerCrud(app, {
    table: s.kdvKodlari, page: 'params', entity: 'kdv_kodu',
    basePath: '/api/params/kdv-kodlari', createSchema: kodAd.extend({ oran: z.number().min(0).max(1) }),
  });

  registerCrud(app, {
    table: s.tevkifatKodlari, page: 'params', entity: 'tevkifat_kodu',
    basePath: '/api/params/tevkifat-kodlari', createSchema: kodAd.extend({ oran: z.number().min(0).max(1) }),
  });

  registerCrud(app, { table: s.olcuBirimleri, page: 'params', entity: 'olcu_birimi', basePath: '/api/params/olcu-birimleri', createSchema: kodAd });

  registerCrud(app, {
    table: s.paraBirimleri, page: 'params', entity: 'para_birimi',
    basePath: '/api/params/para-birimleri', createSchema: kodAd.extend({ kur: z.number().positive().optional() }),
  });

  registerCrud(app, { table: s.masrafTurleri, page: 'params', entity: 'masraf_turu', basePath: '/api/params/masraf-turleri', createSchema: kodAd });

  registerCrud(app, {
    table: s.hareketTipleri, page: 'params', entity: 'hareket_tipi',
    basePath: '/api/params/hareket-tipleri', createSchema: kodAd.extend({ yon: z.enum(['BORC', 'ALACAK']).optional() }),
  });

  registerCrud(app, {
    table: s.posTanimlari, page: 'params', entity: 'pos_tanimi',
    basePath: '/api/params/pos-tanimlari',
    createSchema: kodAd.extend({ bankaHesapId: z.string().optional(), komisyonOrani: z.number().min(0).max(1).optional() }),
  });

  registerCrud(app, {
    table: s.isyeri, page: 'params', entity: 'isyeri',
    basePath: '/api/params/isyeri',
    createSchema: z.object({
      kod: z.string().min(1), unvan: z.string().min(1), vkn: z.string().optional(), adres: z.string().optional(),
      hksKomisyonOrani: z.number().min(0).max(0.08).optional(),
      hksKomisyonKdvOrani: z.number().min(0).max(1).optional(),
      hksGelirVergisiOrani: z.number().min(0).max(1).optional(),
    }),
  });

  registerCrud(app, { table: s.subeler, page: 'params', entity: 'sube', basePath: '/api/params/subeler', createSchema: kodAd });
}
