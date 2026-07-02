# HalApp — Ürün Gereksinim Dokümanı (PRD)

**Sürüm:** 0.1 (Taslak)
**Tarih:** 2026-07-02
**Hazırlayan:** PM analizi (Claude Code oturumu)
**Durum:** Onay bekliyor

> ⚠️ **Önemli not — kapsam kısıtı:** Bu doküman hazırlanırken `test.halboxpro.esesoft.com`
> adresindeki mevcut uygulamaya bu çalışma ortamının ağ politikası (network policy) izin
> vermediği için **canlı olarak erişilemedi ve sayfalar gezilemedi**. Doküman; alan adı,
> repo adı (halapp), Türkiye'deki yaş sebze-meyve hali (toptancı hal) sektörü, HKS mevzuatı
> ve rakip hal programları (Atlas Hal, Ofis Hal, Prohalci vb.) üzerine yapılan araştırmaya
> dayanmaktadır. Mevcut uygulamaya dair her tespit **[VARSAYIM]** olarak işaretlenmiştir.
> Ağ erişimi açıldığında uygulama gerçekten gezilerek bu doküman doğrulanmalı ve
> "Mevcut Durum Analizi" bölümü gerçek ekran görüntüleriyle güncellenmelidir.

---

## 1. Ürün Vizyonu ve Amaç

**HalApp**, Türkiye'deki toptancı hallerinde faaliyet gösteren **komisyoncu ve tüccarların**
tüm ticari operasyonunu — mal kabulden satışa, HKS bildiriminden müstahsil ödemesine,
veresiye takibinden boş kasa (ambalaj) takibine kadar — tek bir modern, hızlı ve
mobil uyumlu platformda yönetmesini sağlar.

**Problem:** Sektördeki mevcut yazılımlar (mevcut HalBox Pro dahil olmak üzere
[VARSAYIM]) çoğunlukla eski masaüstü mimarilerden gelen, kullanıcı deneyimi zayıf,
mobil desteği sınırlı, raporlaması katı ürünlerdir. Hal esnafının günlük ritmi
(sabah 04:00–09:00 arası yoğun satış, gün içi tahsilat ve mutabakat) hız ve
hatasızlık ister; mevzuat (HKS künye, e-belge, kesintiler) ise hata payı bırakmaz.

**Vizyon:** "Kâtibin sabah yoğunluğunda klavyeden elini kaldırmadan satış girebildiği,
patronun cebinden işletmesinin anlık kârını görebildiği, müstahsilin malının ne
zaman satıldığını WhatsApp'tan öğrendiği hal yazılımı."

**Neden daha kalitelisi mümkün:** Modern web teknolojisi + bulut mimarisi + mobil öncelikli
tasarım + HKS/e-belge derin entegrasyonu ile mevcut nesil ürünlerin üzerine çıkılabilir.

---

## 2. Pazar ve Rekabet Özeti

| Ürün | Güçlü yanı | Zayıf yanı (fırsat) |
|---|---|---|
| Atlas Hal (Atlas Pro) | 30+ yıl sektör bilgisi, çok şube/ihracat desteği | Eski nesil UX, masaüstü ağırlıklı |
| Ofis Hal | HKS künye otomasyonu, geniş modül seti (rehin, ambar defteri, çek-senet) | Modern web/mobil deneyim sınırlı |
| Prohalci (mobil) | Mobil HKS pratikliği | Tam kapsamlı ERP değil |

**Konumlandırma:** HalApp = "tam kapsamlı hal ERP'si" + "modern bulut/mobil deneyim".
Rakiplerin fonksiyonel genişliğini yakalayıp deneyim ve otomasyonda farklılaşmak.

---

## 3. Aktörler (Personalar) ve Fonksiyonalite Setleri

### 3.1 Patron / İşletme Sahibi (Komisyoncu veya Tüccar)
- Anlık ciro, kâr, kasa/banka bakiyesi, veresiye riski görünümü (web + mobil).
- Müstahsil ve alıcı bazında hesap özetleri, dönemsel karşılaştırma.
- Kullanıcı/yetki yönetimi, kritik işlem onayları (iskonto, fiyat düzeltme, silme).
- Bildirimler: gün sonu özeti, olağan dışı işlem uyarısı (ör. yüksek iskonto, geriye dönük düzeltme).

