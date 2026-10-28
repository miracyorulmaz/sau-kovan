# Kovan — daraltılmış pilot

Üyelik uygunluğu kontrol edilmiş kız öğrenciler için belirlenmiş kampüs buluşma noktalarından dört kız yurduna birlikte yürüyüş ve yardım koordinasyonu prototipi.

**Bu sürüm yalnızca sentetik gösterimdir.** Gerçek öğrenci hesabı açmaz, kimlik/cinsiyet doğrulamaz, e-Devlet'e veya SAÜ güvenliğine bağlanmaz. Uygunluk incelemesi DEMO_TEST olarak işaretlidir. Gerçek kabul operasyonunun sahibi ve yöntemi henüz kararlaştırılmadı.

## Pilot listesi

Varışlar: Sabahattin Zaim, Rahime Sultan, Ayşe Hümeyra Ökten, Esentepe kız yurtları.

Başlangıçlar: SAÜ Kütüphanesi, Kampüs Adıbahçe, Kampüs girişi (SAÜSEM), Son durak (Vib Turizm).

Sekiz noktanın kaynaklı Google Maps pinleri hazırdır; anahtarlar ayarlandığında 16 başlangıç–yurt çifti için gerçek yürüyüş rotası ve tahmini süre alınır. [Konumlar ve kaynakları](docs/MAP_POINTS.md). Giriş kapıları, bekleme alanları ve çalışma saatleri saha teyidi bekler. Google rotası güvenlik değerlendirmesi değildir. Teknik konsoldaki **SYNTHETIC_SCHEMATIC** örneğinin mesafeleri ve aydınlatma değerleri sentetiktir.

## Çalışan parçalar

- Ayrı erişim kodlarıyla öğrenci, uygunluk inceleyici, operatör, görevli ve demo yöneticisi oturumları.
- Onaysız/iptal edilmiş/süresi dolmuş üyeliğin yeni yürüyüş açmasının engellenmesi; yetkili rolün sentetik başvuru onayı.
- Başlangıç/varış allowlist'inin sunucuda kontrolü.
- Ortak zaman aralığına sahip 3–5 kişilik deterministik grup önerisi; her üyenin kabulü veya reddi.
- Şematik ağda en kısa/aydınlatma öncelikli rota, bağlantı kapatma ve yeniden hesaplama.
- CREATED → OPERATOR_ACKED → ASSIGNED → ARRIVED → RESOLVED görev akışı. Operatör ataması saha birimini doğrudan sevk eder; görevli yalnızca varış bildirir.
- Tekrar yardım isteğine karşı idempotency; aynı görevliye eşzamanlı iki aktif iş atamasını engelleme.
- İsteğe bağlı sunucu varış teyidi; cevapsızsa inceleme kaydı. Saldırı sonucu çıkarılmaz.
- SQLite kalıcılığı, varlık sürüm kontrolü, role göre filtreli WebSocket durumları ve gecikme işaretleri.

React arayüzü `frontend/` klasöründedir. `/` öğrencinin sade planlama, grup kabulü, yürüyüş ve yardım ekranıdır; `/demo` Argon'un teknik operasyon konsoludur. Canlı API, role göre oturum ve WebSocket durumları bağlanmıştır. API etkileşimli dokümantasyonu `/docs` yolundadır. Sürekli GPS takibi/sapma ölçümü, e-posta kayıt sistemi ve resmî güvenlik entegrasyonu uygulanmadı.

Öğrenci ekranındaki **Demo kontrolü** komutsuz arkadaş ekleme/onay, demo saatini şimdiye alma, operatör/görevli zinciri ve kişisel bildirim kutusunu içerir. Çıkış tarih-saatini elle seçerek 3 veya 10 saat sonrası için plan açılabilir. Google yürüyüş rotası/süre önizlemesi ile WhatsApp bildirim adaptörü eklendi; anahtarlar yokken gerçek rota veya mesaj üretilmez. Kampüs dışı kişisel yardım ve isteğe bağlı tek seferlik cihaz konumu, grup/yürüyüşten bağımsızdır. [Kurulum ve uçtan uca prova](docs/INTEGRATIONS.md).

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

Öğrenci ekranında bir buluşma noktası, yurt ve çıkış saati seçip **Yol arkadaşı bul** düğmesine basın. Öğrenci erişim koduyla giriş yapılır; seçimler sunucuya bir plan olarak kaydedilir. Grup bulunduğunda her öğrenci kendi hesabından kabul verir. Ortak çıkış aralığında yürüyüş başlatılır; yardım talebi ve varış onayı aynı ekrandadır. Giriş kodu saklanmaz; sayfa yenilendiğinde HttpOnly oturum çereziyle mevcut plan geri yüklenir.

Sunum verisi hazırlamak ve görevli/operatör işlemleri için `/demo` kullanılır. Bu sayfa **Canlı Backend (/api + WS)** modunda açılır. Presenter ile reset yapılır; farklı öğrencilerin kabulü ayrı tarayıcı oturumlarından veya konsolda ilgili kodlarla gösterilebilir. Aynı tarayıcıdaki sekmeler oturum çerezini paylaşır; farklı öğrenci/operatör hesapları için ayrı tarayıcı profili veya farklı tarayıcı kullanın. Öğrenci ekranı yerel simülatöre bağlı değildir.

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

