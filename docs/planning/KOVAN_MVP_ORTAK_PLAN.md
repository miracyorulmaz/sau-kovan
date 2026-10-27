# SAÜ-Kovan — ortak MVP planı, v1.2

Durum: Argon/Gemini v2 taslağı ve Miraç'ın son kapsam kararlarıyla güncellenmiş Codex birleştirme önerisi. Son kullanıcı kararları: öğrenci üyeliği yalnızca uygunluğu kontrol edilen kız öğrencilere; başlangıç yalnızca tanımlı buluşma noktalarına; varış yalnızca seçili kız yurtlarına açık. Ayrıntı ve belirsizlikler KOVAN_PILOT_KAPSAMI.md dosyasında. Üyelik onay yöntemi henüz kararlaştırılmadı; yüz yüze belge kontrolü öneri durumunda. Bu yeni pilot sınırları, aşağıdaki önceki genel ifadelerden önceliklidir.
Hazırlanma: 27 Ekim 2026, Europe/Istanbul.
Uygulama durumu: Dört varışlı ilk backend `sau-kovan/` içinde çalışır durumda; 29 otomatik test ve gerçek HTTP demo akışı geçti. Uygulanan alan ve endpoint'ler için `sau-kovan/contracts/openapi.json` ve `sau-kovan/docs/ARGON_HANDOFF.md` geçerlidir. Aşağıdaki mimari bölümler hedef kapsamı anlatır; henüz uygulanmayan özellikler çalışan sayılmaz.
Teslim: 28 Ekim 2026 Çarşamba 13.00, İstanbul.
Saat kontrolü: 27 Ekim 19.03. Talepteki 19 saatlik bütçenin tamamı artık mevcut değil; aşağıdaki takvim yaklaşık 17 saatlik çalışma ve teslim payına göre düzenlendi.

## 1. Ürün kararı

Kovan, üyelik uygunluğu kontrol edilmiş kız öğrencilerin belirlenmiş kampüs buluşma noktalarından pilot kız yurtlarına birlikte yürüyüş planlamasını ve yürüyüş sırasında oluşturulan yardım taleplerinin yetkili bir görevli tarafından kabul edilip takip edilmesini sağlayan bir kampüs hizmeti prototipidir. İlk gerçek pilotu bu yurtlarda kalan öğrencilerle sınırlandırma, henüz kabul edilmemiş ek bir öneridir.

Öğrencinin cümlesi: “Kütüphaneden yurda gidiyorum; birlikte yürüyüş planlamak veya güvenlikten destek istemek istiyorum.”
Jüriye vaat: “Yürüyüş niyetlerini ortak planlara, destek taleplerini kabulü izlenebilen görevlere çeviriyoruz.”

Hizmetin başarısı, saldırı tespiti veya suç azalmasıyla değil; uygun yürüyüş planı, açıklanabilir rota, yardım kabulü ve hata durumlarının doğru gösterilmesiyle değerlendirilecek.

## 2. İlk öneride değiştirdiğimiz kararlar

| İlk öneri | MVP kararı |
|---|---|
| 15 m sapma + durma = saldırı/kritik alarm | Doğruluk ve süre koşullarını sağlayan sapma = deneysel kontrol isteği |
| Sıfır dokunuşlu koruma | Kullanıcının başlattığı oturum; ön planda ölçüm; kontrol edilebilir sınırlı izleme |
| “Güvenli yeşil koridor” | Verisi gösterilen, aydınlatma öncelikli rota önerisi; güvenlik garantisi yok |
| %88 risk / %92 olay olasılığı | Açıklanabilir etkenler ve durumlar; kalibre edilmemiş yüzde yok |
| Yakındaki tüm öğrencilere olay konumu | Olay konumu yalnızca yetkili operatör ve atanmış görevliye |
| E-posta doğrulandı = güvenilir refakatçi | Demo hesabı / davetli grup; kimlik ve davranış güvencesi iddiası yok |
| Kendiliğinden devriye gönderme | Yetkili operatörün ataması, ardından görevlinin kabulü |
| “42 saniyede müdahale” | Basit ve açıklanmış modele dayalı tahmini ulaşım; kabulden ayrı |
| Production-grade / zero-bug | Dar kapsam, kabul testleri geçen hackathon prototipi |
| Pazar olayının belirli saat ve konumda canlandırılması | Tamamen kurgusal, kişisiz yürüyüş senaryosu |

Kullanıcının anlattığı olayda saat, Teknokent ve ormana sürüklenme ayrıntıları verilmedi. Bu ayrıntılar gerçek olay diye sunulmayacak. Argon dosyasındaki koordinatlar, kamera ve aydınlatma verileri de kaynaklandırılmadan gerçek veri sayılmayacak.

## 3. Teslimde çalışan kapsam

### P0 — mutlaka teslim

