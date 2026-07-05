import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Multi-tenant schema. Every business table carries `tenantId`.
 * All repository access is scoped by tenantId (see src/core/repo.ts).
 */

const id = () => text('id').primaryKey();
const tenant = () => text('tenant_id').notNull();
const ts = () => text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);

export const tenants = sqliteTable('tenants', {
  id: id(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: ts(),
});

export const users = sqliteTable('users', {
  id: id(),
  tenantId: tenant(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('ReadOnly'), // SuperAdmin|Admin|Muhasebe|Tahsilatci|ReadOnly
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  resetToken: text('reset_token'),
  resetTokenExp: text('reset_token_exp'),
  createdAt: ts(),
}, (t) => ({ byTenantEmail: index('users_tenant_email').on(t.tenantId, t.email) }));

// Page-level permission overrides (role default matrix lives in code; these override per user)
export const permissions = sqliteTable('permissions', {
  id: id(),
  tenantId: tenant(),
  role: text('role').notNull(),
  page: text('page').notNull(),
  canRead: integer('can_read', { mode: 'boolean' }).notNull().default(false),
  canWrite: integer('can_write', { mode: 'boolean' }).notNull().default(false),
  canDelete: integer('can_delete', { mode: 'boolean' }).notNull().default(false),
}, (t) => ({ byTenantRole: index('perm_tenant_role').on(t.tenantId, t.role, t.page) }));

export const auditLogs = sqliteTable('audit_logs', {
  id: id(),
  tenantId: tenant(),
  userId: text('user_id'),
  userEmail: text('user_email'),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  action: text('action').notNull(), // create|update|delete|post|cancel
  before: text('before'), // json
  after: text('after'), // json
  createdAt: ts(),
}, (t) => ({ byTenant: index('audit_tenant').on(t.tenantId, t.entity) }));

export const notifications = sqliteTable('notifications', {
  id: id(),
  tenantId: tenant(),
  userId: text('user_id'),
  title: text('title').notNull(),
  body: text('body'),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  createdAt: ts(),
}, (t) => ({ byTenantUser: index('notif_tenant_user').on(t.tenantId, t.userId) }));

export const supportTickets = sqliteTable('support_tickets', {
  id: id(),
  tenantId: tenant(),
  userId: text('user_id'),
  subject: text('subject').notNull(),
  body: text('body'),
  status: text('status').notNull().default('open'), // open|in_progress|closed
  createdAt: ts(),
});

// ---------- Master data (Parametreler) ----------

export const balikGruplari = sqliteTable('balik_gruplari', {
  id: id(),
  tenantId: tenant(),
  kod: text('kod').notNull(),
  ad: text('ad').notNull(),
  createdAt: ts(),
}, (t) => ({ byTenant: index('bg_tenant').on(t.tenantId) }));

export const balikCinsleri = sqliteTable('balik_cinsleri', {
  id: id(),
  tenantId: tenant(),
  kod: text('kod').notNull(),
  ad: text('ad').notNull(),
  grupId: text('grup_id'),
  rusumOrani: real('rusum_orani').notNull().default(0),
  birim: text('birim').notNull().default('KG'),
  createdAt: ts(),
}, (t) => ({ byTenant: index('bc_tenant').on(t.tenantId) }));

export const cariHesaplar = sqliteTable('cari_hesaplar', {
  id: id(),
  tenantId: tenant(),
  kod: text('kod').notNull(),
  unvan: text('unvan').notNull(),
  tip: text('tip').notNull().default('ALICI'), // MUSTAHSIL|ALICI|TEDARIKCI|PERSONEL|TAHSILATCI
  vknTckn: text('vkn_tckn'),
  telefon: text('telefon'),
  adres: text('adres'),
  riskLimiti: real('risk_limiti').notNull().default(0),
  ustCariId: text('ust_cari_id'),
  bakiye: real('bakiye').notNull().default(0), // cached running balance (borç - alacak)
  createdAt: ts(),
}, (t) => ({ byTenant: index('ch_tenant').on(t.tenantId), byTip: index('ch_tip').on(t.tenantId, t.tip) }));

export const kasalar = sqliteTable('kasalar', {
  id: id(),
  tenantId: tenant(),
  kod: text('kod').notNull(),
  ad: text('ad').notNull(),
  paraBirimi: text('para_birimi').notNull().default('TRY'),
  bakiye: real('bakiye').notNull().default(0),
  createdAt: ts(),
}, (t) => ({ byTenant: index('ka_tenant').on(t.tenantId) }));

export const depolar = sqliteTable('depolar', {
  id: id(),
  tenantId: tenant(),
  kod: text('kod').notNull(),
  ad: text('ad').notNull(),
  createdAt: ts(),
}, (t) => ({ byTenant: index('de_tenant').on(t.tenantId) }));

export const bankalar = sqliteTable('bankalar', {
  id: id(),
  tenantId: tenant(),
  kod: text('kod').notNull(),
  ad: text('ad').notNull(),
  createdAt: ts(),
}, (t) => ({ byTenant: index('ba_tenant').on(t.tenantId) }));

export const bankaHesaplari = sqliteTable('banka_hesaplari', {
  id: id(),
  tenantId: tenant(),
  bankaId: text('banka_id'),
  ad: text('ad').notNull(),
  iban: text('iban'),
  paraBirimi: text('para_birimi').notNull().default('TRY'),
  bakiye: real('bakiye').notNull().default(0),
  createdAt: ts(),
}, (t) => ({ byTenant: index('bh_tenant').on(t.tenantId) }));

export const kdvKodlari = sqliteTable('kdv_kodlari', {
  id: id(),
  tenantId: tenant(),
  kod: text('kod').notNull(),
  ad: text('ad').notNull(),
  oran: real('oran').notNull().default(0),
  createdAt: ts(),
}, (t) => ({ byTenant: index('kk_tenant').on(t.tenantId) }));

export const tevkifatKodlari = sqliteTable('tevkifat_kodlari', {
  id: id(),
  tenantId: tenant(),
  kod: text('kod').notNull(),
  ad: text('ad').notNull(),
  oran: real('oran').notNull().default(0), // as fraction e.g. 0.5
  createdAt: ts(),
}, (t) => ({ byTenant: index('tk_tenant').on(t.tenantId) }));

export const olcuBirimleri = sqliteTable('olcu_birimleri', {
  id: id(),
  tenantId: tenant(),
  kod: text('kod').notNull(),
  ad: text('ad').notNull(),
  createdAt: ts(),
}, (t) => ({ byTenant: index('ob_tenant').on(t.tenantId) }));

export const paraBirimleri = sqliteTable('para_birimleri', {
  id: id(),
  tenantId: tenant(),
  kod: text('kod').notNull(),
  ad: text('ad').notNull(),
  kur: real('kur').notNull().default(1),
  createdAt: ts(),
}, (t) => ({ byTenant: index('pb_tenant').on(t.tenantId) }));

export const masrafTurleri = sqliteTable('masraf_turleri', {
  id: id(),
  tenantId: tenant(),
  kod: text('kod').notNull(),
  ad: text('ad').notNull(),
  createdAt: ts(),
}, (t) => ({ byTenant: index('mt_tenant').on(t.tenantId) }));

export const hareketTipleri = sqliteTable('hareket_tipleri', {
  id: id(),
  tenantId: tenant(),
  kod: text('kod').notNull(),
  ad: text('ad').notNull(),
  yon: text('yon').notNull().default('BORC'), // BORC|ALACAK
  createdAt: ts(),
}, (t) => ({ byTenant: index('ht_tenant').on(t.tenantId) }));

export const posTanimlari = sqliteTable('pos_tanimlari', {
  id: id(),
  tenantId: tenant(),
  kod: text('kod').notNull(),
  ad: text('ad').notNull(),
  bankaHesapId: text('banka_hesap_id'),
  komisyonOrani: real('komisyon_orani').notNull().default(0),
  createdAt: ts(),
}, (t) => ({ byTenant: index('pos_tenant').on(t.tenantId) }));

export const isyeri = sqliteTable('isyeri', {
  id: id(),
  tenantId: tenant(),
  kod: text('kod').notNull(),
  unvan: text('unvan').notNull(),
  vkn: text('vkn'),
  adres: text('adres'),
  hksKomisyonOrani: real('hks_komisyon_orani').notNull().default(0.08),
  hksKomisyonKdvOrani: real('hks_komisyon_kdv_orani').notNull().default(0.2),
  hksGelirVergisiOrani: real('hks_gelir_vergisi_orani').notNull().default(0.02),
  createdAt: ts(),
}, (t) => ({ byTenant: index('iy_tenant').on(t.tenantId) }));

export const subeler = sqliteTable('subeler', {
  id: id(),
  tenantId: tenant(),
  kod: text('kod').notNull(),
  ad: text('ad').notNull(),
  createdAt: ts(),
}, (t) => ({ byTenant: index('su_tenant').on(t.tenantId) }));

// ---------- Transactions ----------

// Cari ledger movement (single source of truth for account balances)
export const cariHareketler = sqliteTable('cari_hareketler', {
  id: id(),
  tenantId: tenant(),
  cariId: text('cari_id').notNull(),
  tarih: text('tarih').notNull(),
  aciklama: text('aciklama'),
  borc: real('borc').notNull().default(0),
  alacak: real('alacak').notNull().default(0),
  belgeTip: text('belge_tip'), // SATIS|ALIS|TAHSIL|TEDIYE|MAHSUP|KOMISYON|MASRAF|CEK
  belgeId: text('belge_id'),
  createdAt: ts(),
}, (t) => ({ byCari: index('cari_hareket_cari').on(t.tenantId, t.cariId), byTarih: index('cari_hareket_tarih').on(t.tenantId, t.tarih) }));

export const kasaHareketler = sqliteTable('kasa_hareketler', {
  id: id(),
  tenantId: tenant(),
  kasaId: text('kasa_id').notNull(),
  tarih: text('tarih').notNull(),
  aciklama: text('aciklama'),
  giris: real('giris').notNull().default(0),
  cikis: real('cikis').notNull().default(0),
  belgeTip: text('belge_tip'),
  belgeId: text('belge_id'),
  createdAt: ts(),
}, (t) => ({ byKasa: index('kasa_hareket_kasa').on(t.tenantId, t.kasaId) }));

export const stokHareketler = sqliteTable('stok_hareketler', {
  id: id(),
  tenantId: tenant(),
  depoId: text('depo_id').notNull(),
  balikCinsId: text('balik_cins_id').notNull(),
  tarih: text('tarih').notNull(),
  giris: real('giris').notNull().default(0), // kg in
  cikis: real('cikis').notNull().default(0), // kg out
  birimMaliyet: real('birim_maliyet').notNull().default(0),
  belgeTip: text('belge_tip'),
  belgeId: text('belge_id'),
  createdAt: ts(),
}, (t) => ({ byDepoCins: index('stok_hareket_dc').on(t.tenantId, t.depoId, t.balikCinsId) }));

// Sales / buy-sell slips
export const fisler = sqliteTable('fisler', {
  id: id(),
  tenantId: tenant(),
  tip: text('tip').notNull(), // SATIS|ALIS_SATIS|MAHSUP
  no: text('no').notNull(),
  tarih: text('tarih').notNull(),
  aliciCariId: text('alici_cari_id'),
  mustahsilCariId: text('mustahsil_cari_id'),
  kunyeNo: text('kunye_no'),
  depoId: text('depo_id'),
  kasaId: text('kasa_id'),
  odemeTipi: text('odeme_tipi').notNull().default('VERESIYE'), // PESIN|VERESIYE|KART
  brutTutar: real('brut_tutar').notNull().default(0),
  komisyonTutar: real('komisyon_tutar').notNull().default(0),
  rusumTutar: real('rusum_tutar').notNull().default(0),
  stopajTutar: real('stopaj_tutar').notNull().default(0),
  tevkifatTutar: real('tevkifat_tutar').notNull().default(0),
  netTutar: real('net_tutar').notNull().default(0),
  durum: text('durum').notNull().default('TASLAK'), // TASLAK|ISLENDI|IPTAL
  efaturaId: text('efatura_id'),
  createdAt: ts(),
}, (t) => ({ byTenant: index('fis_tenant').on(t.tenantId, t.tip), byTarih: index('fis_tarih').on(t.tenantId, t.tarih) }));

export const fisSatirlari = sqliteTable('fis_satirlari', {
  id: id(),
  tenantId: tenant(),
  fisId: text('fis_id').notNull(),
  balikCinsId: text('balik_cins_id').notNull(),
  kapAdet: real('kap_adet').notNull().default(0),
  miktar: real('miktar').notNull().default(0), // kg
  birimFiyat: real('birim_fiyat').notNull().default(0),
  tutar: real('tutar').notNull().default(0),
  createdAt: ts(),
}, (t) => ({ byFis: index('fissatir_fis').on(t.tenantId, t.fisId) }));

// Cheques
export const cekler = sqliteTable('cekler', {
  id: id(),
  tenantId: tenant(),
  yon: text('yon').notNull().default('GIRIS'), // GIRIS(received)|CIKIS(issued)
  cariId: text('cari_id'),
  bankaId: text('banka_id'),
  cekNo: text('cek_no').notNull(),
  tutar: real('tutar').notNull().default(0),
  vadeTarihi: text('vade_tarihi'),
  durum: text('durum').notNull().default('PORTFOYDE'), // PORTFOYDE|TAHSILDE|ODENDI|KARSILIKSIZ|CIRO
  createdAt: ts(),
}, (t) => ({ byTenant: index('cek_tenant').on(t.tenantId, t.durum) }));

// Expenses
export const masraflar = sqliteTable('masraflar', {
  id: id(),
  tenantId: tenant(),
  tarih: text('tarih').notNull(),
  masrafTuruId: text('masraf_turu_id'),
  kasaId: text('kasa_id'),
  aciklama: text('aciklama'),
  tutar: real('tutar').notNull().default(0),
  createdAt: ts(),
}, (t) => ({ byTenant: index('masraf_tenant').on(t.tenantId) }));

// e-Belge (mock provider records)
export const ebelgeler = sqliteTable('ebelgeler', {
  id: id(),
  tenantId: tenant(),
  tur: text('tur').notNull(), // EFATURA|EMUSTAHSIL|EIRSALIYE
  yon: text('yon').notNull().default('GIDEN'), // GIDEN|GELEN
  fisId: text('fis_id'),
  cariId: text('cari_id'),
  uuid: text('uuid'),
  no: text('no'),
  tutar: real('tutar').notNull().default(0),
  durum: text('durum').notNull().default('TASLAK'), // TASLAK|GONDERILDI|KABUL|RED|HATA
  saglayici: text('saglayici').notNull().default('UYUMSOFT_MOCK'),
  html: text('html'),
  createdAt: ts(),
}, (t) => ({ byTenant: index('ebelge_tenant').on(t.tenantId, t.tur) }));

// Payments (mock gateway)
export const odemeler = sqliteTable('odemeler', {
  id: id(),
  tenantId: tenant(),
  cariId: text('cari_id'),
  posId: text('pos_id'),
  token: text('token'),
  tutar: real('tutar').notNull().default(0),
  durum: text('durum').notNull().default('BASLATILDI'), // BASLATILDI|BASARILI|BASARISIZ|IADE
  saglayici: text('saglayici').notNull().default('MOCK_GATEWAY'),
  createdAt: ts(),
}, (t) => ({ byTenant: index('odeme_tenant').on(t.tenantId) }));
