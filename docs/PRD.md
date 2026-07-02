# HalBoxPro — Ürün Gereksinim Dokümanı (PRD)

**Sürüm:** 1.0 (kanıta dayalı) · **Tarih:** 2026-07-02
**İlgili doküman:** [AUDIT.md](./AUDIT.md) (mevcut uygulama envanteri) · [PLAN.md](./PLAN.md)
**Durum:** Onaya hazır

> **Yöntem notu:** Bu sürüm, mevcut uygulamanın derlenmiş kaynak kodu (React
> bundle, route/API haritası) analiz edilerek yazıldı — bkz. [AUDIT.md](./AUDIT.md).
> Modül ve entegrasyon envanteri gerçek veriye dayanır. Kullanıcı deneyimi,
> performans ve akış hızı gibi ancak canlı oturumla gözlemlenebilecek noktalar
> "doğrulanacak" olarak işaretlenmiştir (sandbox tarayıcısı proxy üzerinden
> siteyi render edemediği için tıklayarak gezilemedi).

---

## 1. Ürün Amacı

**HalBoxPro**, **balık hali / su ürünleri toptancı hali**nde faaliyet gösteren
komisyoncu ve tüccarların tüm ticari ve mali operasyonunu yöneten, çok kiracılı
(SaaS), masaüstü + mobil (PWA) bir hal yönetim sistemidir. Mal kabul, satış,
cari/finans, çek-kasa, e-belge (Uyumsoft), HKS kesintileri (komisyon, rüsum,
stopaj, tevkifat), stok, raporlama ve yönetim/denetim işlevlerini kapsar.

**Bu PRD'nin amacı:** Halihazırda olgun olan bu ürünü, gerçek boşlukları
kapatarak ve deneyim/otomasyonu derinleştirerek **bir üst kaliteye** taşımak
için hedefleri, aktörleri ve gereksinimleri tanımlamak.

---

## 2. Mevcut Durumun Özeti (kanıta dayalı)

Ürün beklenenden olgundur. Zaten mevcut olan başlıca yetenekler:

- **Çekirdek:** Satış/alış-satış fişi, mahsup, tahsil/tediye, cari ekstre, mizan, komisyon ve ortalama maliyet raporları, günlük gelen balık raporu.
- **Finans:** Çek portföyü (giriş/çıkış/devir/işyeri), kasa işlemleri/devir, masraf.
- **e-Belge (Uyumsoft):** e-Fatura, e-Müstahsil, e-İrsaliye, gelen fatura/e-arşiv, şablon/seri/hesap ayarları.
- **HKS kesintileri:** Künye no, komisyon (oran/KDV), rüsum, gelir vergisi stopajı, tevkifat kodları ve matrisi.
- **Stok:** Bakiye, ekstre, hareket/transfer/sayım fişi, stok sorgu.
- **Mobil (PWA):** Cari bakiye/ekstre, tahsilat/tediye, fiş listesi, **sesli giriş**.
- **Yönetim:** Rol + **sayfa bazlı yetki matrisi**, **audit log**, canlı monitör (SignalR), destek talepleri, yedekleme/DR, hata logları.
- **Çapraz:** WhatsApp gönderimi, bildirim merkezi, ajanda/notlar, döviz, klavye kısayolları, özel alan tanımları.

Tam envanter için bkz. [AUDIT.md](./AUDIT.md).

---

## 3. Aktörler ve Fonksiyonalite Setleri

### 3.1 Patron / İşletme Sahibi
- Anlık ciro, kâr, kasa/banka, veresiye riski (dashboard + mobil — mevcut, derinleştirilecek).
- Kullanıcı/yetki yönetimi, kritik işlem onayı (change-request akışı mevcut).
- Gün sonu özeti ve olağan dışı işlem uyarıları (bildirim altyapısı mevcut).

### 3.2 Kâtip / Satış Operatörü
- Hızlı satış/mal kabul girişi; klavye kısayolları (mevcut) — **giriş hızı doğrulanacak ve optimize edilecek**.
- Günlük gelen balık, satış listesi, stok bakiye görünürlüğü.
- Yetki dahilinde düzeltme/iptal — audit log'a düşer (mevcut).

