# HalBoxPro — Ürünleştirme / İyileştirme Planı

**Sürüm:** 1.0 · **Tarih:** 2026-07-02
**İlgili:** [PRD.md](./PRD.md) · [AUDIT.md](./AUDIT.md)

Bu plan, mevcut (olgun) HalBoxPro uygulamasını gerçek boşlukları kapatarak ve
deneyimi derinleştirerek bir üst kaliteye taşımak için izlenecek adımları tanımlar.
Mevcut modül envanteri [AUDIT.md](./AUDIT.md)'de kanıta dayalı olarak listelenmiştir.

---

## Adım 0 — Canlı Doğrulama (1 hafta)

Uygulamanın derlenmiş kaynağı analiz edildi; ancak UX/performans ancak canlı
oturumla gözlemlenebilir (sandbox tarayıcısı proxy üzerinden siteyi render edemedi).

**Yapılacaklar:**
1. Yerel bir tarayıcıdan `selamikoc@gmail.com` ile giriş; tüm modüllerin ekran görüntüleri.
2. [AUDIT.md](./AUDIT.md) §6 "gözlemlenemedi" maddelerinin doğrulanması: satış giriş hızı, veri doğrulama, mobil offline, performans.
3. **Kritik netleştirme:** HKS otomatik devlet bildirimi sunucu tarafında var mı? (R2/G2)
4. 3-5 gerçek kullanıcıyla (patron, kâtip, muhasebe, tahsilatçı) kısa saha gözlemi.

**Çıktı:** Doğrulanmış AUDIT + kesinleşmiş öncelik sırası.

## Adım 1 — En Yüksek ROI'li Boşluklar (2-3 ay)

- **R1 Boş kasa / ambalaj takibi** (yeni modül) — sektörün görünmez kayıp kalemi.
- **R2 HKS bildirim izleme/otomasyonu** — ceza riskini sıfırlar.
- **R8 Deneyim & performans sertleştirme** — giriş hızı, doğrulama, mobil offline, rapor performansı.

Yaklaşım: 2 haftalık sprintler; her sprintte gerçek kâtiple kullanılabilirlik testi.
Çıkış kriteri: pilot işletmede boş kasa mutabakatı ve HKS panosu canlı kullanımda.

## Adım 2 — Farklılaşma (2-3 ay)

- **R3 Müstahsil self-servis portalı** (mevcut e-müstahsil + WhatsApp üzerine).
- **R4 Kantar entegrasyonu** (net kg doğruluğu).
- **R5 BI/analitik derinleştirme** (trend, kıyas, zamanlanmış rapor).

## Adım 3 — Niş & Yeni Gelir (sürekli)

- **R6 Alıcı portalı & gece sipariş.**
- **R7 Su ürünleri izlenebilirlik/tazelik; opsiyonel mezat akışı.**

---

## Yönetişim

- Her faz çıkışında go/no-go: pilot geri bildirimi + KPI eşikleri ([PRD.md](./PRD.md) §7).
- Mevcut audit log ve change-request akışları üzerinden değişiklik yönetimi.
- Mevzuat (HKS, e-belge, kesinti oranları) için çeyreklik gözden geçirme.

---

## Teknik Notlar (mevcut mimariye saygı)

- Ürün .NET + React (Vite/Ant Design) + SignalR + çok kiracılı SaaS; e-belge Uyumsoft.
- Yeni modüller mevcut mimariye eklemeli olmalı (yeniden yazım değil):
  boş kasa ve HKS panosu için yeni `/api/halboxpro/*` uçları ve React route'ları.
- Mobil PWA ve offline kuyruk mevcut; R8 kapsamında sağlamlaştırılmalı.