0. **Pilot üyelik ve konum kapısı:** Onay bekleyen öğrenci yeni grup/yürüyüş açamaz; başvuru uygunluğunu yalnızca yetkili inceleme rolü günceller. Başlangıç ve varışlar kayıtlı pilot nokta/yurt kimlikleriyle sunucuda doğrulanır. Onay yöntemi kesinleşene kadar test başvuruları ayrı demo etiketiyle kullanılır.
1. **Yürüyüş niyeti ve grup önerisi:** Başlangıç/buluşma noktası, hedef bölgesi ve zaman aralığı; davetli demo kullanıcıları arasında 3–5 kişilik öneriler; her üyenin kabulü; eşleşmeyen kişiye neden gösterme.
2. **Rota karşılaştırması:** Aynı yürünebilir ağ üzerinde en kısa ve aydınlatma öncelikli alternatif; mesafe ve verinin kaynağı; kapalı yolun elenmesi; bağlantı yoksa açık hata.
3. **Yardımın kabulü:** Öğrencinin destek istemesi → operatörün üstlenmesi → ataması → görevlinin kabulü → ulaşıldı → çözüldü. Cevapsız talep görünür kalır.
4. **Eşzamanlı ekranlar:** Öğrenci, operatör ve görevli görünümleri; sunumda öğrenci/operatör yan yana. Sunum görünümü yalnızca demo verilerini gösterir.
5. **Tekrarlanabilir demo:** Sentetik katılımcılar, senaryo başlangıçları, girdi değiştirme ve sıfırlama. Sonuçları gerçek motorlar hesaplar.
6. **İsteğe bağlı varış teyidi:** Yürüyüş başlarken öğrenci varış hatırlatmasını açabilir; beklenen varış zamanı ve ek süre görünür. Sunucu son süreyi takip eder. Teyit gelmezse operatöre “varış doğrulanamadı” inceleme kaydı oluşur; bu, olayın veya saldırının doğrulandığı anlamına gelmez. Kapanan/iptal edilen yürüyüşün süresi tekrar uyarı üretmez.

### P1 — P0 uçtan uca çalıştıktan sonra

7. **Deneysel sapma kontrolü:** Ölçüm doğruluğu ve veri tazeliğini dikkate alan, süreklilik arayan kurallar; öğrenciye kontrol isteği; cevapsız kontrolün operatör incelemesine taşınması.
8. **Gerçek cihazdan konum denemesi:** HTTPS üzerinden, açık sayfada ve açık izinle. Desteklenmeyen cihazda kontrollü konum seçimi veya etiketli oynatım. Kampüs örnek ağı dışında kalan gerçek koordinatlar yanlışlıkla olay sayılmaz. Wake Lock isteğe bağlı bir kolaylık; reddedilmesi veya bırakılması temel akışı bozmaz.

### Kapsam dışı

- Saldırı, taciz veya “sürüklenme” tanıyan eğitilmiş model; suç tahmini.
- Kilitli telefonda kesintisiz arka plan izleme garantisi; zorunlu titreşim.
- Gerçek kamera, SAÜ kullanıcı dizini, güvenlik telsizi, 112, KADES veya SMS entegrasyonu.
- Açık katılımlı yabancı eşleştirmesi; cinsiyeti doğruladığımızı veya kadınlara özel grubun güvenliğini garanti etme.
- Yüz tanıma, şüpheli kişi sınıflandırması, ses/görüntü kaydı.
- Kampüs geneli yaya çıkışı tahmini, devriye optimizasyonu ve görevli rotasının otomatik yürürlüğe girmesi.
- Ödeme, sohbet, sosyal ağ, mobil mağaza yayını ve LLM bağımlılığı.

## 4. Kullanım akışı

1. Önceden tanımlı demo hesabıyla giriş; ekranda DEMO etiketi.
2. Üyelik uygunluğu kontrol edilmiş kız öğrenci aktif pilot buluşma noktası, seçili kız yurdu, zaman aralığı ve davetli grubunu seçer. Serbest başlangıç/varış koordinatı yoktur. Konum izni bu aşamada zorunlu değildir.
3. Motor uygun üyelerle grup ve ortak buluşma saati önerir. Üyeler onaylamadan yürüyüş başlamaz.
4. Haritada iki rota, mesafe ve kullanılan varsayımlar görülür; öğrenci önerilen rotayı seçer.
5. Aktif yürüyüşte öğrenci destek isteyebilir. P1 açıksa, kaliteli ölçümlerde devam eden sapma da kontrol isteği başlatabilir.
6. Operatör talebi görür ve uygun görevliye atar. Atama ile görevli kabulü ayrı durumlardır.
7. Görevli kendi ekranından kabul eder; ulaşım durumu ve sonuç güncellenir. Öğrenci yardım gelmeden de talebi görebilir ve resmî iletişim seçeneğine erişebilir.
8. Yürüyüş tamamlanınca konum toplama durur. Konum verilerinin silinmesi aşağıdaki saklama kuralını izler.

Kullanıcının grubu kabul etmemesi, konum paylaşmaması veya kontrol isteğine cevap vermemesi “kusurlu davranış” diye gösterilmez. Uygulama kullanımı kampüs güvenlik hizmetine erişmenin ön koşulu olarak sunulmaz.

## 5. Mimari

Tek depo, tek Python backend süreci, tek SQLite dosyası ve tek web arayüzü. Mikroservis, mesaj kuyruğu ve Redis yok.

```text
Öğrenci / Görevli / Operatör / Demo sunumu
                |
          HTTPS + WSS
                |
       FastAPI — rol ve oturum kontrolü
                |
   Komutlar → uygulama servisi → durum makineleri
                |
   Eşleştirme | rota | deneysel sapma kuralları
                |
       SQLite + işlem/event kaydı
                |
       Role göre filtrelenmiş durum yayını
```