### 3.3 Muhasebeci / Ön Muhasebe
- Komisyon/rüsum/stopaj/tevkifat ile müstahsil hesap kesimi ve e-müstahsil (mevcut).
- e-Fatura/e-arşiv/e-irsaliye üretimi, gelen belge yönetimi (mevcut).
- Cari, mizan, ekstre, çek-senet, kasa; mahsup fişi (mevcut).

### 3.4 Tahsilatçı / Saha Personeli (mobil)
- Açık bakiyeler, sahada tahsilat/tediye, tahsilatçı raporu (mevcut) — **mobil UX ve çevrimdışı davranış doğrulanacak**.

### 3.5 Müstahsil / Üretici — **YENİ (öneri)**
- Self-servis portal: gönderdiği balığın satış durumu, hesap özeti; satışta otomatik bildirim (bugün yalnızca WhatsApp gönderimi var, portal yok — bkz. G3).

### 3.6 Alıcı — **YENİ (öneri, Faz 3)**
- Ekstre görüntüleme ve **gece sipariş** portalı (bkz. G4).

### 3.7 SuperAdmin / Esesoft
- Kiracı yönetimi, canlı monitör, yedekleme/DR, destek (mevcut).

---

## 4. İyileştirme Gereksinimleri (öncelikli — gerçek boşluklar)

> Bu bölüm, [AUDIT.md](./AUDIT.md) §5'teki kanıta dayalı boşluklara odaklanır.
> Mevcut modüllerin yeniden yazımını değil, **eksik değer ve kalite** artışını hedefler.

### R1 — Boş Kasa / Ambalaj (Kap) Takibi Modülü  *(Boşluk G1 — Must)*
- FR-R1.1 Kap türü ve depozito tanımları (balık kasası, köpük kutu vb.).
- FR-R1.2 Alıcı/müstahsil bazında boş kap bakiyesi: satışta borçlanma, iade ile kapama.
- FR-R1.3 Kap mutabakat raporu, dönmeyen kap uyarısı, depozito faturalama opsiyonu.
- **Gerekçe:** Sektörün en büyük görünmez kayıp kalemlerinden; mevcutta yok.

### R2 — HKS Devlet Bildirimi Otomasyonu ve İzleme  *(Boşluk G2 — Must, doğrulanacak)*
- FR-R2.1 Alım/satım/sevk bildirimlerinin otomatik gönderimi (varsa mevcut durumu doğrula, yoksa ekle).
- FR-R2.2 Bildirim durum panosu (gönderildi/hata/bekliyor), yeniden deneme kuyruğu, ceza riski uyarısı.
- FR-R2.3 Bildirilmemiş satış uyarı listesi → hedef sıfır.

### R3 — Müstahsil Self-Servis Portalı  *(Boşluk G3 — Should)*
- FR-R3.1 Müstahsil girişi: gönderdiği partinin kabul/satış/kalan durumu ve fiyatları.
- FR-R3.2 Hesap özeti, kesinti kırılımı, ödeme bilgisi; satış anında otomatik bildirim.
- **Gerekçe:** "Malım satıldı mı?" telefon trafiğini azaltır, güven artırır.

### R4 — Kantar (Tartı) Entegrasyonu  *(Boşluk G5 — Should)*
- FR-R4.1 Seri/IP kantardan net kg otomatik okuma; balık halinde kg doğruluğu kritik.

### R5 — Gelişmiş Analitik / BI  *(Boşluk G8 — Should)*
- FR-R5.1 Ürün/alıcı/müstahsil trend panoları, dönem kıyas, fiyat trendi.
- FR-R5.2 Zamanlanmış rapor (e-posta/WhatsApp), esnek filtre + Excel/PDF (kısmen mevcut, genişletilecek).

### R6 — Alıcı Portalı & Gece Sipariş  *(Boşluk G4 — Could, Faz 3)*
- FR-R6.1 Alıcıların gece sipariş girip sabah teslim alması; ekstre görüntüleme.

### R7 — Su Ürünlerine Özel: İzlenebilirlik / Tazelik  *(Boşluk G7 — Could)*
- FR-R7.1 Parti/menşe izlenebilirliği, tazelik/soğuk zincir notu (gıda güvenliği).
- FR-R7.2 (Opsiyonel) Mezat/açık artırma akışı — talebe göre (G6).

