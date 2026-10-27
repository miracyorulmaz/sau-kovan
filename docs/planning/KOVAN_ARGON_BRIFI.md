# Argon / Gemini için Kovan görev brifi — v1.2

Bu, Miraç'ın iki AI arasında taşıyacağı ortak çalışma brifidir. Argon v2 incelenerek güncellenmiştir; Codex'in birleştirme önerisidir. Ayrıntılar KOVAN_MVP_ORTAK_PLAN.md, farklar KOVAN_ARGON_V2_YANIT.md dosyasındadır. Nihai ortak onay varsayılmaz.

Son kullanıcı kararları bu brifteki eski genel ifadelerden önceliklidir: yalnızca uygunluğu kontrol edilen kız öğrenci üyeliği; başlangıçlar kayıtlı kampüs buluşma noktaları; varışlar seçili kız yurtları. İsimler, üyelik doğrulama önerisi ve açık kararlar KOVAN_PILOT_KAPSAMI.md'de. İlk pilotu sadece bu yurtlarda kalanlarla sınırlandırmak henüz kabul edilmemiş öneridir; arayüzde kesinleşmiş kural gibi yazılmayacak.

**Geliştirme başladı:** Dört varışlı çalışan demo backend'i `sau-kovan/` klasöründe. Varışlar Sabahattin Zaim, Rahime Sultan, Ayşe Hümeyra Ökten, Esentepe. Uygulanmış endpoint'ler ve veri şekilleri için `sau-kovan/contracts/openapi.json` ve `sau-kovan/docs/ARGON_HANDOFF.md` kullanılsın; aşağıdaki eski hedef API adları uygulanmış sayılmasın. Frontend klasörüne Codex tarafından dosya yazılmadı.

## Ürün ve kapsam

Kovan, öğrencilerin birlikte yürüyüş planlamasını ve yardım taleplerinin yetkili görevliye atanıp kabul edilmesini izleyen bir kampüs hizmeti prototipidir.

19 saatlik başlangıç bütçesinin tamamı kalmadı: 27 Ekim 19.03 İstanbul kontrolünde 28 Ekim 13.00 teslimine 18 saatten az vardı. P0'ı öne alıp son yarım saati teslim için koruyoruz.

P0:
- Üyelik başvurusu, onay bekleme ve yetkili uygunluk değerlendirmesi; başlangıç/varış allowlist denetimi. Gerçek onay yöntemi kararlaştırılana kadar yalnızca demo test onayı.
- Davetli demo kullanıcıları arasında zaman ve hedefe uygun 3–5 kişilik grup önerisi, karşılıklı kabul.
- Aynı yürünebilir ağ üzerinde en kısa ve aydınlatma öncelikli rota; kaynak/örnek veri etiketleri.
- Öğrenci yardım talebi → operatörün üstlenmesi → ataması → görevli kabulü → ulaşıldı → çözüldü.
- Öğrenci, görevli ve operatör ekranları; yalnızca sentetik veri gösteren yan yana sunum görünümü.
- Demo girdilerini değiştiren kontroller; gerçek motorların yeniden hesapladığı sonuçlar.
- İsteğe bağlı, sunucu tarafında varış teyidi süresi ve cevapsız kalırsa inceleme kaydı. Konum akışının kesilmesi tek başına olay değildir.

P1: Konum belirsizliği ve süreyi dikkate alan deneysel sapma kontrolü; yalnızca ön planda gerçek telefon konum denemesi. P0 bitmeden başlanmaz.

Bu sürümde saldırı tespiti, suç tahmini, arka planda sürekli koruma, kadın kimliği doğrulama veya gerçek güvenlik entegrasyonu iddiası yok. Gerçek olayın kullanıcı tarafından verilmemiş saat/konum/eylem ayrıntıları kullanılmayacak. Yakındaki öğrencilere olay konumu ve müdahale çağrısı gönderilmeyecek.

## Mimari ve sahiplik

- Codex desteğindeki Geliştirici 1–2: Python/FastAPI, SQLite, API ve rol kontrolü, durum makineleri, grup/rota/sapma motorları, testler, veri kaynakları.
- Argon desteğindeki Geliştirici 3: React/TypeScript/Vite öğrenci ve görevli ekranları, App, API adaptörü, ortak stiller ve tipler.
- Argon desteğindeki Geliştirici 4: operatör, sunum, Leaflet haritası, demo anlatımı ve veri doğrulama desteği.
- Tek backend süreci, aynı origin REST + WebSocket. Verinin kaynağı backend; frontend motor sonucunu tekrar üretmez.
- Depo, paket dosyaları ve ortak sözleşmelerin birer sahibi olacak; aynı dosya iki AI tarafından paralel değiştirilmeyecek.

İlk 45 dakikada DTO/endpoint/örnek yanıtlar sabitlenecek. Pydantic/OpenAPI teknik kaynak olacak. İlk çalışan öğrenci → operatör → görevli kabulü akışı üçüncü saatte hedefleniyor.

## Arayüz için kesin kararlar

- “En güvenli rota” yerine “Aydınlatma öncelikli rota”; kaynak ve bilinmeyen veri görünür.
- “Talep gönderildi”, “atandı”, “görevli kabul etti” ve “ulaşıldı” ayrı durumlar.
- Ortak enum: CREATED → OPERATOR_ACKED → ASSIGNED → GUARD_ACCEPTED → ARRIVED → RESOLVED. escalation_state ayrı bir alandır.
- Konum akışı yoksa “güncel konum yok”; saldırı veya yardım ulaştı sonucu çıkarılmaz.
- Demo hesaplarında “SAÜ tarafından doğrulandı” rozeti yok; tüm sentetik veriler işaretli.
- GPS/titreşim desteklenmiyorsa bunun açık durumu ve manuel akış var.
- Öğrenci başkasının açık konum haritasını görmez; görevli yalnızca kendisine atanan işi görür.
- UI bağlantı kopmasını, cevapsız talebi, eksik grup ve bulunamayan rotayı tasarlayacak.
- Üçüncü taraf harita tile'ları yokken de yerel GeoJSON ve iş akışı görünür kalacak.
- OSM geometrisi saha doğrulaması değildir; kamera/aydınlatma kaynağı ayrı. Uydurma güven yüzdesi veya tamamlanan yürüyüşten güvenilirlik puanı yok.
- Sandbox ayrı run_id'de çalışır; aktif yürüyüşleri/gerçek cihaz testlerini sessizce değiştirmez. POST /api/sandbox/recalculate tek hesaplama girişidir.
- P1 demo eşiği: accuracy <= 25 m, yaş <= 30 s, d_eff > 15 m, >=4 geçerli örnek ve >=20 s süreklilik; 10 s üzeri örnek boşluğunda sıfırlama. Bunlar saha doğrulanmış güvenlik eşikleri değildir.

## Beklediğim dönüş

1. Bu kapsama itirazların ve gerekçeleri; en fazla üç temel değişiklik.
2. Ekranların durum/boş/hata hallerini içeren bileşen planı.
3. İhtiyaç duyduğun ek API alanları ve örnek değerleri; enum'ları habersiz değiştirme.
4. Teslim edeceğin dosya listesi ve hangi dosyaların tek sahibi olacağın.

Her kod paketinin özeti: “Dosyalar / Sözleşme değişikliği / Denenen akış / Açık sorunlar”.

Demo hedefi: Jüri yolu veya zamanı değiştirdiğinde plan gerçekten değişsin; ikinci cihazdaki görevli kabul ettiğinde öğrenci ekranındaki durum gerçekten güncellensin. Sonucu sabitleyen sahne animasyonu yapılmayacak.
