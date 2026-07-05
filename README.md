# HalBoxPro — Balık Hali Yönetim Sistemi (clone)

**🌐 Canlı demo:** https://halapp.vercel.app — **kalıcı Supabase Postgres'e bağlı** (yazdığınız veriler kalır).

| İşletme | E-posta | Şifre | Rol |
|---|---|---|---|
| `demo` | `superadmin@demo.test` | `secret1` | SuperAdmin (kiracı yönetimi) |
| `demo` | `admin@demo.test` | `secret1` | Admin |
| `demo` | `muhasebe@demo.test` | `secret1` | Muhasebe |
| `demo` | `tahsilat@demo.test` | `secret1` | Tahsilatçı |
| `ege` | `admin@ege.test` | `secret1` | Admin (2. kiracı — izolasyon) |

> Mimari çift sürücülüdür: `DATABASE_URL` verilince Postgres (Supabase/Neon), verilmezse gömülü PGlite (test/geliştirme). Prod'da `DATABASE_URL` ayarlı.

Multi-tenant fish-market (balık hali) management system. TypeScript monorepo:

- **server/** — Fastify + Drizzle ORM + better-sqlite3 + Zod. Multi-tenant, JWT auth, page-level RBAC, audit log.
- **client/** — React + Vite + Ant Design PWA.

> e-Belge (Uyumsoft) and payment gateway are implemented against **mock providers with mock credentials** in Phase 1 — they behave as if working. Real integrations are Phase 2 (see GitHub issues labeled `phase-2`).

## Quick start

```bash
npm install          # install all workspaces
npm run migrate      # create the SQLite schema (server/data/halboxpro.sqlite)
npm run seed         # seed 2 demo tenants (demo / ege), users: admin@demo.test / secret1
npm run dev          # API on :3001, client on :5173
npm test             # server unit + integration tests (Vitest)
npm run test:e2e     # Playwright e2e (client, against localhost)
```

## Demo logins (after `npm run seed`)

| Tenant slug | Email | Şifre | Rol |
|---|---|---|---|
| demo | admin@demo.test | secret1 | Admin |
| demo | muhasebe@demo.test | secret1 | Muhasebe |
| demo | tahsilat@demo.test | secret1 | Tahsilatci |
| ege | admin@ege.test | secret1 | Admin |

## Architecture

- **Tenancy:** every table carries `tenant_id`; all access is tenant-scoped (`src/core/crud.ts`, repository helpers). Isolation is enforced and tested (`test/tenant-isolation.test.ts`).
- **Auth:** `src/auth/routes.ts` — register/login/forgot/reset, JWT with `{sub, tenantId, role, email}`.
- **RBAC:** `src/core/rbac.ts` — role→page→action matrix; `assertCan` guards routes.
- **Audit:** `src/core/audit.ts` — every mutation records before/after in `audit_logs`.
- **Ledgers:** account/cash/stock balances derive from movement tables (`cari_hareketler`, `kasa_hareketler`, `stok_hareketler`).
- **Providers:** `src/providers/*` — e-belge and payment behind interfaces so Phase-2 real implementations swap in without touching callers.

## Optional: Claude Code SessionStart hook

To auto-install deps in fresh web sessions, add to `.claude/settings.json`:

```json
{ "hooks": { "SessionStart": [ { "matcher": "*", "hooks": [ { "type": "command", "command": "bash scripts/session-start.sh" } ] } ] } }
```

## Güvenlik & Kalite (2 turluk adversarial denetimden geçti)

- Kimlik: JWT (12s süre, prod'da zayıf secret ile boot engeli), bcrypt(10), **DB-tabanlı login kilidi** (instance'lar arası brute-force koruması), şifre sıfırlama yalnızca e-posta ile (yanıtta token yok), sabit-zamanlı giriş.
- Erişim: sayfa bazlı RBAC (her uç noktada), sıkı çok-kiracılı izolasyon (okuma+yazma, testli), FK sahiplik doğrulaması, kiracı yönetimi yalnız SuperAdmin.
- Ağ/başlık: helmet CSP + güvenlik başlıkları, HSTS, rate-limit (trustProxy=1), CORS kısıtlı, prod hata maskeleme.
- Muhasebe bütünlüğü: atomik transaction'lar, iptal/iade tam ters kayıt (kart iadesi + karşılıksız çek dahil), komisyon/rüsum/stopaj/KDV mutabakatlı raporlar, tek kaynak kesinti motoru.
- **82 backend + 5 e2e test yeşil**; grafikler dataviz doğrulanmış paletle; route bazlı code-splitting; dark mode.

## Modules (Phase 1 — complete)

| Alan | Kapsam |
|---|---|
| Kimlik/Erişim | register/login/forgot/reset, JWT, rol bazlı yetki (SuperAdmin/Admin/Muhasebe/Tahsilatci/ReadOnly), audit log |
| Parametreler | balık cins/grup, cari hesaplar, kasa, depo, banka, KDV/tevkifat, ölçü/para birimi, POS, işyeri/şube (17 varlık) |
| Cari & Satış | HKS kesinti motoru (komisyon/rüsum/stopaj/tevkifat→net), satış/alış-satış/mahsup fişi, ekstre, günlük gelen balık, risk limiti |
| Finans | tahsil/tediye, kasa işlem/devir, masraf, çek portföy yaşam döngüsü |
| Stok | bakiye, hareket/transfer/sayım fişi, ekstre |
| Boş Kasa / Ambalaj | kap ver/iade, alıcı bazında açık kap bakiyesi, depozito (sektörün en büyük görünmez kayıp kalemi) |
| e-Belge | mock Uyumsoft: e-fatura/e-müstahsil/e-irsaliye, gelen belgeler, dashboard, ayarlar |
| Ödeme | mock gateway: kart tahsilat (3DS akışı), iade |
| Raporlar | komisyon, mizan, ortalama maliyet, mali analiz, günlük analiz, CSV export |
| Yönetim | kullanıcı & rol, yetki matrisi, audit viewer, bildirim, destek, tenant admin, dashboard |
| Mobil/PWA | hızlı tahsilat + bakiyeler, kurulabilir PWA |

**Test durumu:** 66 backend (Vitest) + 5 e2e (Playwright) yeşil.

## Project tracking

Epics, features, user stories and phases are tracked as GitHub issues (labels: `epic`, `story`, `phase-1`, `phase-2`, `epic:*`, `bug`). Phase-1 tamamlandı; açık kalan issue'lar yalnızca tasarımca ertelenen Phase-2 gerçek entegrasyonlarıdır (#11, #44–#46).
