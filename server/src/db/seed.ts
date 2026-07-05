import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb } from './index.js';
import * as s from './schema.js';

interface SeedTenant {
  slug: string;
  name: string;
  adminEmail: string;
}

const DEMO: SeedTenant[] = [
  { slug: 'demo', name: 'Demo Balık Hali', adminEmail: 'admin@demo.test' },
  { slug: 'ege', name: 'Ege Su Ürünleri', adminEmail: 'admin@ege.test' },
];

/** Idempotent: seeds two demo tenants with users, master data and sample data. */
export async function seed() {
  const db = getDb();
  for (const t of DEMO) {
    const existing = await db.select().from(s.tenants).where(eq(s.tenants.slug, t.slug));
    if (existing.length) {
      console.log(`Tenant ${t.slug} already seeded, skipping.`);
      continue;
    }
    const tenantId = nanoid();
    await db.insert(s.tenants).values({ id: tenantId, name: t.name, slug: t.slug });

    const mkUser = (email: string, role: string, name: string) =>
      db.insert(s.users).values({ id: nanoid(), tenantId, email, passwordHash: bcrypt.hashSync('secret1', 8), fullName: name, role });
    await mkUser(t.adminEmail, 'Admin', 'Yönetici');
    await mkUser(`muhasebe@${t.slug}.test`, 'Muhasebe', 'Muhasebeci');
    await mkUser(`tahsilat@${t.slug}.test`, 'Tahsilatci', 'Tahsilatçı');

    // Master data
    await db.insert(s.isyeri).values({ id: nanoid(), tenantId, kod: 'MERKEZ', unvan: t.name, vkn: '1234567890' });
    const depoId = nanoid();
    await db.insert(s.depolar).values({ id: depoId, tenantId, kod: 'ANA', ad: 'Ana Depo' });
    const kasaId = nanoid();
    await db.insert(s.kasalar).values({ id: kasaId, tenantId, kod: 'MERKEZ', ad: 'Merkez Kasa', paraBirimi: 'TRY' });
    await db.insert(s.kdvKodlari).values([
      { id: nanoid(), tenantId, kod: 'KDV1', ad: '%1', oran: 0.01 },
      { id: nanoid(), tenantId, kod: 'KDV10', ad: '%10', oran: 0.1 },
      { id: nanoid(), tenantId, kod: 'KDV20', ad: '%20', oran: 0.2 },
    ]);
    await db.insert(s.olcuBirimleri).values([
      { id: nanoid(), tenantId, kod: 'KG', ad: 'Kilogram' },
      { id: nanoid(), tenantId, kod: 'KASA', ad: 'Kasa' },
    ]);
    await db.insert(s.tevkifatKodlari).values([
      { id: nanoid(), tenantId, kod: 'GV', ad: 'Gelir Vergisi Stopajı', oran: 0.02 },
    ]);

    const grupId = nanoid();
    await db.insert(s.balikGruplari).values({ id: grupId, tenantId, kod: 'BEYAZ', ad: 'Beyaz Etli' });
    const cinsIds = [
      { id: nanoid(), tenantId, kod: 'HAMSI', ad: 'Hamsi', grupId, rusumOrani: 0.02, birim: 'KG' },
      { id: nanoid(), tenantId, kod: 'CIPURA', ad: 'Çipura', grupId, rusumOrani: 0.02, birim: 'KG' },
      { id: nanoid(), tenantId, kod: 'LEVREK', ad: 'Levrek', grupId, rusumOrani: 0.02, birim: 'KG' },
    ];
    await db.insert(s.balikCinsleri).values(cinsIds);

    const mustahsilId = nanoid();
    await db.insert(s.cariHesaplar).values({ id: mustahsilId, tenantId, kod: 'M001', unvan: 'Ahmet Balıkçı', tip: 'MUSTAHSIL', vknTckn: '11111111111' });
    const aliciId = nanoid();
    await db.insert(s.cariHesaplar).values({ id: aliciId, tenantId, kod: 'A001', unvan: 'Deniz Manav', tip: 'ALICI', riskLimiti: 100000 });

    console.log(`Seeded tenant ${t.slug} (admin ${t.adminEmail} / secret1)`);
  }
  console.log('Seed complete.');
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