### R8 — Deneyim & Kalite Sertleştirme  *(sürekli — canlı denetime bağlı)*
- FR-R8.1 Satış/mal kabul giriş süresi ölçümü ve hedef ≤ 8 sn/kalem'e optimizasyon.
- FR-R8.2 Veri doğrulama, hata mesajı ve kenar durum kalitesinin gözden geçirilmesi.
- FR-R8.3 Mobil offline kuyruk ve senkronizasyonun doğrulanması/iyileştirilmesi.
- FR-R8.4 Büyük veri hacminde liste/rapor performans profillemesi.

---

## 5. Fonksiyonel Olmayan Gereksinimler (NFR)

- **Performans:** Satış kaydı < 300 ms; liste < 1 sn; 50k+ satırda akıcı rapor (canlı ölçüm ile doğrulanacak).
- **Kullanılabilirlik:** Tamamen klavyeyle satış; büyük punto "hal modu"; sesli giriş (mevcut) iyileştirme.
- **Dayanıklılık:** Mobil satış/tahsilatta çevrimdışı kuyruk ve senkronizasyon.
- **Güvenlik/Uyum:** Kiracı izolasyonu, sayfa bazlı yetki (mevcut), audit log (mevcut), KVKK, yedekleme + zaman-noktası geri dönüş (backup/DR mevcut).
- **Denetlenebilirlik:** Mali kayıtta silme yerine ters kayıt/iptal; değişiklik geçmişi (mevcut) tüm kritik varlıklara yayılmalı.
- **Erişilebilirlik penceresi:** Sabah kritik saatler; hedef %99,9.

---

## 6. Yol Haritası

| Faz | Kapsam | Çıktı |
|---|---|---|
| **Faz 0 — Canlı Doğrulama (1 hafta)** | Yerel tarayıcıdan giriş; AUDIT §6 "gözlemlenemedi" maddelerinin ekran görüntüleriyle doğrulanması; R2/G2'nin (HKS gönderimi) netleştirilmesi | Doğrulanmış AUDIT + kesin öncelik |
| **Faz 1 (2-3 ay)** | R1 Boş kasa, R2 HKS bildirim izleme, R8 deneyim/performans sertleştirme | En yüksek ROI'li boşluklar kapanır |
| **Faz 2 (2-3 ay)** | R3 Müstahsil portalı, R4 kantar, R5 BI/analitik | Farklılaşma |
| **Faz 3 (sürekli)** | R6 alıcı portalı/sipariş, R7 izlenebilirlik/mezat | Yeni gelir & niş kapsama |

---

## 7. Başarı Metrikleri (KPI)

- Satış kalemi ort. giriş süresi ≤ 8 sn (Faz 0'da mevcut ölçülecek).
- HKS bildirim başarı ≥ %99,5; bildirilmemiş satış → 0.
- Boş kasa modülü kullanan işletmelerde raporlanabilir kap kaybı azalması.
- Müstahsil portalı sonrası "malım satıldı mı?" temaslarında ölçülebilir düşüş.
- Aylık elde tutma ≥ %95; destek talebi başına çözüm süresi düşüşü.

---

## 8. Açık Sorular

| # | Soru | Karar sahibi |
|---|---|---|
| 1 | HKS otomatik devlet bildirimi mevcut mu (sunucu tarafı)? | Faz 0 doğrulama |
| 2 | Hedef segment: yalnız balık hali mi, diğer su ürünleri/haller de mi? | Ürün sahibi |
| 3 | Boş kasa modülü fiyatlaması (dahil/ek modül)? | İş geliştirme |
| 4 | Müstahsil/alıcı portalı önceliği | Ürün sahibi |
| 5 | Kantar donanım standardı (marka/protokol) | Saha ekibi |

---

## 9. Kaynaklar (sektör/mevzuat)

- [İç Ticaret Genel Müdürlüğü — Hal Kayıt Sistemi (HKS)](https://icticaret.ticaret.gov.tr/bilgi-sistemleri/hal-kayit-sistemi-hks)
- [BirFatura — Hal Tipi Fatura Rehberi](https://birfatura.com/hal-tipi-fatura-nedir-nasil-kesilir/)
- [Muhasebe Bilenler — Hal Komisyonculuğu ve Hal Muhasebesi](https://muhasebebilenler.com/hal-komisyonculugu-ve-hal-muhasebesi-uzerine-ozellikli-durumlar/)
- [DİA — HKS ile e-Fatura Düzenlemesi](https://diateknoloji.com/dia-bilgi-bankasi/hal-kayit-sistemi-ile-e-fatura-duzenlemesi/)
