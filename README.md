# Kovan — daraltılmış pilot

Üyelik uygunluğu kontrol edilmiş kız öğrenciler için belirlenmiş kampüs buluşma noktalarından dört kız yurduna birlikte yürüyüş ve yardım koordinasyonu prototipi.

**Bu sürüm yalnızca sentetik gösterimdir.** Gerçek öğrenci hesabı açmaz, kimlik/cinsiyet doğrulamaz, e-Devlet'e veya SAÜ güvenliğine bağlanmaz. Uygunluk incelemesi DEMO_TEST olarak işaretlidir. Gerçek kabul operasyonunun sahibi ve yöntemi henüz kararlaştırılmadı.

## Pilot listesi

Varışlar: Sabahattin Zaim, Rahime Sultan, Ayşe Hümeyra Ökten, Esentepe kız yurtları.

Başlangıçlar: Kütüphane, Çınaraltı, kampüs girişi, kampüs market önü.

İsimler sabit allowlist'tir. Kesin giriş koordinatları, noktaların saatleri ve yol geometrisi saha teyidi bekler. Rota örneği **SYNTHETIC_SCHEMATIC** etiketli soyut ağdır; gerçek navigasyon için kullanılamaz. Mesafeler ve aydınlatma değerleri de sentetiktir.

## Çalışan parçalar

- Ayrı erişim kodlarıyla öğrenci, uygunluk inceleyici, operatör, görevli ve demo yöneticisi oturumları.
- Onaysız/iptal edilmiş/süresi dolmuş üyeliğin yeni yürüyüş açmasının engellenmesi; yetkili rolün sentetik başvuru onayı.
- Başlangıç/varış allowlist'inin sunucuda kontrolü.
- Ortak zaman aralığına sahip 3–5 kişilik deterministik grup önerisi; her üyenin kabulü veya reddi.
- Şematik ağda en kısa/aydınlatma öncelikli rota, bağlantı kapatma ve yeniden hesaplama.
- CREATED → OPERATOR_ACKED → ASSIGNED → GUARD_ACCEPTED → ARRIVED → RESOLVED görev akışı.
- Tekrar yardım isteğine karşı idempotency; aynı görevliye eşzamanlı iki aktif iş atamasını engelleme.
- İsteğe bağlı sunucu varış teyidi; cevapsızsa inceleme kaydı. Saldırı sonucu çıkarılmaz.
- SQLite kalıcılığı, varlık sürüm kontrolü, role göre filtreli WebSocket durumları ve gecikme işaretleri.

Argon'un React arayüzü `frontend/` klasöründedir; canlı API, role göre oturum ve WebSocket durumları bağlanmıştır. API etkileşimli dokümantasyonu `/docs` yolundadır. Gerçek GPS/sapma ölçümü, e-posta kayıt sistemi ve güvenlik entegrasyonu uygulanmadı.

## Kurulum

Python 3.11+ ve Node.js 20.19+ gereklidir. Proje kökünde:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-lock.txt
npm ci --prefix frontend
Copy-Item .env.example .env
```

Başlatma:

```powershell
.\start.ps1 -PythonPath .\.venv\Scripts\python.exe
```

Tek komut her iki sunucuyu başlatır. Önizleme: `http://127.0.0.1:5173`; API: `http://127.0.0.1:8000/docs`. Ctrl+C iki sunucuyu da kapatır. Yalnız backend için `-BackendOnly`; farklı portlar için `-Port 8001 -FrontendPort 5174` verilebilir. Kullanımdaki portta ikinci sunucu başlatılmaz.

Arayüz **Canlı Backend (/api + WS)** modunda açılır. Önce `presenter` seçip yerel demo koduyla giriş yapın ve üç öğrenciyle sahneyi sıfırlayın. Ardından `student-01` ile eşleştirin; üç öğrenci de kendi koduyla oturum açıp kendi kabulünü verir. Her rolün kodu ilk geçişte istenir; aynı sayfa açıkken daha önce giriş yapılan role tekrar geçilebilir. Sayfa yenilenince kodlar bellekten silinir.

