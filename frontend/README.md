# SAÜ-Kovan — Argon Frontend (`frontend/`)

React + Vite uygulamasıdır. `/` sade öğrenci ekranı; `/demo` ayrı yüklenen teknik operasyon konsoludur. Uygulanan API sözleşmesi `../contracts/openapi.json` dosyasındadır. Öğrenci ekranı yalnız canlı sunucu durumunu kullanır; konsoldaki simülatör bağımsız sunum provası içindir.

## Hızlı Kurulum ve Çalıştırma

1. Backend sunucusunun CORS izinli origin listesine geliştirme adresini ekleyin (`*` kullanmayın):
   - Örn: `http://127.0.0.1:5173` ve `http://localhost:5173`
2. Proje kökünde `npm ci --prefix frontend` ile bağımlılıkları yükleyin. Python kurulumu da hazırsa `./start.ps1` iki sunucuyu birlikte açar. Frontend'i ayrı çalıştırmak için:
   ```powershell
   cd frontend
   $env:VITE_BACKEND_ORIGIN = 'http://127.0.0.1:8000'
   npm run dev
   ```
3. Vite otomatik olarak `/api` isteklerini HTTP üzerinden, `/api/events` WebSocket bağlantılarını ise WS üzerinden backend'e proxy'ler; böylece tarayıcı oturum çerezi (`cookie`) sorunsuz saklanır.
4. Proje kökündeki `.local/demo-access.json` dosyası hesap kimliğini erişim koduna eşler. Öğrenci ekranındaki **Giriş yap** penceresine öğrenci kodunu girin; bu kod saklanmaz. Teknik konsolda ise rol seçip kodunu üst bardaki parola alanına girin. Rol seçmek tek başına yetki vermez; sunucunun döndürdüğü kimlik geçerlidir. Konsoldaki kodlar günlükte gizlenir; aynı sayfa içinde hesaplar arasında geçiş için bellekte tutulur ve sayfa yenilenince silinir.

Varsayılan öğrenci önizlemesi: http://127.0.0.1:5173. Seçilen buluşma noktası, yurt ve çıkış saati `POST /api/intents` ile kaydedilir; grup önerisi bundan sonra istenir. Her öğrenci yalnız kendi kabulünü ve yürüyüşünü işler. Giriş kodu saklanmaz, sayfa yenilemede mevcut çerezle plan geri yüklenir. `src/student/` API erişimi, durum seçimi, bağlantı yönetimi ve ekranları ayırır.

Teknik konsol: http://127.0.0.1:5173/demo. **Canlı Backend (/api + WS)** modunda açılır. Katalog ve kenarlar bootstrap'tan okunur; WebSocket durumları ekrana uygulanır. Bağlantı kesilirse yeniden bağlanma ve REST yedeği devreye girer. Canlı işlem hatası yerel başarıya çevrilmez. Aynı tarayıcıdaki sekmeler çerezi paylaşır; eşzamanlı farklı roller için ayrı tarayıcı profilleri kullanın.

Sunum sırası: presenter ile üç öğrencili reset; student-01 ile preview; student-01/02/03 ile ayrı ayrı kabul; student-01 ile yürüyüş ve yardım; operator ile ACK/atama; guard-01 ile kabul/varış; operator ile kapatma; öğrenci ile yürüyüş tamamlama.

Kontrol: `npm test` ve `npm run build`. Gerçek öğrenci/kimlik doğrulaması, sürekli konum takibi ve resmî güvenlik bağlantısı yoktur. Yardım anında izinle tek seferlik cihaz konumu alınabilir. Google rota ve WhatsApp adaptörleri, gerekli anahtarlar olmadan gerçek servis çağrısı yapmaz. Yeni komutsuz demo paneli ve kurulum için `../docs/INTEGRATIONS.md` dosyasına bakın.

## Pilot kuralları
- **Sabit Pilot Noktaları:** Yalnızca `meet_library`, `meet_adibahce`, `meet_campus_gate`, `meet_final_stop` başlangıçları ve `dorm_sabahattin_zaim`, `dorm_rahime_sultan`, `dorm_ayse_humeyra_okten`, `dorm_esentepe` varışları kullanılır (422 koruması).
- **Sentetik Şematik Ağ (`SYNTHETIC_SCHEMATIC`):** Gerçek koordinat veya kamera verisi uydurulmamıştır; `null` alanlar olduğu gibi korunur ve soyut topoloji şeması ile `shortest` vs `lighting_first` kart karşılaştırması gösterilir.
- **Demo Uygunluk Onayı:** Onaylı kullanıcılar için *"SAÜ tarafından doğrulandı"* ifadesi **kullanılmaz**; sözleşmedeki gibi yalnızca **"Demo uygunluk onayı (DEMO_TEST)"** etiketi gösterilir.
- **İyimser Kilitleme (`expected_version`) ve İdempotent Yardım (`idempotency_key`):** Tüm kabul, yürüyüş başlatma/tamamlama ve görev durum geçişlerinde (`CREATED → OPERATOR_ACKED → ASSIGNED → GUARD_ACCEPTED → ARRIVED → RESOLVED`) güncel `version` gönderilir.
