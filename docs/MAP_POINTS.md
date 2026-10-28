# Pilot harita noktaları

Katalog: `2026-10-28-campus-v2`. Pinler 28 Ekim 2026'da Google Maps yer kayıtlarından okundu. URL içindeki harita merkezi veya Street View kamera konumu yerine işletme/yer pinleri kullanıldı. Kampüs girişi ve Son durak, kullanıcının gönderdiği SAÜSEM ve Vib Turizm noktalarıdır.

| Uygulamadaki ad | Kimlik | Enlem | Boylam | Google Maps kaynağı |
|---|---|---:|---:|---|
| SAÜ Kütüphanesi | meet_library | 40.741753 | 30.332127 | [Merkez Kütüphane](https://www.google.com/maps/place//data=!4m2!3m1!1s0x14ccadf2a70df4fd:0x5cbf292d4eca1096) |
| Kampüs Adıbahçe | meet_adibahce | 40.7436949 | 30.3322774 | [Adıbahçe](https://www.google.com/maps/place//data=!4m2!3m1!1s0x14ccad8d67492cbd:0xf09a1f836325de69) |
| Kampüs girişi | meet_campus_gate | 40.7436182 | 30.3398823 | [SAÜSEM](https://www.google.com/maps/place//data=!4m2!3m1!1s0x14ccad8d57ac3b53:0xeda1f7a0c5dbbd33) |
| Son durak | meet_final_stop | 40.7404026 | 30.3295074 | [Vib Turizm](https://www.google.com/maps/place//data=!4m2!3m1!1s0x14ccadedb277ca41:0x4f1c045e72f2f38e) |
| Sabahattin Zaim | dorm_sabahattin_zaim | 40.7361529 | 30.3385152 | [Sabahattin Zaim KYK](https://www.google.com/maps/place//data=!4m2!3m1!1s0x14ccadf402d86aa9:0xaab3e808699006c0) |
| Rahime Sultan | dorm_rahime_sultan | 40.7469399 | 30.3450059 | [Rahime Sultan Kız Yurdu](https://www.google.com/maps/place//data=!4m2!3m1!1s0x14ccb277bf2b8a31:0xeb87144b47e884b4) |
| Ayşe Hümeyra Ökten | dorm_ayse_humeyra_okten | 40.7504178 | 30.3445008 | [Ayşe Hümeyra Ökten Yurdu](https://www.google.com/maps/place//data=!4m2!3m1!1s0x14ccb3c0a572f229:0x3a3d0c53501f9d56) |
| Esentepe kız KYK | dorm_esentepe | 40.7459781 | 30.3288432 | [KYK Esentepe Yurt Müdürlüğü](https://www.google.com/maps/place//data=!4m2!3m1!1s0x14ccad005f01be73:0xf54a9904c3050f86) |

Dört yurdun kız yurdu olarak kaydı [GSB Sakarya yurt listesinde](https://kygm.gsb.gov.tr/Ajax/gettesis.aspx?il=sakarya) kontrol edildi. Esentepe için Medeniyet Caddesi'ndeki KYK kaydı seçildi; aynı ada benzeyen SAÜ Esentepe öğrenci yurdu seçilmedi. Serdivan Yurdu kapsam dışıdır. Rahime Sultan için ana yer kaydı kullanıldı; ayrı D Blok pini kullanılmadı.

## Uygulama davranışı

- Kaynak, yer adı, sorgu tarihi ve `verification_scope: MAP_PIN_ONLY` her pinle saklanır. `confirmed: true`, seçili harita pininin çözüldüğünü belirtir; fiziksel giriş doğrulaması anlamına gelmez. `physical_entrance_verified: false` korunur. Buluşma yerlerinin saha kontrolü `PENDING` durumundadır.
- Yeni kurulumda sekiz pin hazırdır. Mevcut veritabanına eksik pinler eklenir; kullanıcı tarafından düzeltilmiş pinler korunur. Reset pinleri silmez. Yanlış girişe götüren bir pini demo kurulumundan düzeltebilirsiniz.
- Çınaraltı ve kampüs market önü seçenekleri kaldırıldı. Eski kimliklere ait başlamamış planlar/gruplar `CATALOG_CHANGED` nedeniyle iptal edilir. Aktif yürüyüşler ve geçmiş rota kayıtları taşınmaz veya yeniden yazılmaz.
- `/api/maps/preview` dört başlangıç × dört yurt için Google Routes API'den `WALK` rotası, çizgi, mesafe ve tahmini süre alır. Anahtarlar `.env` içinde kalır. Süre ve rota hatalı/eksik olabilir; Google'ın özel yol ve kullanım kısıtlaması uyarıları arayüzde gösterilir.
- Teknik konsolun aydınlatma ağı ayrı bir sentetik örnektir. Google rotası aydınlatma, tehdit veya güvenlik garantisi vermez. Giriş kapıları ve buluşma alanları pilot öncesi sahada kontrol edilmelidir.

## Doğrulama — 28 Ekim 2026

- Çalışan yerel API üzerinden 16 farklı başlangıç–yurt çifti gerçek Google Routes API ile sorgulandı. Tamamı HTTP 200, `source: GOOGLE_MAPS`, dolu rota çizgisi, pozitif mesafe ve süre döndürdü. Sorgu sınırını değiştirmeden iki demo hesabıyla sekizer sorgu yapıldı.
- Sabahattin Zaim'e giden dört rotada Google özel yol/kullanım kısıtlaması uyarısı döndürdü; ek uyarılar öğrenci ekranında korunuyor.
- Tarayıcıda dört güncel buluşma seçeneği ve dört yurt kontrol edildi. Gerçek Google haritası ve rota çizgisi yüklendi; örnek kütüphane–Sabahattin Zaim önizlemesi görünürken hata bildirimi oluşmadı.
- 55 backend testi, 19 frontend testi ve üretim derlemesi başarılı. Katalog değişikliğinde eski planların iptali, aktif yürüyüş/geçmiş kaydının korunması, özelleştirilmiş pinlerin ve oturumların kaybolmaması ayrıca test edildi.
