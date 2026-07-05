import { pgTable, text, doublePrecision, boolean, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * Multi-tenant schema (PostgreSQL dialect — runs on PGlite for tests/demo and
 * on any Postgres, e.g. Supabase/Neon, when DATABASE_URL is set).
 * Every business table carries `tenantId`; all repository access is tenant-scoped.
 */

const id = () => text('id').primaryKey();
const tenant = () => text('tenant_id').notNull();
const ts = () => timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow();

export const tenants = pgTable('tenants', {
  id: id(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  active: boolean('active').notNull().default(true),
  createdAt: ts(),
});

export const users = pgTable('users', {
  id: id(),
  tenantId: tenant(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('ReadOnly'), // SuperAdmin|Admin|Muhasebe|Tahsilatci|ReadOnly
  active: boolean('active').notNull().default(true),
  resetToken: text('reset_token'),
  resetTokenExp: text('reset_token_exp'),
  createdAt: ts(),
}, (t) => ({ byTenantEmail: index('users_tenant_email').on(t.tenantId, t.email) }));

export const permissions = pgTable('permissions', {
  id: id(),
  tenantId: tenant(),
  role: text('role').notNull(),
  page: text('page').notNull(),
  canRead: boolean('can_read').notNull().default(false),
  canWrite: boolean('can_write').notNull().default(false),
  canDelete: boolean('can_delete').notNull().default(false),
}, (t) => ({ byTenantRole: index('perm_tenant_role').on(t.tenantId, t.role, t.page) }));

export const auditLogs = pgTable('audit_logs', {
  id: id(),
  tenantId: tenant(),
  userId: text('user_id'),
  userEmail: text('user_email'),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  action: text('action').notNull(),
  before: text('before'),
  after: text('after'),
  createdAt: ts(),
}, (t) => ({ byTenant: index('audit_tenant').on(t.tenantId, t.entity) }));

export const notifications = pgTable('notifications', {
  id: id(),
  tenantId: tenant(),
  userId: text('user_id'),
  title: text('title').notNull(),
  body: text('body'),
  read: boolean('read').notNull().default(false),
  createdAt: ts(),
}, (t) => ({ byTenantUser: index('notif_tenant_user').on(t.tenantId, t.userId) }));

// Distributed brute-force protection (shared across serverless instances).
export const loginAttempts = pgTable('login_attempts', {
  id: id(),
  k: text('k').notNull(), // tenantSlug:email
  createdAt: ts(),
}, (t) => ({ byK: index('la_k').on(t.k) }));

export const supportTickets = pgTable('support_tickets', {
  id: id(),
  tenantId: tenant(),
  userId: text('user_id'),
  subject: text('subject').notNull(),
  body: text('body'),
  status: text('status').notNull().default('open'),
  createdAt: ts(),
});

// ---------- Master data (Parametreler) ----------

export const balikGruplari = pgTable('balik_gruplari', {
  id: id(), tenantId: tenant(), kod: text('kod').notNull(), ad: text('ad').notNull(), createdAt: ts(),
}, (t) => ({ byTenant: index('bg_tenant').on(t.tenantId) }));

export const balikCinsleri = pgTable('balik_cinsleri', {
  id: id(), tenantId: tenant(), kod: text('kod').notNull(), ad: text('ad').notNull(),
  grupId: text('grup_id'), rusumOrani: doublePrecision('rusum_orani').notNull().default(0),
  birim: text('birim').notNull().default('KG'), createdAt: ts(),
}, (t) => ({ byTenant: index('bc_tenant').on(t.tenantId) }));

export const cariHesaplar = pgTable('cari_hesaplar', {
  id: id(), tenantId: tenant(), kod: text('kod').notNull(), unvan: text('unvan').notNull(),
  tip: text('tip').notNull().default('ALICI'),
  vknTckn: text('vkn_tckn'), telefon: text('telefon'), adres: text('adres'),
  riskLimiti: doublePrecision('risk_limiti').notNull().default(0),
  ustCariId: text('ust_cari_id'), bakiye: doublePrecision('bakiye').notNull().default(0), createdAt: ts(),
}, (t) => ({ byTenant: index('ch_tenant').on(t.tenantId), byTip: index('ch_tip').on(t.tenantId, t.tip) }));

export const kasalar = pgTable('kasalar', {
  id: id(), tenantId: tenant(), kod: text('kod').notNull(), ad: text('ad').notNull(),
  paraBirimi: text('para_birimi').notNull().default('TRY'), bakiye: doublePrecision('bakiye').notNull().default(0), createdAt: ts(),
}, (t) => ({ byTenant: index('ka_tenant').on(t.tenantId) }));

export const depolar = pgTable('depolar', {
  id: id(), tenantId: tenant(), kod: text('kod').notNull(), ad: text('ad').notNull(), createdAt: ts(),
}, (t) => ({ byTenant: index('de_tenant').on(t.tenantId) }));

export const bankalar = pgTable('bankalar', {
  id: id(), tenantId: tenant(), kod: text('kod').notNull(), ad: text('ad').notNull(), createdAt: ts(),
}, (t) => ({ byTenant: index('ba_tenant').on(t.tenantId) }));

export const bankaHesaplari = pgTable('banka_hesaplari', {
  id: id(), tenantId: tenant(), bankaId: text('banka_id'), ad: text('ad').notNull(), iban: text('iban'),
  paraBirimi: text('para_birimi').notNull().default('TRY'), bakiye: doublePrecision('bakiye').notNull().default(0), createdAt: ts(),
}, (t) => ({ byTenant: index('bh_tenant').on(t.tenantId) }));

export const kdvKodlari = pgTable('kdv_kodlari', {
  id: id(), tenantId: tenant(), kod: text('kod').notNull(), ad: text('ad').notNull(), oran: doublePrecision('oran').notNull().default(0), createdAt: ts(),
}, (t) => ({ byTenant: index('kk_tenant').on(t.tenantId) }));

export const tevkifatKodlari = pgTable('tevkifat_kodlari', {
  id: id(), tenantId: tenant(), kod: text('kod').notNull(), ad: text('ad').notNull(), oran: doublePrecision('oran').notNull().default(0), createdAt: ts(),
}, (t) => ({ byTenant: index('tk_tenant').on(t.tenantId) }));

export const olcuBirimleri = pgTable('olcu_birimleri', {
  id: id(), tenantId: tenant(), kod: text('kod').notNull(), ad: text('ad').notNull(), createdAt: ts(),
}, (t) => ({ byTenant: index('ob_tenant').on(t.tenantId) }));

export const paraBirimleri = pgTable('para_birimleri', {
  id: id(), tenantId: tenant(), kod: text('kod').notNull(), ad: text('ad').notNull(), kur: doublePrecision('kur').notNull().default(1), createdAt: ts(),
}, (t) => ({ byTenant: index('pb_tenant').on(t.tenantId) }));

export const masrafTurleri = pgTable('masraf_turleri', {
  id: id(), tenantId: tenant(), kod: text('kod').notNull(), ad: text('ad').notNull(), createdAt: ts(),
}, (t) => ({ byTenant: index('mt_tenant').on(t.tenantId) }));

export const hareketTipleri = pgTable('hareket_tipleri', {
  id: id(), tenantId: tenant(), kod: text('kod').notNull(), ad: text('ad').notNull(), yon: text('yon').notNull().default('BORC'), createdAt: ts(),
}, (t) => ({ byTenant: index('ht_tenant').on(t.tenantId) }));

export const posTanimlari = pgTable('pos_tanimlari', {
  id: id(), tenantId: tenant(), kod: text('kod').notNull(), ad: text('ad').notNull(),
  bankaHesapId: text('banka_hesap_id'), komisyonOrani: doublePrecision('komisyon_orani').notNull().default(0), createdAt: ts(),
}, (t) => ({ byTenant: index('pos_tenant').on(t.tenantId) }));

export const isyeri = pgTable('isyeri', {
  id: id(), tenantId: tenant(), kod: text('kod').notNull(), unvan: text('unvan').notNull(), vkn: text('vkn'), adres: text('adres'),
  hksKomisyonOrani: doublePrecision('hks_komisyon_orani').notNull().default(0.08),
  hksKomisyonKdvOrani: doublePrecision('hks_komisyon_kdv_orani').notNull().default(0.2),
  hksGelirVergisiOrani: doublePrecision('hks_gelir_vergisi_orani').notNull().default(0.02), createdAt: ts(),
}, (t) => ({ byTenant: index('iy_tenant').on(t.tenantId) }));

export const subeler = pgTable('subeler', {
  id: id(), tenantId: tenant(), kod: text('kod').notNull(), ad: text('ad').notNull(), createdAt: ts(),
}, (t) => ({ byTenant: index('su_tenant').on(t.tenantId) }));

// ---------- Transactions ----------

export const cariHareketler = pgTable('cari_hareketler', {
  id: id(), tenantId: tenant(), cariId: text('cari_id').notNull(), tarih: text('tarih').notNull(), aciklama: text('aciklama'),
  borc: doublePrecision('borc').notNull().default(0), alacak: doublePrecision('alacak').notNull().default(0),
  belgeTip: text('belge_tip'), belgeId: text('belge_id'), createdAt: ts(),
}, (t) => ({ byCari: index('cari_hareket_cari').on(t.tenantId, t.cariId), byTarih: index('cari_hareket_tarih').on(t.tenantId, t.tarih) }));

export const kasaHareketler = pgTable('kasa_hareketler', {
  id: id(), tenantId: tenant(), kasaId: text('kasa_id').notNull(), tarih: text('tarih').notNull(), aciklama: text('aciklama'),
  giris: doublePrecision('giris').notNull().default(0), cikis: doublePrecision('cikis').notNull().default(0),
  belgeTip: text('belge_tip'), belgeId: text('belge_id'), createdAt: ts(),
}, (t) => ({ byKasa: index('kasa_hareket_kasa').on(t.tenantId, t.kasaId) }));

export const stokHareketler = pgTable('stok_hareketler', {
  id: id(), tenantId: tenant(), depoId: text('depo_id').notNull(), balikCinsId: text('balik_cins_id').notNull(), tarih: text('tarih').notNull(),
  giris: doublePrecision('giris').notNull().default(0), cikis: doublePrecision('cikis').notNull().default(0),
  birimMaliyet: doublePrecision('birim_maliyet').notNull().default(0), belgeTip: text('belge_tip'), belgeId: text('belge_id'), createdAt: ts(),
}, (t) => ({ byDepoCins: index('stok_hareket_dc').on(t.tenantId, t.depoId, t.balikCinsId) }));

export const fisler = pgTable('fisler', {
  id: id(), tenantId: tenant(), tip: text('tip').notNull(), no: text('no').notNull(), tarih: text('tarih').notNull(),
  aliciCariId: text('alici_cari_id'), mustahsilCariId: text('mustahsil_cari_id'), kunyeNo: text('kunye_no'),
  depoId: text('depo_id'), kasaId: text('kasa_id'), odemeTipi: text('odeme_tipi').notNull().default('VERESIYE'),
  brutTutar: doublePrecision('brut_tutar').notNull().default(0), komisyonTutar: doublePrecision('komisyon_tutar').notNull().default(0),
  rusumTutar: doublePrecision('rusum_tutar').notNull().default(0), stopajTutar: doublePrecision('stopaj_tutar').notNull().default(0),
  tevkifatTutar: doublePrecision('tevkifat_tutar').notNull().default(0), netTutar: doublePrecision('net_tutar').notNull().default(0),
  durum: text('durum').notNull().default('TASLAK'), efaturaId: text('efatura_id'), createdAt: ts(),
}, (t) => ({ byTenant: index('fis_tenant').on(t.tenantId, t.tip), byTarih: index('fis_tarih').on(t.tenantId, t.tarih) }));

export const fisSatirlari = pgTable('fis_satirlari', {
  id: id(), tenantId: tenant(), fisId: text('fis_id').notNull(), balikCinsId: text('balik_cins_id').notNull(),
  kapAdet: doublePrecision('kap_adet').notNull().default(0), miktar: doublePrecision('miktar').notNull().default(0),
  birimFiyat: doublePrecision('birim_fiyat').notNull().default(0), tutar: doublePrecision('tutar').notNull().default(0), createdAt: ts(),
}, (t) => ({ byFis: index('fissatir_fis').on(t.tenantId, t.fisId) }));

export const cekler = pgTable('cekler', {
  id: id(), tenantId: tenant(), yon: text('yon').notNull().default('GIRIS'), cariId: text('cari_id'), bankaId: text('banka_id'),
  cekNo: text('cek_no').notNull(), tutar: doublePrecision('tutar').notNull().default(0), vadeTarihi: text('vade_tarihi'),
  durum: text('durum').notNull().default('PORTFOYDE'), createdAt: ts(),
}, (t) => ({ byTenant: index('cek_tenant').on(t.tenantId, t.durum) }));

export const masraflar = pgTable('masraflar', {
  id: id(), tenantId: tenant(), tarih: text('tarih').notNull(), masrafTuruId: text('masraf_turu_id'), kasaId: text('kasa_id'),
  aciklama: text('aciklama'), tutar: doublePrecision('tutar').notNull().default(0), createdAt: ts(),
}, (t) => ({ byTenant: index('masraf_tenant').on(t.tenantId) }));

export const ebelgeler = pgTable('ebelgeler', {
  id: id(), tenantId: tenant(), tur: text('tur').notNull(), yon: text('yon').notNull().default('GIDEN'),
  fisId: text('fis_id'), cariId: text('cari_id'), uuid: text('uuid'), no: text('no'),
  tutar: doublePrecision('tutar').notNull().default(0), durum: text('durum').notNull().default('TASLAK'),
  saglayici: text('saglayici').notNull().default('UYUMSOFT_MOCK'), html: text('html'), createdAt: ts(),
}, (t) => ({ byTenant: index('ebelge_tenant').on(t.tenantId, t.tur) }));

export const odemeler = pgTable('odemeler', {
  id: id(), tenantId: tenant(), cariId: text('cari_id'), posId: text('pos_id'), token: text('token'),
  tutar: doublePrecision('tutar').notNull().default(0), durum: text('durum').notNull().default('BASLATILDI'),
  saglayici: text('saglayici').notNull().default('MOCK_GATEWAY'), createdAt: ts(),
}, (t) => ({ byTenant: index('odeme_tenant').on(t.tenantId) }));