### Tek kişiyle öğrenci demosu

Öğrenci ekranında `student-01` ile bir plan oluşturduktan sonra proje kökünde `./demo-companions.ps1` çalıştırın. Bu yerel yardımcı, mevcut planı sıfırlamadan iki boş sentetik öğrenci hesabıyla uyumlu planlar ekler ve diğer üyelerin kabulünü ayrı oturumlarından verir. Öğrencinin kendi kabulünü vermez ve yürüyüşünü başlatmaz. Ekranda **Gruba katıl → Yürüyüşü başlat** adımlarını öğrenci tamamlar. Mevcut gruba tekrar çalıştırmak yeni üyeler eklemez.

İleri saat seçtiyseniz, henüz herkes kabul etmeden `./demo-companions.ps1 -Now` seçilen nokta ve yurdu koruyarak demo planını şimdiye alır. Eski plan, grubun normal reddetme akışıyla kapatılır; tüm veriyi sıfırlayan reset kullanılmaz. Varsayılan öğrenci `student-01`; farklı hesap için `-StudentId student-06` verilebilir. Bu yardımcı yalnız localhost ve `DEMO_TEST` hesaplarında çalışır; normal öğrenci arayüzünde otomatik kabul yoktur.

`contracts/openapi.json` uygulanan sözleşmedir. `docs/ARGON_HANDOFF.md` endpoint sırasını ve veri etiketlerini anlatır. Daha önce yazılan mimari planlar hedef kapsamı içerir; uygulanmış endpoint'ler için bu paketteki OpenAPI geçerlidir. Özellikle genel bir `/transition`, canlı GPS veya `/api/sandbox/recalculate` endpoint'i henüz yoktur.

Vite `/api` ve `/api/events` isteklerini backend'e proxy eder; cookie ve istemci Origin başlığı korunur. Varsayılan izin listesinde localhost/127.0.0.1 için 8000 ve 5173 vardır. Uygulama kökteki `.env` dosyasından yalnızca `.env.example` içindeki Kovan ayarlarını okur; süreç ortam değişkenleri önceliklidir. Başlatıcı seçilen portları alt süreçlere aktarır. Simülatör sunucudan bağımsız sunum provası içindir; canlı moddaki bir hata simülatöre düşürülmez.

## Operasyon sınırları

- Tek backend süreci; `--workers 1`. WebSocket istemcileri 500 ms aralıkla revizyon değişimini kontrol eder. Büyük ölçek iddiası yok.
- Demo yöneticisi reset ve bağlantı değişiklikleri yapabilir; öğrenci/inceleyici/görevli yapamaz.
- Operatör `/assign` ile saha birimini doğrudan sevk eder (`ASSIGNED`). Atanan görevli `/arrive` ile olay yerine ulaştığını bildirir; ayrı kabul adımı yoktur. Resmî bildirim/SMS/112 gönderilmez.
- Süresi dolan, başlamamış grup EXPIRED olur. Eşleştirme açgözlüdür; küresel optimum iddiası yok. Grubun her üyesi kendi yürüyüşünü başlatır ve tamamlar.
- Erişim kodları, gerçek hesap doğrulama sisteminin yerine geçmez. Tüm kullanıcılar sentetiktir; kendi beyanını onaylı üyeliğe dönüştüren kayıt endpoint'i yoktur.
- E-posta, kimlik veya fotoğraftan cinsiyet tahmini yapılmaz. Kız yurdu kaydıyla manuel uygunluk kontrolü yalnızca önerilmiş operasyon yöntemidir.
- HTTP ve Secure olmayan çerezler sadece localhost geliştirmesi içindir. Telefon/uzak barındırma için HTTPS, Secure çerez ve açık origin listesi gerekir. Varsayılan sunucu yalnızca 127.0.0.1'e bağlanır.
- SQLite snapshot modeli en çok 60 sentetik katılımcının demo iş yüküne yöneliktir. Tam izleme ve üretim ölçeği kurulmadı.
- FastAPI/Starlette test istemcisi, HTTPX için ileri sürüm uyumluluğuna ilişkin bir deprecation uyarısı verebilir; test sonucunu etkilemez.

## Veri kaynağı

Yurt isim/tip kontrolü: https://kygm.gsb.gov.tr/Ajax/gettesis.aspx?il=sakarya (27 Ekim 2026). Bu kaynak, gerçek zamanlı güvenlik veya yurtla iş birliği doğrulaması değildir.

Kapsam kararları için [pilot kapsamı](docs/planning/KOVAN_PILOT_KAPSAMI.md), otomasyon gereksinimi için [üyelik doğrulama notu](docs/planning/KOVAN_DOGRULAMA_YAKLASIMI.md) dosyalarını kullanın. [Planlama dizini](docs/planning/README.md), hedef kapsam ile uygulanmış sözleşmeyi ayırır.