### 3.2 Kâtip / Satış Operatörü
- **Çok hızlı satış girişi**: klavye kısayolları, ürün/alıcı otomatik tamamlama, son fiyat hatırlama, barkodlu/etiketli kasa okuma.
- Mal kabul (parti/araç girişi), künye eşleştirme, ambar bakiyesi görüntüleme.
- Satış düzeltme/iptal (yetki dahilinde), bekleyen satış (park etme).
- Gün sonu döküm raporu.

### 3.3 Muhasebeci / Ön Muhasebe Personeli
- Müstahsil hesap kesimi: brüt satış → komisyon, rüsum, stopaj, Bağ-Kur, navlun, hammaliye, nakliye kesintileri → net ödeme.
- Hal tipi (e-)fatura, e-arşiv, e-müstahsil makbuzu üretimi; künye bilgilerini otomatik taşıma.
- Cari hesaplar (alıcı ve müstahsil), ekstre, mutabakat, çek-senet portföyü.
- Kasa/banka hareketleri, tahsilat ve ödeme fişleri.
- Resmî defter çıktıları: ambar defteri, cari hesap defteri (yönetmelik gereği).
- Muhasebe/ERP dışa aktarımı (Logo, Mikro, Luca vb. entegrasyon veya standart dışa aktarma).

### 3.4 Tahsilatçı / Saha Personeli (mobil)
- Alıcı bazında açık bakiye listesi, rota/ziyaret planı.
- Sahada tahsilat girişi (nakit/çek/havale), anında makbuz (SMS/WhatsApp/yazıcı).
- Boş kasa toplama kaydı.

### 3.5 Müstahsil / Üretici (self-servis portal — yeni değer önerisi)
- Gönderdiği malın durumu: kabul edildi, ne kadarı satıldı, kalan stok, fiyatlar.
- Hesap özeti ve ödeme bilgisi; satış anında WhatsApp/SMS bildirimi.

### 3.6 Alıcı (manav, market, pazarcı, ihracatçı — opsiyonel portal)
- Ekstre görüntüleme, ödeme bildirimi, sipariş verme (Faz 3).

### 3.7 Sistem Yöneticisi (Esesoft tarafı)
- Çoklu kiracı (multi-tenant) yönetimi, abonelik/lisans, HKS servis sağlığı izleme, destek araçları.

---

## 4. Mevcut Durum Analizi — [VARSAYIM, canlı doğrulama bekliyor]

Mevcut HalBox Pro'nun tipik sektör yazılımı kapsamında şunları içerdiği varsayılmıştır:
mal kabul, satış faturası, cari hesap, kasa, HKS künye bildirimi, temel raporlar.

Sektördeki muadillerden bilinen ve yeni üründe çözülmesi hedeflenen **tipik zayıflıklar**:

1. **Satış girişi yavaş** — fare bağımlı formlar; sabah yoğunluğunda kuyruk yaratır.
2. **HKS bildirimi manuel/yarı manuel** — künye almayı unutma → ceza riski.
3. **Boş kasa (ambalaj) takibi zayıf veya yok** — sektörün en büyük kayıp kalemlerinden.
4. **Mobil yok/zayıf** — patron ve tahsilatçı sahada kör.
5. **Müstahsil bilgilendirmesi manuel** — telefon trafiği, güven sorunu.
6. **Raporlar katı** — Excel'e dökmeden analiz yapılamıyor.
7. **Yetkilendirme kaba** — kâtip her şeyi silebiliyor/düzeltebiliyor, iz kaydı (audit log) yok.
8. **Parti bazlı kâr görünmüyor** — hangi araç/parti para kazandırdı bilinmiyor.

> Canlı denetim yapıldığında bu liste maddeler bazında "mevcutta var/yok/kısmen"
> olarak işaretlenecek ve ekran görüntüleriyle belgelenecektir.

---

## 5. Modüller ve Fonksiyonel Gereksinimler

### M1 — Mal Kabul & Ambar (Parti Takibi)
- FR-1.1 Araç/parti bazlı mal girişi: müstahsil, ürün, çeşit, kap türü, kap adedi, brüt/net kg, geliş tarihi, plaka.
- FR-1.2 HKS **sevk/alım bildirimi** eşleştirme ve künye ilişkilendirme (19 haneli künye).
- FR-1.3 Parti bazında kalan stok (kap ve kg), fire/zayi kaydı, iade.
- FR-1.4 Ambar defteri çıktısı (yönetmelik formatında).
- FR-1.5 Etiket basımı (parti/kasa etiketi, barkod/QR).

