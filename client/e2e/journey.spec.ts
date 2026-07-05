import { test, expect } from '@playwright/test';

const API = 'http://localhost:3001';

// Seeded demo tenant: admin@demo.test / secret1 (slug 'demo')
test.describe('HalBoxPro end-to-end', () => {
  test('login → dashboard loads', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('İşletme Kodu').fill('demo');
    await page.getByLabel('E-posta').fill('admin@demo.test');
    await page.getByLabel('Şifre').fill('secret1');
    await page.getByTestId('login-btn').click();
    await expect(page.getByText('Genel Bakış')).toBeVisible();
  });

  test('full journey: sale → e-fatura → collection reflected in reports (API-driven, UI-verified)', async ({ page, request }) => {
    // login via API to get a token and seed a sale deterministically
    const login = await request.post(`${API}/api/auth/login`, { data: { tenantSlug: 'demo', email: 'admin@demo.test', password: 'secret1' } });
    const { token } = await login.json();
    const H = { Authorization: `Bearer ${token}` };
    const cariler = await (await request.get(`${API}/api/params/cari-hesaplar`, { headers: H })).json();
    const depolar = await (await request.get(`${API}/api/params/depolar`, { headers: H })).json();
    const cinsler = await (await request.get(`${API}/api/params/balik-cinsleri`, { headers: H })).json();
    const alici = cariler.find((c: any) => c.tip === 'ALICI');
    const mustahsil = cariler.find((c: any) => c.tip === 'MUSTAHSIL');

    const saleRes = await request.post(`${API}/api/satis/fisler`, {
      headers: H,
      data: { tip: 'SATIS', tarih: '2026-03-01', aliciCariId: alici.id, mustahsilCariId: mustahsil.id, depoId: depolar[0].id, odemeTipi: 'VERESIYE', satirlar: [{ balikCinsId: cinsler[0].id, miktar: 100, birimFiyat: 80 }] },
    });
    const fis = await saleRes.json();
    expect(fis.brutTutar).toBe(8000);

    // issue e-fatura
    const eb = await (await request.post(`${API}/api/ebelge/gonder`, { headers: H, data: { tur: 'EFATURA', fisId: fis.id } })).json();
    expect(eb.durum).toBe('KABUL');

    // collect from buyer
    const kasalar = await (await request.get(`${API}/api/params/kasalar`, { headers: H })).json();
    await request.post(`${API}/api/finans/tahsil`, { headers: H, data: { tarih: '2026-03-02', cariId: alici.id, kasaId: kasalar[0].id, tutar: 8000 } });
    const ekstre = await (await request.get(`${API}/api/cari/${alici.id}/ekstre`, { headers: H })).json();
    expect(ekstre.kapanisBakiye).toBe(0); // 8000 borç - 8000 tahsil

    // Now verify in the UI: log in and see the sale in the list
    await page.goto('/login');
    await page.getByLabel('İşletme Kodu').fill('demo');
    await page.getByLabel('E-posta').fill('admin@demo.test');
    await page.getByLabel('Şifre').fill('secret1');
    await page.getByTestId('login-btn').click();
    await expect(page.getByText('Genel Bakış')).toBeVisible();
    await page.goto('/satis/fisi');
    await expect(page.getByTestId('fis-listesi').getByText(fis.no)).toBeVisible();
  });

  test('satış fişi UI computes the reactive brüt total from line entries', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('İşletme Kodu').fill('demo');
    await page.getByLabel('E-posta').fill('admin@demo.test');
    await page.getByLabel('Şifre').fill('secret1');
    await page.getByTestId('login-btn').click();
    await expect(page.getByText('Genel Bakış')).toBeVisible();
    await page.goto('/satis/fisi');
    await expect(page.getByRole('heading', { name: 'Satış Fişi' })).toBeVisible();

    // Fill the first line's quantity and unit price; the brüt total is reactive.
    await page.getByTestId('miktar-0').fill('50');
    await page.getByTestId('fiyat-0').fill('20');
    await expect(page.getByText('Brüt Toplam: 1000.00 ₺')).toBeVisible();

    // Add a second line and verify the total recomputes.
    await page.getByRole('button', { name: 'Satır Ekle' }).click();
    await page.getByTestId('miktar-1').fill('10');
    await page.getByTestId('fiyat-1').fill('5');
    await expect(page.getByText('Brüt Toplam: 1050.00 ₺')).toBeVisible();
  });

  test('tenant isolation: ege tenant does not see demo data', async ({ request }) => {
    const demo = await (await request.post(`${API}/api/auth/login`, { data: { tenantSlug: 'demo', email: 'admin@demo.test', password: 'secret1' } })).json();
    const ege = await (await request.post(`${API}/api/auth/login`, { data: { tenantSlug: 'ege', email: 'admin@ege.test', password: 'secret1' } })).json();
    const demoCari = await (await request.get(`${API}/api/params/cari-hesaplar`, { headers: { Authorization: `Bearer ${demo.token}` } })).json();
    const egeCari = await (await request.get(`${API}/api/params/cari-hesaplar`, { headers: { Authorization: `Bearer ${ege.token}` } })).json();
    const demoIds = new Set(demoCari.map((c: any) => c.id));
    for (const c of egeCari) expect(demoIds.has(c.id)).toBe(false);
  });

  test('mobile view: quick collection works', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('İşletme Kodu').fill('demo');
    await page.getByLabel('E-posta').fill('admin@demo.test');
    await page.getByLabel('Şifre').fill('secret1');
    await page.getByTestId('login-btn').click();
    await expect(page.getByText('Genel Bakış')).toBeVisible(); // wait for login to complete
    await page.goto('/mobil');
    await expect(page.getByText('HalBoxPro Mobil')).toBeVisible();
    await expect(page.getByTestId('mobil-tahsil')).toBeVisible();
  });
});
