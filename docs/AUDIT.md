# HalBoxPro — Mevcut Uygulama Denetimi (Teknik/Fonksiyonel Envanter)

**Tarih:** 2026-07-02
**Kaynak:** `https://test.halboxpro.esesoft.com`
**Yöntem:** Aşağıdaki "Yöntem ve kısıt" notuna bakınız.

---

## Yöntem ve kısıt (önemli)

Ağ politikası açıldıktan sonra siteye erişildi; ancak bu çalışma ortamındaki
sandbox tarayıcısı (Chromium) agent proxy üzerinden **hiçbir HTTPS sitesiyle**
TLS el sıkışmasını tamamlayamadı (example.com/google dahil — bilinen bir
tarayıcı/proxy uyumsuzluğu, siteye özel değil). Bu nedenle uygulamaya arayüzden
girip sayfaları **tıklayarak gezmek ve ekran görüntüsü almak mümkün olmadı**.

Bunun yerine uygulamanın **derlenmiş kaynak kodu** (`curl` ile indirilen React
bundle'ı, `manifest.webmanifest`, CSS) analiz edildi. Bu yöntem;
**modül/route envanterini, API yüzeyini, rolleri, entegrasyonları ve teknoloji
yığınını gerçek veriyle** ortaya koyar — varsayım değildir. Ancak şunları
**ölçemez**: gerçek kullanıcı deneyimi, ekran akış hızları, veri doğrulama
kalitesi, mobil cilası, hata yönetimi ve performans. Bu boyutlar canlı bir
oturumla (yerel tarayıcıdan giriş) doğrulanmalıdır ve aşağıda "gözlemlenemedi"
olarak işaretlenmiştir.

---

## 1. Teknoloji Yığını (kanıta dayalı)

| Katman | Tespit | Kanıt |
|---|---|---|
| Frontend | React SPA, Vite ile derlenmiş, Ant Design (tema `#1677FF`) | bundle yapısı, chunk isimleri |
| PWA | Kurulabilir uygulama, service worker (`/sw.js`), masaüstü+mobil | `manifest.webmanifest`, meta etiketleri |
| Backend | ASP.NET Core (.NET), REST API aynı origin (`/api/...` PascalCase) | API path kalıpları |
| Realtime | SignalR (canlı izleme, mesajlaşma, zorla çıkış, yayın) | `aka.ms/signalr-core-differences`, `/api/admin/monitor/*` |
| Mimari | Çok kiracılı (multi-tenant) SaaS | `/api/tenants`, `/api/system` |
| e-Belge | **Uyumsoft** entegratörü | `api.uyumsoft.com.tr`, `test.api.uyumsoft.com.tr` |
| Mesajlaşma | WhatsApp (wa.me) | `/api/halboxpro/whatsapp/*`, `whatsapp-rapor` |
| Diğer | Döviz kuru servisi, dosya ekleri, kayıt kilidi (eşzamanlılık) | `/api/doviz-kur`, `/api/ekdosya`, `/api/recordlock` |

**Sektör düzeltmesi:** Uygulama bir **balık hali / su ürünleri hali** yazılımıdır
(yaş sebze-meyve değil). Kanıt: `balik-cinsleri`, `balik-gruplari`,
`gunluk-gelen-balik`, "Balık Rüsum Oranı", sesli girişte "Balık adı anlaşılamadı".

---

## 2. Modül ve Sayfa Envanteri (route + API'den)

### Kimlik & Erişim
- Giriş, şifremi unuttum, şifre sıfırlama (`/api/Auth/login|forgot-password|reset-password`), landing.
- **Roller:** SuperAdmin, Admin, Muhasebe(ci), Tahsilatçı, ReadOnly.
- **Sayfa bazlı yetki matrisi:** `/api/yetki/matris`, `/roller`, `/sayfa-tanimlari`, `/kodlar` → ince taneli yetkilendirme mevcut.

### Panolar (Dashboard)
- Genel bakış, satış dashboard, mali analiz dashboard, e-belge dashboard.

### Cari & Satış Operasyonu (çekirdek)
Satış fişi, satış listesi, alış-satış fişi, mahsup fişi, tahsil(at), tediye,
gelir-gider, hesap ekstre, mizan, kasa durum, **komisyon raporu**,
**ortalama maliyet raporu**, mali analiz, günlük analiz raporu,
**günlük gelen balık raporu**, satıcı-tahsilatçı raporu, hatırlatmalar,
WhatsApp rapor.

### Finans (Çek & Kasa)
Çekler (giriş/çıkış bordro, devir giriş, işyeri çekleri, portföy durumu),
çek defterleri, kasa işlemleri, kasa devir, masraf listesi.

### e-Belge (Uyumsoft)
Dashboard, e-Fatura, alış fatura, **e-Müstahsil makbuzu**, **e-İrsaliye**,
gelen faturalar, gelen e-arşiv, sağlayıcı/hesap/seri/şablon ayarları,
önizleme, PDF/HTML, log, mükellef sorgu, bağlantı testi, e-fatura eşleme.

### Stok
Bakiye, ekstre, hareket fişi, transfer fişi, **sayım fişi**, stok sorgu.

### Parametreler (tanımlar)
Balık cinsleri/grupları, cari hesaplar, bankalar/banka hesapları/şubeleri,
kasalar, depolar, işyeri, şube, KDV kodları, **tevkifat kodları/matrisi**,
ölçü birimleri, para birimleri, hesap cinsleri, hareket tipleri, masraf türleri,
kredi kartı & POS tanımları, **alan tanımı/alan değeri (özel alanlar)**.

### Sistem
Cari birleştirme (önizle/birleştir), cari devir (manuel/toplu), cari kod değiştir,
**yedekleme & felaket kurtarma** (backup status/trigger/dr-status/test-notification).

### Yönetim (Admin)
Kullanıcılar, roller/yetki, destek talepleri, change-request (değişiklik onayı),
**canlı monitör** (çevrimiçi kullanıcı, mesaj/toplu mesaj/yayın gönder, zorla
çıkış, dosya yükle), **değişiklik geçmişi (audit log)**, hata logları (error-logs),
e-posta ayarı, döviz kuru güncelleme.

### Mobil (`/mobil/*`)
Cari bakiye, cari ekstre, tahsilat, tediye, diğer ödemeler, fiş listesi/detay,
tahsilatçı raporu, **sesli giriş (voice)**.

### Yardımcı / Çapraz
Bildirim merkezi (okunmamış sayısı, tümünü okundu), ajanda-not (takvim),
işlem notları, hatırlatma, ek dosya, **piyasa (fiyatları)**, yardım,
**klavye kısayolları**.

---

## 3. Mevzuat / Sektör Fonksiyonları (kanıt)

Mevcut: HKS komisyoncu/satış kavramları, **KunyeNo** alanı, Müstahsil makbuzu,
Komisyon (oran/KDV/belge/e-belge durumu), **Rüsum oranı**, **Stopaj/Gelir Vergisi**,
**Tevkifat kodları ve matrisi**, HKS komisyon/gelir vergisi/KDV oranları
(`hksKomisyonOrani`, `hksGelirVergisiOrani`, `hksKomisyonKdvOrani`).

**Not (doğrulanmalı):** Frontend'de yalnızca `KunyeNo` alanı görülüyor;
hal.gov.tr HKS sistemine **otomatik bildirim gönderimi** frontend'den
kanıtlanamadı. Bu işlev sunucu tarafında olabilir; canlı denetimde
doğrulanmalıdır.

---

## 4. Öne Çıkan Güçlü Yönler (beklenenden olgun)

1. Kapsamlı e-Belge entegrasyonu (Uyumsoft): e-fatura, e-müstahsil, e-irsaliye, gelen belgeler.
2. Gerçek zamanlı yönetim/izleme (SignalR): çevrimiçi kullanıcılar, anlık mesaj/yayın, zorla çıkış.
3. Sayfa bazlı yetkilendirme + rol matrisi + **audit log (değişiklik geçmişi)**.
4. Mobil arayüz + **sesli giriş** ve **klavye kısayolları** (hız odaklı UX sinyalleri).
5. WhatsApp ile belge/rapor gönderimi.
6. Yedekleme/felaket kurtarma yönetimi, hata logları, kayıt kilidi (eşzamanlılık).
7. Çok kiracılı SaaS, döviz desteği, özel alan tanımları (esneklik).

## 5. Olası Boşluklar / İyileştirme Alanları (kanıta dayalı)

| # | Bulgu | Durum | Not |
|---|---|---|---|
| G1 | **Boş kasa / ambalaj (kap) depozito takibi** | Endpoint bulunamadı → muhtemelen yok | Hal sektöründe yüksek değerli kayıp kalemi; net fırsat |
| G2 | HKS **otomatik devlet bildirimi** | Frontend'de kanıtlanamadı | Sunucu tarafı olabilir; doğrulanmalı |
| G3 | **Müstahsil self-servis portalı** | Yok (e-müstahsil + WhatsApp var, portal yok) | "Malım satıldı mı?" telefon trafiğini azaltır |
| G4 | **Alıcı portalı / gece sipariş** | Yok | Yeni gelir/verimlilik fırsatı |
| G5 | **Kantar (tartı) entegrasyonu** | Kanıtlanamadı | Balık halinde net kg kritik |
| G6 | Balık haline özel **mezat/açık artırma** akışı | Kanıtlanamadı | Bazı su ürünleri hallerinde ihtiyaç |
| G7 | **Soğuk zincir / tazelik / parti izlenebilirlik** | Kanıtlanamadı | Su ürünlerinde gıda güvenliği boyutu |
| G8 | Gelişmiş **BI/analitik** (trend, kıyas panoları) | Kısmi (mali-analiz dashboard var) | Derinleştirilebilir |

## 6. Gözlemlenemedi (canlı doğrulama gerekli)

- Satış/mal kabul ekranlarının gerçek giriş hızı ve klavye akışı.
- Veri doğrulama, hata mesajları ve kenar durumların kalitesi.
- Mobil arayüzün cilası ve çevrimdışı davranışı.
- Performans (büyük veri hacminde liste/rapor süreleri).
- HKS/e-belge gerçek gönderim başarım oranları.

> Bu bölüm, yerel bir tarayıcıdan `selamikoc@gmail.com` hesabıyla girilerek
> ekran görüntüleriyle tamamlanmalıdır.