- **Backend:** Python 3.11+, FastAPI, Pydantic, NetworkX; SQLite için standart kütüphane. Pytest ile anlamlı algoritma ve akış testleri.
- **Frontend:** React + TypeScript + Vite; Leaflet ile harita; sade CSS veya tek kişinin sahip olduğu Tailwind kurulumu. Mevcut takım şablonu varsa onu tercih edin.
- **Dağıtım:** Frontend build çıktısı backend üzerinden aynı origin'de sunulur. HTTPS sonlandırması seçilen barındırma ortamında yapılır. Vite preview üretim sunucusu sayılmaz.
- **Canlı durum:** REST komutları, WebSocket durum yayını. WebSocket koparsa yeniden bağlanma ve REST üzerinden tam durum alma. Tek süreç zorunlu; daha fazla worker açılmaz.
- **Saat:** Durum geçişleri ve süre sonları backend saatine bağlıdır. İstemci geri sayımı yalnızca gösterir. Senaryo oynatımı kendi run_id ve açıkça belirtilmiş senaryo saatiyle çalışır.
- **Kalıcılık:** Durum, revizyon ve olay aynı işlemde yazılır; yayın commit sonrasında yapılır. Süreç yeniden başladığında aktif işler veritabanından yüklenir; bağlantı listesi yeniden oluşur. Yardım talepleri kendiliğinden çözülmüş sayılmaz.

## 6. Dosya sınırları

```text
sau-kovan/
  README.md
  .env.example
  backend/
    app/
      main.py              # uygulama, statik arayüz, lifespan
      auth.py              # demo erişim kodu, oturum ve rol
      models.py            # DTO, durum enum'ları, doğrulama
      repository.py        # SQLite, transaction, revision
      service.py           # komutlar, durum geçişleri, yetki
      realtime.py          # bağlantı, filtreli snapshot
      engines/
        matching.py
        routing.py
        deviation.py
      demo.py              # seed, girdi senaryoları, reset
      settings.py          # açık ve tek yerden ayarlar
    tests/
  frontend/
    src/
      App.tsx
      api/client.ts
      api/types.ts
      screens/Student.tsx
      screens/Guard.tsx
      screens/Operator.tsx
      screens/Presenter.tsx
      components/CampusMap.tsx
      components/StatusBadge.tsx
  data/
    campus.geojson
    fixtures.json
    provenance.md
  contracts/
    examples/              # tarafların üzerinde anlaştığı örnek istek/yanıtlar
  docs/
    demo-script.md
    acceptance.md
```

## 7. Asgari veri modeli

| Varlık | Temel alanlar |
|---|---|
| DemoUser | id, display_name, role, invite_circle_id, environment |
| WalkIntent | id, owner_id, origin_id, destination_zone, earliest_at, latest_at, status |
| Pod | id, member_ids, meeting_node_id, departure_at, accepted_member_ids, status |
| Walk | id, owner_id, pod_id, route_id, status, tracking_status, sharing_enabled, arrival_check_enabled, arrival_due_at, grace_seconds |
| Telemetry | walk_id, sequence, measured_at, received_at, lat, lng, accuracy_m, speed_mps (nullable), source |
| RoadEdge | id, from, to, geometry, length_m, lighting, isolation, closed, provenance |
| Unit | id, role, position_node, availability, current_assignment_id |
| Assistance | id, walk_id, reason, status, operator_id, assigned_unit_id, check_delivery_status, deadlines, escalation_state |
| Event | id, run_id, actor_id, type, entity_id, revision, server_time, minimal_payload |

UTC ISO-8601 zamanları, metre cinsinden mesafeler, sunucu tarafından belirlenen aktör/rol. Değiştirilebilir varlıklarda entity_version tutulur. GeoJSON koordinat sırası [longitude, latitude]. Hassas veriler normal uygulama loglarına yazılmaz.

## 8. Ortak API sözleşmesi

Başlangıçta örnek JSON'lar birlikte sabitlenir. Uygulanan Pydantic modellerinden çıkan OpenAPI, API'nin teknik kaynağı olur; Argon'un arayüzü aynı alan ve enum'ları kullanır.

| İşlem | İstek | Yetki / sonuç |
|---|---|---|
| POST /api/auth/demo-session | access_code | Sunucunun önceden tanımladığı rol; rolü istemci seçmez |
| GET /api/bootstrap | — | Kampüs ağı, kaynak etiketleri, kullanıcının izinleri |
| GET /api/state | — | Kullanıcıya filtrelenmiş tam durum |
| POST /api/intents | origin_id, destination_zone, earliest_at, latest_at | Öğrenci yalnızca kendisi için |
| POST /api/matches/preview | intent_id | Yetkili davetli çevresindeki adaylar ve gerekçeler |
| POST /api/pods/{id}/accept | expected_version | Kullanıcı sadece kendi kabulünü verir |
| POST /api/walks/start | pod_id, route_id, arrival_check_enabled, estimated_duration_seconds | Tüm kabuller, süre sınırları ve geçerli rota kontrolü |
| POST /api/walks/{id}/telemetry | sequence, measured_at, lat, lng, accuracy_m | Kendi yürüyüşü; simülasyon kaynağını sunucu etiketler |
| POST /api/walks/{id}/checks/{check_id}/received | — | Kendi açık kontrolünün ekranda gösterildiği teyidi |
| POST /api/walks/{id}/checkins | check_id, answer | Kendi açık kontrolüne yanıt |
| POST /api/assistances | walk_id, reason, idempotency_key | Öğrenciye talep kimliği ve teslim durumu döner |
| POST /api/assistances/{id}/operator-ack | expected_version | Yalnızca operatörün üstlenmesi |
| POST /api/assistances/{id}/assign | unit_id, expected_version | Operatör; müsaitlik ve yarış durumu kontrolü |
| POST /api/assistances/{id}/guard-accept | expected_version | Yalnızca atanmış görevlinin kabulü |
| POST /api/assistances/{id}/arrive | expected_version | Atanmış görevli |
| POST /api/assistances/{id}/resolve | resolution, expected_version | Yetkili operatör; gerekçe kayıtlı |
| POST /api/walks/{id}/complete | expected_version | Öğrenci; konum toplama kapanır |
| POST /api/demo/reset | scenario_id | Yalnızca demo yöneticisi; yeni run_id |
| POST /api/demo/inputs | type, payload | Yalnızca demo yöneticisi; motor girdisi değişir |
| POST /api/sandbox/recalculate | student_count, departure_time, closed_edges, lighting_overrides, busy_units, gps_accuracy_m | Yalnızca demo yöneticisi; izole sentetik senaryo girdileri doğrulanarak yeniden hesaplanır |
| WS /api/events | Oturum çerezi | Role göre filtrelenmiş durum bildirimleri |