İlk başlatmada `.local/demo-access.json` içinde her demo rolü için rastgele erişim kodu oluşturulur. Bu dosya ve SQLite `.gitignore` kapsamındadır; paylaşmayın, sunum ekranına koymayın. `POST /api/auth/demo-session` gövdesine `access_code` verilince HttpOnly oturum çerezi üretilir. Yanıt ve doğrulama hataları erişim kodunu geri yazmaz. `.local` klasörü kaybolursa eski kodlar kullanılamaz; ilk kurulumdan sonra yedeğini yalnızca güvenilen yerel ortamda tutun.

Test ve örnek API akışı:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe scripts\smoke_demo.py
npm test --prefix frontend
npm run build --prefix frontend
```

`smoke_demo.py` sentetik senaryoyu sıfırlar; diğer açık demo oturumları da bu reseti görür. Gerçek kayıtlar desteklenmediği için bu komut gerçek kullanıcı verisi üzerinde kullanılmaz.

## Argon entegrasyonu

`contracts/openapi.json` uygulanan sözleşmedir. `docs/ARGON_HANDOFF.md` endpoint sırasını ve veri etiketlerini anlatır. Daha önce yazılan mimari planlar hedef kapsamı içerir; uygulanmış endpoint'ler için bu paketteki OpenAPI geçerlidir. Özellikle genel bir `/transition`, canlı GPS veya `/api/sandbox/recalculate` endpoint'i henüz yoktur.

Vite `/api` ve `/api/events` isteklerini backend'e proxy eder; cookie ve istemci Origin başlığı korunur. Varsayılan izin listesinde localhost/127.0.0.1 için 8000 ve 5173 vardır. Uygulama kökteki `.env` dosyasından yalnızca `.env.example` içindeki Kovan ayarlarını okur; süreç ortam değişkenleri önceliklidir. Başlatıcı seçilen portları alt süreçlere aktarır. Simülatör sunucudan bağımsız sunum provası içindir; canlı moddaki bir hata simülatöre düşürülmez.

## Operasyon sınırları

- Tek backend süreci; `--workers 1`. WebSocket istemcileri 500 ms aralıkla revizyon değişimini kontrol eder. Büyük ölçek iddiası yok.
- Demo yöneticisi reset ve bağlantı değişiklikleri yapabilir; öğrenci/inceleyici/görevli yapamaz.
- Yardım, yalnızca görevli kabul ettiğinde GUARD_ACCEPTED olur. Resmî bildirim/SMS/112 gönderilmez.
- Süresi dolan, başlamamış grup EXPIRED olur. Eşleştirme açgözlüdür; küresel optimum iddiası yok. Grubun her üyesi kendi yürüyüşünü başlatır ve tamamlar.
- Erişim kodları, gerçek hesap doğrulama sisteminin yerine geçmez. Tüm kullanıcılar sentetiktir; kendi beyanını onaylı üyeliğe dönüştüren kayıt endpoint'i yoktur.
- E-posta, kimlik veya fotoğraftan cinsiyet tahmini yapılmaz. Kız yurdu kaydıyla manuel uygunluk kontrolü yalnızca önerilmiş operasyon yöntemidir.
- HTTP ve Secure olmayan çerezler sadece localhost geliştirmesi içindir. Telefon/uzak barındırma için HTTPS, Secure çerez ve açık origin listesi gerekir. Varsayılan sunucu yalnızca 127.0.0.1'e bağlanır.
- SQLite snapshot modeli en çok 60 sentetik katılımcının demo iş yüküne yöneliktir. Tam izleme ve üretim ölçeği kurulmadı.
- FastAPI/Starlette test istemcisi, HTTPX için ileri sürüm uyumluluğuna ilişkin bir deprecation uyarısı verebilir; test sonucunu etkilemez.

## Veri kaynağı

Yurt isim/tip kontrolü: https://kygm.gsb.gov.tr/Ajax/gettesis.aspx?il=sakarya (27 Ekim 2026). Bu kaynak, gerçek zamanlı güvenlik veya yurtla iş birliği doğrulaması değildir.

Kapsam kararları için [pilot kapsamı](docs/planning/KOVAN_PILOT_KAPSAMI.md), otomasyon gereksinimi için [üyelik doğrulama notu](docs/planning/KOVAN_DOGRULAMA_YAKLASIMI.md) dosyalarını kullanın. [Planlama dizini](docs/planning/README.md), hedef kapsam ile uygulanmış sözleşmeyi ayırır.