### M2 — Satış (Hızlı Satış Ekranı)
- FR-2.1 Klavye odaklı tek ekran satış: alıcı → ürün/parti → kap → kg → fiyat; ort. giriş süresi hedefi ≤ 8 sn/kalem.
- FR-2.2 Parti seçiminde FIFO önerisi ve kalan bakiye gösterimi; eksi stok engeli (yetkiyle aşılabilir).
- FR-2.3 Fiyat hafızası (alıcı+ürün bazında son fiyatlar), günlük tavan/taban uyarısı.
- FR-2.4 Satış türleri: peşin, veresiye, kendi malı (tüccar) / emanet mal (komisyoncu).
- FR-2.5 Satış düzeltme ve iptalde zorunlu gerekçe + tam iz kaydı (audit log).
- FR-2.6 HKS **satım bildirimi** otomatik gönderim; hata kuyruğu ve yeniden deneme; bildirilmemiş satış uyarı paneli.
- FR-2.7 Kantar entegrasyonu (seri/IP kantar okuma) — Faz 2.

### M3 — HKS Entegrasyonu (Künye Motoru)
- FR-3.1 hal.gov.tr servisleriyle alım/satım/sevk bildirimlerinin otomatik yönetimi.
- FR-3.2 Künye doğrulama, künye ile gelen malın kaynak bilgilerini (üretici, üretim yeri) otomatik çekme.
- FR-3.3 Bildirim durum panosu: gönderildi / hata / bekliyor; ceza riski uyarıları.
- FR-3.4 HKS kesintisi/servis arızasında çevrimdışı kuyruklama, servis dönünce otomatik gönderim.

### M4 — Müstahsil Hesabı & Kesintiler
- FR-4.1 Hesap kesimi sihirbazı: seçilen satışlar → brüt tutar → kesinti kalemleri (komisyon oranı ≤ %8 mevzuat sınırı, rüsum, gelir vergisi stopajı, SGK/Bağ-Kur tevkifatı, navlun, hammaliye, nakliye, diğer) → net ödenecek.
- FR-4.2 Kesinti oranları müstahsil ve işletme bazında parametrik; mevzuat sınırı aşımında engel/uyarı.
- FR-4.3 Müstahsil makbuzu / hal tipi fatura üretimi ve e-belge gönderimi.
- FR-4.4 Müstahsil ekstresi; avans ödeme takibi (hesap kesiminden düşme).
- FR-4.5 Satış/ödeme anında müstahsile otomatik SMS/WhatsApp bildirimi.

### M5 — Cari Hesaplar & Veresiye
- FR-5.1 Alıcı ve müstahsil carileri; ekstre, yaşlandırma (aging), risk limiti.
- FR-5.2 Risk limiti aşan alıcıya satışta uyarı/blokaj (yetki ile aşılır).
- FR-5.3 Tahsilat fişleri: nakit, havale/EFT, çek, senet; kısmi kapama, otomatik eşleştirme.
- FR-5.4 Çek-senet portföyü: vade takvimi, ciro, karşılıksız işaretleme, bankaya veriliş.
- FR-5.5 Cari hesap defteri çıktısı (yönetmelik formatında); mutabakat mektubu/ekstre paylaşımı (PDF/WhatsApp).

### M6 — Kasa & Banka
- FR-6.1 Çoklu kasa (TL/döviz) ve banka hesabı; virman, gider fişleri, masraf kategorileri.
- FR-6.2 Gün sonu kasa kapama ve sayım farkı raporu.
- FR-6.3 Banka hareketi içe aktarma (MT940/Excel) ve otomatik cari eşleştirme — Faz 2.

### M7 — Boş Kasa / Ambalaj Takibi (farklılaştırıcı modül)
- FR-7.1 Kap türü tanımları (plastik kasa, tahta kasa, karton vb.) ve depozito bedelleri.
- FR-7.2 Alıcı ve müstahsil bazında boş kap bakiyesi: satışla otomatik borçlanma, iade ile kapama.
- FR-7.3 Kap mutabakat raporu, uzun süre dönmeyen kap uyarısı, depozito faturalama opsiyonu.