Ortak zarf: {revision, server_time, run_id, environment: "demo", data}. Hata: {code, message, details, request_id}. Çakışan geçiş 409; yetkisiz rol 403; geçersiz ölçüm 422. Aynı idempotency_key tekrar talep açmaz. Öğrenci başka öğrencinin walk_id'sini vererek veri okuyamaz/yazamaz.

revision, durum akışının genel sıra numarasıdır; expected_version ise değiştirilen varlığın entity_version değeridir. Başka bir öğrencinin telemetrisi görevli kabulünü gereksiz yere çakışmaya düşürmez. Aynı görevlinin iki aktif işe atanması da tek transaction içinde engellenir.

WebSocket sonrasında kaçırılan mesajlar var sayılır; yeniden bağlantıda GET /api/state ile yenilenir. Tüm öğrenci konumlarını herkese yayınlayan ortak bir state yayını yapılmaz.

Argon v2'deki /api/recalculate, /api/compute-simulation ve /api/incidents isimleri ek alias olarak çoğaltılmayacak. Arayüz adaptörü bu tablodaki tek sözleşmeye bağlanır. Sandbox en çok 60 sentetik öğrenciyle sınırlıdır; öğrenci oturumundan kullanılamaz. Demo yeniden hesaplaması, gönüllü gerçek cihaz test oturumunu veya başlamış yürüyüşleri sıfırlamaz.

## 9. Algoritmalar ve sınırları

### A. Grup önerisi

- Önce açık rıza/davetli çevresi, izin verilen başlangıç-buluşma mesafesi ve hedef bölgesi filtrelenir.
- Aynı gruptaki tüm kişilerin ayrılış aralıklarının ortak kesişimi bulunmalıdır. Sadece ikili yakınlık yeterli değildir.
- Başlangıç sürümü: en erken son ayrılış saatine göre sıralayan deterministik, 3–5 kişilik uygun grup arayan açgözlü yöntem. Her adımın uygunluk kontrolleri ayrıdır.
- Önerilen buluşmaya yürüyüş süresi ve kabul süresi hesaba katılır. Kapasite ve azami bekleme ayarlanabilir demo parametreleridir.
- “Küresel optimum” iddiası yok. Eşleşen kişi sayısı, bekleme ve eşleşmeme gerekçeleri raporlanır.
- Üyeler onaylamadan plan kesinleşmez. İptalde yalnızca henüz başlamamış öneriler yeniden hesaplanır; aktif yürüyüşler kendiliğinden değişmez.
- 1–2 kişinin kalması gizlenmez; talep açık gösterilir, bekleme veya görevli desteği seçeneği verilir. Boşluğu doldurmak için sahte üye eklenmez.

### B. Rota önerisi

Veri kapsamı: kaynak kontrolü yapılacak tek kütüphane–çıkış/yurt koridoru, yaklaşık 8–12 düğüm ve 12–20 yürünebilir bağlantı. Henüz doğrulanmamışsa haritada “örnek ağ” etiketi kullanılır.

Her iki alternatif aynı bağlantı ağı üzerinde hesaplanır. İki nokta arasına düz çizgi çekip yol kabul edilmez. Kapalı kenarlar çıkarılır; kopuk ağda rota bulunamadığı belirtilir.

Örnek açıklanabilir maliyet:

cost(e) = length_m(e) × [1 + w_light × lighting_penalty(e) + w_isolation × isolation(e) + w_unknown × unknown_data(e)]

Tüm ağırlıklar ve cezalar sıfır veya pozitif; kenar uzunluğu pozitif olmalı. Böylece Dijkstra'nın ön koşulları korunur. Negatif “kalabalık bonusu” yok. Sonuç suç olasılığı değildir. Kamera kapsamı doğrulanmadan rota maliyetine eklenmez; bilinmeyen veri gerçek diye doldurulmaz.

Rota değişikliğini kullanıcı veya operatör onaylar. Başlamış yürüyüş sessizce başka güzergâha alınmaz.

