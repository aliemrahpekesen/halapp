# HalBoxPro — Balık Hali Yönetim Sistemi (clone)

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

## Modules (Phase 1 — complete)

| Alan | Kapsam |
|---|---|
| Kimlik/Erişim | register/login/forgot/reset, JWT, rol bazlı yetki (SuperAdmin/Admin/Muhasebe/Tahsilatci/ReadOnly), audit log |
| Parametreler | balık cins/grup, cari hesaplar, kasa, depo, banka, KDV/tevkifat, ölçü/para birimi, POS, işyeri/şube (17 varlık) |
| Cari & Satış | HKS kesinti motoru (komisyon/rüsum/stopaj/tevkifat→net), satış/alış-satış/mahsup fişi, ekstre, günlük gelen balık, risk limiti |
| Finans | tahsil/tediye, kasa işlem/devir, masraf, çek portföy yaşam döngüsü |
| Stok | bakiye, hareket/transfer/sayım fişi, ekstre |
| e-Belge | mock Uyumsoft: e-fatura/e-müstahsil/e-irsaliye, gelen belgeler, dashboard, ayarlar |
| Ödeme | mock gateway: kart tahsilat (3DS akışı), iade |
| Raporlar | komisyon, mizan, ortalama maliyet, mali analiz, günlük analiz, CSV export |
| Yönetim | kullanıcı & rol, yetki matrisi, audit viewer, bildirim, destek, tenant admin, dashboard |
| Mobil/PWA | hızlı tahsilat + bakiyeler, kurulabilir PWA |

**Test durumu:** 66 backend (Vitest) + 5 e2e (Playwright) yeşil.

## Project tracking

Epics, features, user stories and phases are tracked as GitHub issues (labels: `epic`, `story`, `phase-1`, `phase-2`, `epic:*`, `bug`). Phase-1 tamamlandı; açık kalan issue'lar yalnızca tasarımca ertelenen Phase-2 gerçek entegrasyonlarıdır (#11, #44–#46).