### M8 — e-Belge Entegrasyonu
- FR-8.1 e-Fatura / e-Arşiv fatura (hal tipi fatura senaryosu dahil: künye no, mal sahibi TCKN/VKN, tüm kesinti kalemleri).
- FR-8.2 e-Müstahsil makbuzu, e-İrsaliye.
- FR-8.3 Entegratör soyutlama katmanı (birden çok özel entegratörle çalışabilme).

### M9 — Raporlama & Analitik
- FR-9.1 Standart raporlar: günlük satış dökümü, parti kârlılığı, ürün/alıcı/müstahsil performansı, veresiye yaşlandırma, kasa defteri, ambar bakiyesi.
- FR-9.2 Patron panosu (web+mobil): bugünkü ciro, tahsilat, açık veresiye, kasa, en çok satan ürünler.
- FR-9.3 Tüm listelerde esnek filtre + Excel/PDF dışa aktarma; zamanlanmış e-posta raporu.
- FR-9.4 Fiyat analizi: ürün bazında günlük ortalama satış fiyatı trendi — Faz 3'te hal geneli anonim kıyas.

### M10 — Kullanıcı, Yetki & Denetim
- FR-10.1 Rol bazlı yetkilendirme (patron, kâtip, muhasebe, tahsilatçı, salt-okunur).
- FR-10.2 Alan bazlı kısıt: kâr/maliyet görme, geriye dönük düzeltme, silme, iskonto limiti.
- FR-10.3 Tam denetim izi (audit log): kim, ne zaman, neyi, eski→yeni değer.
- FR-10.4 Çoklu şube/işletme desteği; şubeler arası konsolide rapor.

### M11 — Bildirim Merkezi
- FR-11.1 SMS/WhatsApp Business API ile: müstahsile satış/ödeme bildirimi, alıcıya ekstre/vade hatırlatma, patrona gün sonu özeti.
- FR-11.2 Şablon yönetimi ve gönderim geçmişi.

### M12 — Mobil Uygulama (iOS/Android veya PWA)
- FR-12.1 Patron modu: canlı ciro/kasa/veresiye.
- FR-12.2 Tahsilatçı modu: açık bakiyeler, tahsilat girişi, mobil makbuz.
- FR-12.3 Mal kabul modu: rampada araç karşılama, fotoğraflı kayıt.