Veri kaynağı alan bazındadır: geometry_source/geometry_checked_at, lighting_source/lighting_checked_at ve cctv_source/cctv_checked_at ayrı tutulur. OSM geometrisi saha gözlemi sayılmaz; OSM kullanıldı diye kamera veya aydınlatma mevcut varsayılmaz. Saha kontrolü yapılmadan VERIFIED_OSM_SURVEY etiketi veya 0.40 gibi olasılık izlenimi veren confidence sayısı kullanılmaz. Durumlar SOURCE_MAPPED, FIELD_OBSERVED, USER_REPORTED, UNKNOWN veya SYNTHETIC olabilir. Öğrenci bildirimi inceleme gerektirir; otomatik olarak rota ağırlığını değiştirmez.

### C. Deneysel sapma kontrolü — P1

Başlangıç parametreleri yalnızca geliştirme/test içindir; sahada doğrulanmış güvenlik eşikleri değildir:

1. Koordinatlar yerel metre düzlemine çevrilir; gerçek rota çizgisinin parçalarına en kısa mesafe hesaplanır.
2. Argon v2 ile hizalanan demo parametreleri: accuracy_m > 25 veya ölçüm yaşı > 30 saniye ise olay çıkarılmaz; tracking_status belirsiz/eski olarak güncellenir. Sırası bozuk, yinelenen veya sunucu saatinden kabul edilen küçük toleransı aşacak kadar ileride olan paketler reddedilir.
3. d_eff = max(0, distance_to_route_m - accuracy_m), d_eff > 15 metre koşulu en az dört geçerli ölçüm ve en az 20 saniye boyunca sürerse kontrol isteği açılır. Bu çıkarma işlemi ölçüm belirsizliğini dikkate alan bir heuristiktir; gerçek konumun kesin alt sınırı veya olay olasılığı değildir. Sabit son dört paket yerine süreklilik süresi ve geçerli örnek sayısı birlikte tutulur. Ardışık geçerli paketler arasında 10 saniyeden uzun boşluk, kalite kaybı veya rota içine dönüş olduğunda süreklilik sıfırlanır.
4. Kontrol ekranda gösterildiğinde teslim alındığı ayrıca bildirilir. Titreşim yalnızca destek varsa ek sinyaldir.
5. Cevap gelmemesi, saldırı kanıtı değildir. Sunucu kontrolü inceleme talebine çevirir; teslim edilip edilmediği operatöre gösterilir.
6. Konum akışının kesilmesi tek başına olay veya yardımın ulaştığı anlamına gelmez. Eski veri güncelmiş gibi hareket ettirilmez.
7. Öğrencinin manuel yardım talebi bu deneysel kurallardan bağımsızdır ve kontrol süresini beklemez.
8. speed_mps bilinmiyorsa sıfır kabul edilmez. Rota üzerindeki duraklama kontrol gerektirmez; yalnızca rota dışında yürümeye devam etmek de süre koşulunu sağlayabilir. Metin bu nedenle “Rota dışında görünüyorsunuz; durumunuzu kontrol eder misiniz?” olur; hareketsizlik varsayılmaz.
9. Backend konum akışının neden kesildiğini kesin bilemez. “Ekran kilitli” yerine “Güncel konum alınamıyor; neden bilinmiyor” gösterilir. Wake Lock yalnızca destek varsa kullanıcı isteğiyle denenir, garanti verilmez. Görsel bildirim temel yöntemdir; ses/titreşim destek ve izin koşullarına bağlıdır.

İvme/şok, ormana yönelme, davranıştan saldırı çıkarımı ve eğitilmiş ML bu MVP'de yok. Başarı testi; bilinen sentetik sapma ve GPS gürültüsü örneklerini ayıran sınırlı kural davranışıdır; genellenebilir saldırı tespit başarısı değildir.

## 10. Durum makineleri

- **Pod:** PROPOSED → ACCEPTED → WALKING → COMPLETED; başlamadan CANCELLED/EXPIRED mümkün.
- **Tracking:** NOT_SHARED / FRESH / LOW_ACCURACY / STALE / STOPPED. Yardım durumundan bağımsızdır.
- **Kontrol:** OPEN → DELIVERED → CONFIRMED_OK veya REVIEW_REQUESTED. Teslim edilemeyen kontrolün nedeni ayrı tutulur.
- **Yardım:** CREATED → OPERATOR_ACKED → ASSIGNED → GUARD_ACCEPTED → ARRIVED → RESOLVED. CANCELLED yalnızca izin verilen aşamalarda, gerekçeli. Operatörün üstlenmesi ile saha görevlisinin kabulü farklı aktörlerce yapılır.
- **Gecikme:** escalation_state, yaşam döngüsünden ayrı tutulur: NONE / OPERATOR_OVERDUE / GUARD_OVERDUE. Demo parametresi olarak 15 saniye operatör üstlenme süresi kullanılabilir; bu gerçek hizmet SLA'sı iddiası değildir. Gecikme talebi kapanmış saymaz, sonradan yetkili kabulü engellemez. Sesli bildirim tarayıcı izinlerine bağlı olduğundan görsel uyarı daima bulunur. Otomatik saha görevi veya bildirim teslim edildiği iddiası üretilmez.
- Atama sonrasında belirlenen sürede görevli kabul etmezse talep operatörde ACCEPTANCE_OVERDUE olarak işaretlenir. Ulaşıldı sayılmaz, başka kişiye sessizce devredilmez.
- Her geçişin sahibi ve zamanı kayıtlıdır; istemci doğrudan istediği state'i yazamaz.
- Manuel talep, yinelenen telemetri ve iki operatörün eşzamanlı ataması için tekil kayıt/transaction/revision kontrolü uygulanır.

