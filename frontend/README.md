# SAÜ-Kovan — Argon Frontend (`frontend/`)

React + Vite + Tailwind CSS ile hazırlanmış demo operasyon konsoludur. Uygulanan API sözleşmesi `../contracts/openapi.json` dosyasındadır. Canlı mod sunucu durumunu kullanır; simülatör bağımsız sunum provası içindir.

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
4. Proje kökündeki `.local/demo-access.json` dosyası hesap kimliğini erişim koduna eşler. İlgili rolü seçip kodunu üst bardaki parola alanına girin. Rol seçmek tek başına yetki vermez; sunucunun döndürdüğü kimlik geçerlidir. Kod girişten sonra alandan temizlenir ve günlükte gizlenir. Daha önce giriş yapılan hesaba aynı sayfa içinde tekrar geçilebilir; sayfa yenilenince bellekteki kodlar silinir.

Varsayılan önizleme: http://127.0.0.1:5173. Sayfa **Canlı Backend (/api + WS)** modunda açılır. Katalog ve kenarlar bootstrap'tan okunur; WebSocket durumları ekrana uygulanır. Bağlantı kesilirse yeniden bağlanma ve REST yedeği devreye girer. Canlı işlem hatası yerel başarıya çevrilmez.

Sunum sırası: presenter ile üç öğrencili reset; student-01 ile preview; student-01/02/03 ile ayrı ayrı kabul; student-01 ile yürüyüş ve yardım; operator ile ACK/atama; guard-01 ile kabul/varış; operator ile kapatma; öğrenci ile yürüyüş tamamlama.

Kontrol: `npm test` ve `npm run build`. Gerçek GPS, öğrenci/kimlik doğrulaması ve resmî güvenlik bağlantısı bu sürümde yoktur.

## Pilot kuralları
- **Sabit Pilot Noktaları:** Yalnızca `meet_library`, `meet_cinaralti`, `meet_campus_gate`, `meet_campus_market` başlangıçları ve `dorm_sabahattin_zaim`, `dorm_rahime_sultan`, `dorm_ayse_humeyra_okten`, `dorm_esentepe` varışları kullanılır (422 koruması).
- **Sentetik Şematik Ağ (`SYNTHETIC_SCHEMATIC`):** Gerçek koordinat veya kamera verisi uydurulmamıştır; `null` alanlar olduğu gibi korunur ve soyut topoloji şeması ile `shortest` vs `lighting_first` kart karşılaştırması gösterilir.
- **Demo Uygunluk Onayı:** Onaylı kullanıcılar için *"SAÜ tarafından doğrulandı"* ifadesi **kullanılmaz**; sözleşmedeki gibi yalnızca **"Demo uygunluk onayı (DEMO_TEST)"** etiketi gösterilir.
- **İyimser Kilitleme (`expected_version`) ve İdempotent Yardım (`idempotency_key`):** Tüm kabul, yürüyüş başlatma/tamamlama ve görev durum geçişlerinde (`CREATED → OPERATOR_ACKED → ASSIGNED → GUARD_ACCEPTED → ARRIVED → RESOLVED`) güncel `version` gönderilir.