### Olası Ek Modüller (Faz 3+ / ayrı fiyatlanabilir)
- **İhracat modülü:** döviz carileri, yükleme/konteyner takibi, çeki listesi.
- **Sipariş portalı:** alıcıların gece siparişi girip sabah teslim alması.
- **Rehin/teminat takibi** (Ofis Hal'de mevcut — parite için).
- **Muhasebe entegrasyonları:** Logo/Mikro/Luca fiş aktarımı.
- **Hal yönetimi (belediye) tarafı:** rüsum raporlama arayüzü — ayrı ürünleşme fırsatı.

---

## 6. Fonksiyonel Olmayan Gereksinimler (NFR)

- **Performans:** Satış kaydı < 300 ms; liste ekranları < 1 sn; 50k+ satış satırında akıcı raporlama.
- **Erişilebilirlik/Kullanılabilirlik:** Tamamen klavyeyle kullanılabilen satış ekranı; büyük punto "hal modu" (eldivenli/dokunmatik kullanım); Türkçe arayüz.
- **Dayanıklılık:** İnternet kesintisinde satış girişinin çevrimdışı sürmesi ve senkronizasyon (en azından satış ekranı için PWA offline kuyruk).
- **Güvenlik:** Kiracı bazlı veri izolasyonu (multi-tenant), TLS, rol bazlı erişim, KVKK uyumu, düzenli yedekleme + zaman-noktası geri dönüş.
- **Denetlenebilirlik:** Mali kayıtlarda silme yok — ters kayıt/iptal modeli.
- **Çalışma saatleri:** 03:00–09:00 kritik pencere; bakım pencereleri bunun dışında, hedef %99,9 erişilebilirlik.

---

## 7. Önerilen Teknik Mimari (özet)

- **Backend:** API tabanlı (REST/GraphQL), çok kiracılı; PostgreSQL; kuyruk tabanlı HKS/e-belge gönderim işçileri (retry + dead-letter).
- **Frontend:** Modern SPA/PWA (React/Vue); satış ekranı offline-first.
- **Mobil:** PWA ile başla, gerekirse React Native'e geç.
- **Entegrasyon katmanı:** HKS, e-belge entegratörü, SMS/WhatsApp sağlayıcısı için adaptör deseni.
- **Gözlemlenebilirlik:** Merkezî log + hata izleme (Sentry vb.), HKS bildirim başarı oranı panosu.

---

## 8. Yol Haritası

| Faz | Kapsam | Hedef |
|---|---|---|
| **Faz 0 — Doğrulama (1-2 hafta)** | Mevcut HalBox Pro'nun canlı denetimi, 3-5 gerçek kullanıcıyla görüşme, bu PRD'nin varsayımlarının doğrulanması | Onaylı PRD v1.0 |
| **Faz 1 — MVP (3-4 ay)** | M1, M2, M3, M4, M5 (temel), M6 (temel), M10; tek şube | Pilot 2-3 işletmede canlı kullanım |
| **Faz 2 (2-3 ay)** | M7 boş kasa, M8 e-belge, M9 raporlama genişletme, M11 bildirimler, kantar/banka entegrasyonu | Mevcut üründen tam geçiş + veri taşıma aracı |
| **Faz 3 (sürekli)** | M12 mobil, müstahsil portalı, sipariş portalı, ihracat, muhasebe entegrasyonları, fiyat analitiği | Farklılaşma ve yeni gelir kalemleri |

**Veri geçişi:** Mevcut HalBox Pro'dan cari bakiyeler, müstahsil/alıcı kartları, açık partiler ve kap bakiyelerini taşıyan bir migrasyon aracı Faz 2 çıkışının ön şartıdır.

---

## 9. Başarı Metrikleri (KPI)

- Satış kalemi ortalama giriş süresi ≤ 8 sn (mevcut süre Faz 0'da ölçülecek).
- HKS bildirim başarı oranı ≥ %99,5; bildirilmemiş satış sayısı → 0.
- Aylık aktif kullanıcı bazında elde tutma ≥ %95.
- Müstahsil bilgilendirme otomasyonu sonrası işletme başına gelen "malım satıldı mı?" telefonlarında ölçülebilir düşüş (kullanıcı anketi).
- Boş kasa modülü kullanan işletmelerde kap kaybı maliyetinde raporlanabilir azalma.

---

## 10. Riskler ve Açık Sorular

| # | Risk / Soru | Aksiyon |
|---|---|---|
| 1 | Bu PRD canlı uygulama görülmeden yazıldı | Faz 0 doğrulama turu zorunlu |
| 2 | HKS servislerinin resmi API erişim koşulları | Bakanlık/entegratör görüşmesi |
| 3 | e-Belge entegratör seçimi ve maliyeti | En az 2 entegratörden teklif |
| 4 | Mevcut müşterilerin veri geçiş direnci | Geçiş aracı + paralel çalışma dönemi |
| 5 | Hedef aktör önceliği: komisyoncu mu, tüccar mı, ikisi mi? | Ürün sahibi kararı |
| 6 | Fiyatlama modeli (abonelik/modül bazlı) | İş geliştirme kararı |
| 7 | Balık hali gibi komşu segmentler kapsam mı? | Ürün sahibi kararı |

---

## 11. Kaynaklar

- [İç Ticaret Genel Müdürlüğü — Hal Kayıt Sistemi (HKS)](https://icticaret.ticaret.gov.tr/bilgi-sistemleri/hal-kayit-sistemi-hks)
- [Hal Tipi Fatura Rehberi — BirFatura](https://birfatura.com/hal-tipi-fatura-nedir-nasil-kesilir/)
- [Hal Komisyonculuğu ve Hal Muhasebesi — Muhasebe Bilenler Topluluğu](https://muhasebebilenler.com/hal-komisyonculugu-ve-hal-muhasebesi-uzerine-ozellikli-durumlar/)
- [HKS ile e-Fatura Düzenlemesi — DİA Yazılım](https://diateknoloji.com/dia-bilgi-bankasi/hal-kayit-sistemi-ile-e-fatura-duzenlemesi/)
- [Atlas Hal Programı](https://www.atlashal.com/hal-programi/) · [Ofis Hal Programı](https://www.ofis.com.tr/ofis-hal-entegre-programi-2/) · [Prohalci — Google Play](https://play.google.com/store/apps/details?id=prohalprogrami.com)
- [Mysoft — HKS Kayıtlı Komisyoncu ve Tüccar e-Belge Zorunluluğu](https://www.mysoft.com.tr/hal-kayit-sistemi-hks-kayitli-komisyoncu-ve-tuccar-e-belge-zorunlulugu-nedir)