## 11. Güven sınırları ve veri saklama

- Ekranda sürekli “Hackathon prototipi — resmî güvenlik hizmetine bağlı değil” ibaresi bulunur. Demo hesaplarına “SAÜ tarafından doğrulandı” rozeti verilmez.
- Demo erişim kodları ortam değişkenlerinden alınır; depoya sır yazılmaz. Kısa ömürlü, sunucuda tutulan rastgele oturum kimliği kullanılır; HTTPS'te Secure/HttpOnly/SameSite çerezi.
- REST mutasyonlarında ve WebSocket bağlantısında izin verilen Origin kontrol edilir; web üzerindeki başka sayfalar oturumla komut gönderemez. Girdi ve paket sıklığı sınırlandırılır.
- Öğrenci yalnızca kendi yürüyüşünü ve karşılıklı kabul edilen grubunun gerekli profil/buluşma bilgilerini görür. Üye isimleri açık kampüs haritasında yayınlanmaz.
- Görevli sadece kendisine atanan talebin konumunu görür. Operatör rolü demo ortamıyla sınırlıdır. Sunum rolü yalnızca sentetik veri alır.
- Gerçek cihaz koordinatları normal demo seed verisine karıştırılmaz; ayrı test oturumunda tutulur. Açık izinle başlar; yürüyüş sonunda izleme durur.
- Gerçek cihaz test konumları oturum bitiminde silinir; kopmuş oturumlar için 1 saatlik silme süresi uygulanır. DB'den silme yanında log ve yedeklerde bu verinin tutulmaması sağlanır. Sentetik fixture verisi kişisel veri diye sunulmaz.
- Kişinin yanıt vermemesi ve konum paylaşmaması tehlike/kötü niyet etiketi üretmez. İşlem kabulü kullanıcıya gerçek durumu yansıtır.
- Yakındaki öğrencilere olay konumu yayımlanmaz; müdahale/takip çağrısı gönderilmez. İhtiyaç yalnızca yetkili role iletilir.
- Kamera, e-posta ve aydınlatma verilerinin her biri için kaynak, tarih ve doğrulanma durumu provenance.md'de tutulur. “Bilinmiyor” geçerli bir değerdir.
- E-posta hesabına erişim, aktif öğrencilik veya cinsiyet doğrulaması sayılmaz. Kız öğrenci üyeliği için ayrı uygunluk kontrolü gerekir; operasyon yöntemi ve kabul edilmemiş yüz yüze belge kontrolü önerisi KOVAN_PILOT_KAPSAMI.md'dedir. Argon'un açık yabancı eşleştirmesi sonraki pilota bırakılır. Tamamlanan yürüyüş sayısı güvenilirlik puanı olarak kullanılmaz. Dört haneli buluşma kodu veya QR eklenirse yalnızca doğru demo grubunu tanımaya yarar; GPS 50 metre sınırı fiziksel varlık ya da kimlik ispatı değildir ve P0 koşulu yapılmaz.

## 12. Ortak çalışma düzeni

Bu plan iki AI'ın doğrudan birbirine bağlandığını varsaymaz. Miraç, Argon/Gemini ile Codex arasındaki kısa karar ve kod paketlerini taşır.

| İnsan sorumluluğu | AI desteği | Sahiplik |
|---|---|---|
| Geliştirici 1: backend ve entegrasyon | Codex | API, auth, durum, repository, yayın; sözleşme sorumluluğu |
| Geliştirici 2: algoritmalar ve veri doğrulama | Codex | engines, testler, campus.geojson ve provenance |
| Geliştirici 3: öğrenci/görevli arayüzü | Argon | Student, Guard, App, api/client ve ortak tasarım |
| Geliştirici 4: operatör/sunum ve hikâye | Argon | Operator, Presenter, CampusMap, demo-script; saha verisi desteği |

Kurallar:

1. İlk 45 dakikada endpoint/enum/örnek yanıtlar sabitlenir. Argon UI'yi bu örneklere karşı geliştirir; mock veriler tek adaptörde durur.
2. Aynı dosyayı iki AI'a birden düzenletmeyin. App, paket dosyaları, tipler ve ortak CSS'nin tek sahibi Geliştirici 3; backend modellerinin tek sahibi Geliştirici 1.
3. Her AI değişiklik paketini “değişen dosyalar / sözleşme değişikliği / nasıl denendi / açık sorunlar” biçiminde teslim eder.
4. Sözleşme değişikliği iki tarafa iletilmeden birleştirilmez. UI kendi enum'larını veya risk sonuçlarını icat etmez; motor sonucu backend'den gelir.
5. İlk uçtan uca bağlantı üçüncü saatte hedeflenir. Son saate kadar arayüz mock'u üzerinden geliştirme yapılmaz.
6. Model/SDK isimleri ve sürümleri başlangıçta kurularak kilitlenir. İki AI aynı anda bağımlılık veya tasarım sistemi değiştirmez.
7. Miraç nihai kapsam sahibidir. Argon'un v2 yanıtı ve son pilot sınırları değerlendirilmiştir; bu belge açık kararları içeren öneri v1.2 olarak kalır. Önceki parametreler yerine güncel metin kullanılır. KOVAN_PILOT_KAPSAMI.md, kesin kullanıcı kararları ile ek önerileri ayırır.

## 13. Teslime göre sprint

