# HalApp — Ürünleştirme Planı

**Sürüm:** 0.1 (Taslak) · **Tarih:** 2026-07-02 · İlgili doküman: [PRD.md](./PRD.md)

Bu plan, mevcut HalBox Pro uygulamasından yola çıkarak daha kaliteli bir hal yönetim
ürünü (HalApp) geliştirmek için izlenecek adımları tanımlar.

---

## Adım 0 — Mevcut Uygulamanın Canlı Denetimi (ön şart)

> Bu çalışma ortamının ağ politikası `test.halboxpro.esesoft.com` erişimine izin
> vermediği için denetim henüz yapılamadı. Erişim açıldığında aşağıdaki kontrol
> listesi uygulanacak ve PRD'deki [VARSAYIM] maddeleri doğrulanacaktır.

**Denetim kontrol listesi (PM gözüyle):**

1. **Envanter:** Menüdeki tüm sayfaların/modüllerin listesi, ekran görüntüleriyle.
2. **Aktör kapsaması:** Hangi roller var, yetkilendirme ne kadar ince taneli?
3. **Kritik akış süreleri:** Bir satış kalemi girişi kaç tıklama/saniye? Mal kabul? Hesap kesimi?
4. **HKS entegrasyonu:** Künye/bildirim otomatik mi manuel mi? Hata yönetimi var mı?
5. **Kesinti hesaplamaları:** Komisyon, rüsum, stopaj, Bağ-Kur, navlun, hammaliye doğru ve parametrik mi?
6. **Eksik modüller:** Boş kasa takibi, çek-senet, e-belge, bildirimler, mobil var mı?
7. **Raporlama:** Hangi raporlar var, dışa aktarma esnekliği?
8. **UX sorunları:** Form tasarımı, hata mesajları, mobil uyum, performans gözlemleri.
9. **Veri modeli çıkarımı:** Ekranlardan görülen alanlarla mevcut veri modelinin kabaca haritalanması (geçiş aracı için girdi).

**Çıktı:** `docs/AUDIT.md` — bulgu listesi (var/yok/kısmen) + ekran görüntüleri + PRD güncellemeleri.

---

## Adım 1 — Doğrulama ve Önceliklendirme (1-2 hafta)

- 3-5 gerçek kullanıcıyla (patron, kâtip, muhasebeci) görüşme; günlük akışın yerinde gözlemi.
- PRD'nin FR listesinin MoSCoW ile önceliklendirilmesi (Must/Should/Could/Won't).
- Açık soruların (PRD §10) ürün sahibiyle kapatılması: hedef aktör, fiyatlama, segment kapsamı.
- **Çıktı:** PRD v1.0 (onaylı) + MVP kapsam dondurması.

## Adım 2 — Teknik Temel (2-3 hafta, MVP ile paralel başlar)

- Mimari karar kayıtları (ADR): teknoloji yığını, multi-tenant stratejisi, offline stratejisi.
- HKS servis erişimi ve e-belge entegratörü için resmi başvuru/anlaşmalar (uzun sürebilir — erken başla).
- Tasarım sistemi: hızlı veri girişine odaklı bileşen kütüphanesi, "hal modu" tema.
- CI/CD, test ve staging ortamları.

## Adım 3 — MVP Geliştirme (3-4 ay)

Kapsam (PRD §8, Faz 1): Mal kabul & ambar, hızlı satış, HKS motoru, müstahsil hesap
kesimi, cari/veresiye, temel kasa-banka, rol & denetim izi.

- 2 haftalık sprintler; her sprint sonunda gerçek kâtiple kullanılabilirlik testi.
- Satış ekranı ilk sprintlerde prototiplenir ve sahada denenir (en riskli/kritik ekran).
- **Çıkış kriteri:** 2-3 pilot işletme bir tam haftayı (yoğun sabah dahil) yeni sistemle kapatır.

## Adım 4 — Geçiş Sürümü (2-3 ay)

Kapsam (Faz 2): boş kasa modülü, e-belge, raporlama genişletme, SMS/WhatsApp, kantar/banka entegrasyonları.

- Mevcut HalBox Pro'dan **veri taşıma aracı**: cariler, bakiyeler, açık partiler, kap bakiyeleri.
- Paralel çalışma dönemi ve geri dönüş planı; kullanıcı eğitim materyalleri.
- **Çıkış kriteri:** Mevcut müşterilerin eski üründen kesintisiz geçişi.

## Adım 5 — Farklılaşma (sürekli)

Mobil uygulama, müstahsil portalı, sipariş portalı, ihracat modülü, muhasebe
entegrasyonları, fiyat analitiği. Önceliklendirme pilot geri bildirimiyle yapılır.

---

## Yönetişim

- Haftalık ürün değerlendirmesi: KPI panosu (PRD §9) + sprint demo.
- Her faz çıkışında go/no-go: pilot geri bildirimi + KPI eşikleri.
- Mevzuat takibi (HKS, e-belge, kesinti oranları) için çeyreklik gözden geçirme.