Saatler İstanbul; başlangıç gecikirse P1 ve görsel süslemeler daraltılır, teslim tamponu korunur.

| Zaman | Ortak çıktı / geçiş koşulu |
|---|---|
| 27 Ekim 19.15–20.00 | Kapsam ve sözleşme; depo; başlangıç verileri; demo hesapları |
| 20.00–23.00 | Öğrenci destek ister, operatör görür, görevli kabul eder; iki gerçek istemcide ilk dikey akış |
| 23.00–02.00 | Grup önerisi + kabuller + iki rota; arayüz mock yerine API'ye bağlı |
| 28 Ekim 02.00–05.00 | Üç rol, filtreli yayın, kayıtlar ve senaryo girdileri; P0 uçtan uca |
| 05.00–07.00 | P0 geçtiyse P1 sapma kontrolü ve gerçek telefon/HTTPS denemesi |
| 07.00–09.00 | Yetki, bağlantı kopması, yanlış alarm, yeniden başlatma ve çevrimdışı harita testleri; kapsam dondurma |
| 09.00–10.30 | Arayüz hataları ve sunum okunabilirliği; sürüm adayı |
| 10.30–12.00 | README, GitHub repo hazırlığı, 5 dakika sunum, demo provası, yedek video |
| 12.00–12.30 | Son paket/repo kontrolü, iki ardışık temiz demo; yalnızca kritik düzeltme |
| 12.30–13.00 | Teslim tamponu; yeni özellik yok |

GitHub'da repo oluşturma/yükleme için hesap ve hedef seçimi gerektiğinde Miraç netleştirir; bu plan repo oluşturulduğunu veya kodun yazıldığını iddia etmez.

### Kesme sırası

- 23.00'te dikey akış yoksa: harita animasyonu ve paralel görsel işler durur; herkes entegrasyon hatasını çözer.
- 05.00'te P0 geçmediyse: sapma ve gerçek GPS uygulaması kapsamdan çıkar; sunumda gelecek iş olarak anlatılır.
- 07.00'de telefonda tutarlı çalışmayan özellik varsa: özelliğin kapsamı daraltılır; sentetik oynatım açık etiketle kullanılır. Destek varmış gibi davranılmaz.
- 09.00'da yeni özellik alınmaz. Olası ekstra işler sırası: müsait görevli önerisi, ek senaryo, görsel iyileştirme. Tahminleme bu sürüme eklenmez.

## 14. Kabul testleri

### Grup ve rota

1. Aynı havuzdaki uyumlu 18 sentetik istek için çıktı 3–5 kişilik geçerli gruplar ve gerekçeli eşleşmeme listesi içerir; “18 kişi mutlaka dört grup” sonucu kodda sabitlenmez.
2. Ortak zaman aralığı olmayanlar, izinli çevresi uyuşmayanlar veya kapasite dışındakiler aynı gruba konmaz.
3. Üyelerden biri reddederse yürüyüş kendiliğinden başlamaz. Aktif grubun üyeleri otomatik değiştirilmez.
4. Yol kapatılınca alternatif, gerçek ağ bağlantılarından yeniden hesaplanır; erişilemeyen hedefte sahte rota çizilmez.
5. Maliyetler negatif olamaz. Aynı girdiler aynı sonuçları verir; bilinmeyen aydınlatma bilgisi görünürdür.

### Görev ve gerçek zaman

6. Öğrenci talebi ikinci istemcide görünür; operatör ataması, görevli kabulü ve ulaşıldı durumları ayrı doğrulanır. Yerel testte güncelleme için hedef <= 2 saniye; ölçüm kaydedilir, garanti diye sunulmaz.
7. Aynı talebin tekrarı tek kayıt üretir. Aynı göreve iki eşzamanlı atamada biri başarılı, diğeri 409 olur.
8. Öğrenci başka öğrencinin konumunu okuyamaz; öğrenci operatör/görevli komutu çalıştıramaz; yanlış görevli kabul veremez.
9. Ağ kesilince “gönderildi” veya “görevli geliyor” diye başarılı durum gösterilmez. İstemci yeniden bağlanınca yetkili tam durum alınır.
10. Backend yeniden başladığında açık görevler korunur. Demo reseti önceki run_id'nin timer ve olaylarını yeni senaryoya sızdırmaz.
10a. Operatör üstlenmeden görevli kabul edilmiş görünmez; atama, saha kabulü yerine geçmez. Geciken iş sonradan kabul edilebilir, gecikme geçmişi korunur.
10b. Varış teyidi kapalı yürüyüşte zamanlayıcı olay üretmez. Açık yürüyüşün süresi ve ek süresi dolunca yalnızca bir inceleme kaydı oluşur; tamamlanmış/iptal edilmiş yürüyüş için oluşmaz. Sunucu yeniden başlatmasında kalıcı deadline yeniden değerlendirilir; istemci saatini değiştirmek süreyi uzatmaz.

### P1 ve veri doğruluğu

11. Düşük doğruluk, eski paket ve tek GPS sıçraması kontrol/olay açmaz. Kaliteli ve devam eden sentetik sapma kontrol isteği açar.
12. “İyiyim” yanıtı kontrolü kapatır. Cevapsız kontrol sadece inceleme talebi oluşturur; saldırı etiketi üretmez.
13. Konum izni verilmeden manuel başlangıç ve yardım akışı kullanılabilir. Arka plan/kilit ekranı davranışı cihaz bazında açıkça yazılır.
14. Canlı cihaz verisi ile simülasyon birbirine karışmaz; tüm sentetik örneklerde etiket görünür.
15. Yürüyüş bitince gerçek cihaz test konumları silinir ve izleme durur.
15a. Dört ölçüm tek saniyeye yığılmışsa süre koşulu sağlanmaz. Eşik üstü dört ölçüm arasında uzun boşluk varsa süreklilik sağlanmaz. Geçersiz ölçümden önceki sayaç sonrakine taşınmaz.
15b. Senaryo kontrolü sadece taslak/demo verisini değiştirir. Açık bir gerçek cihaz test yürüyüşünün üyeleri, rotası veya varış süresi resetlenmez.

### Teslim

16. README'deki adımlarla temiz başlatma denenir; frontend build ve backend testleri geçer.
17. Uzak harita katmanı erişilemese de yerel GeoJSON, durumlar ve akış görünür. Üçüncü taraf tile'lar izinsiz toplu indirilmez; kendi şematik katmanımız kullanılır.
18. Aynı teslim sürümüyle iki ardışık demo yapılır; bilinen sınırlamalar README'de bulunur. Sunumda gerçek konum/olay ayrıntıları kullanılmaz.

## 15. Üç dakikalık demo

- **0.00–0.35:** Öğrenci kütüphaneden çıkış niyeti girer. Ekranda “örnek kampüs ağı / sentetik katılımcılar” etiketi vardır.
- **0.35–1.10:** Motor grup önerir; üyeler kabul eder. En kısa ve aydınlatma öncelikli rota gerekçeleri görünür.
- **1.10–1.40:** Jüri bir yolu kapatır veya bir zaman aralığını değiştirir. Motor yeniden hesaplar; oluşan fark açıklanır.
- **1.40–2.10:** Manuel destek talebi açılır. P1 hazırsa buna ek olarak etiketli sentetik sapma kontrolü gösterilebilir.
- **2.10–2.45:** Operatör atar, başka telefondaki görevli kabul eder. Kabul edilmeyen görevin beklemede kaldığı da gösterilir.
- **2.45–3.00:** Ulaşıldı/çözüldü ve yürüyüş kapanışı; ölçülen bekleme ve kabul süreleri.

Wow anı: Jüri girdiyi değiştirir, plan gerçekten değişir; ikinci cihazdaki görevli kabul ettiğinde öğrenci ekranında gerçek durum güncellenir. Saldırı canlandırması veya kurgusal kurtarma süresi gerekmez.

## 16. Beş teslim çıktısı

1. Çalışan prototip: tek komutla başlatılabilir paket; telefon denemesi için HTTPS adresi uygunsa ayrıca hazırlanır.
2. GitHub repo: kod, kilitli bağımlılıklar, sentetik veriler; erişim kodları ve gerçek koordinat test kayıtları yok.
3. README: kurulum, roller, demo adımları, algoritmaların sınırı, veri kaynakları, test sonuçları.
4. Kısa sunum: gerçek ihtiyaç → yeniden tasarlanan süreç → canlı akış → teknik katkı → pilot planı. Beş dakika.
5. Canlı demo ve yedek: üç dakikalık akış, yerel şema haritası, kısa yedek ekran kaydı.

## 17. Argon'a dönüş paketi

Argon bu belgeye tek yanıtta şu dört başlıkla dönsün:

1. Kabul ettiği kapsam ve değiştirmek istediği en fazla üç karar; gerekçesiyle.
2. Öğrenci, görevli ve operatör ekranlarının durum/boş/hata hallerini içeren bileşen planı.
3. API sözleşmesinde ihtiyaç duyduğu ek alanlar; alan adı ve örnek değerle.
4. Kendi teslim edeceği dosyaların listesi; ortak dosya sahipliklerine uyarak.

Kodlama sırasında mesaj şablonu: “Dosyalar: … / Sözleşme: değişmedi veya … / Denenen akış: … / Açık sorun: …”.

## 18. Başvuru kaynakları

- İlk öneri: Miraç'ın paylaştığı sau_kovan_codex_spec.md; doğrulanmış saha verisi yerine başlangıç taslağı.
- SAÜ güvenlik altyapısı: https://yesilkampus.sakarya.edu.tr/tr/icerik/20521/106728/guvenlik-ve-emniyet-tesisleri
- SAÜ güvenlik iletişimi: https://guvenlik.sakarya.edu.tr/tr/18219/iletisim
- Berkeley Safewalk: https://nightsafety.berkeley.edu/nightsafety/escort
- Konum belirsizliği: https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates/accuracy
- Arka plan sayfa davranışı: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
- Titreşim desteği: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate
- Wake Lock sınırları: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
- Konum hata nedenleri: https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError
- FastAPI WebSocket, kimlik doğrulama ve tek süreç sınırı: https://fastapi.tiangolo.com/advanced/websockets/
- Vite üretim build/deploy ayrımı: https://vite.dev/guide/static-deploy
- Leaflet yerel GeoJSON: https://leafletjs.com/examples/geojson/

Bu kaynaklar teknik olanak ve mevcut hizmet örneklerini destekler. Kovan'ın güvenlik etkinliğinin doğrulandığı anlamına gelmez. Gerçek pilot, güvenlik birimiyle operasyon ve veri erişiminin ayrıca kararlaştırılmasını gerektirir.
