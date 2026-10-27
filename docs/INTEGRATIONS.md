# Kovan — yerel demo ve servis bağlantıları

## Komutsuz uçtan uca prova

`http://127.0.0.1:5173` adresinde öğrenci koduyla giriş yapın. Çıkış tarihini ve saatini elle seçin; hızlı seçimlerde **Şimdi**, **+3 saat**, **+10 saat** vardır. Plan önümüzdeki 24 saat içinde başlayabilir. Eşleştirme aralığı, seçilen başlangıçtan itibaren 10 dakikadır; üç saatlik bekleme bir yürüyüş süresi değildir.

1. Nokta ve yurt seçip **Yol arkadaşı bul** ile plan oluşturun.
2. Bekleme ekranında **İki demo arkadaşı ekle ve onaylat** düğmesine basın. Aynı plan için tekrar basmak yeni üyeler eklemez. Diğer sentetik öğrenciler kabul verir; sizin kabulünüz ve yürüyüşünüz otomatik başlatılmaz.
3. **Gruba katıl** ile kendi kabulünüzü verin. Ortak çıkış aralığında **Yürüyüşü başlat** açılır. Gelecekteki bir planı hemen denemek için **Demo kontrolü → Yolculuk → Demo çıkışını şimdiye al** kullanılabilir. Nokta ve yurt korunur, yeni grubun kendi kabulünüzü tekrar vermeniz gerekir.
4. Yürüyüşte **Yardım iste** talebini açın. **Demo kontrolü → Operatör / görevli** bölümünde talebi görün ve operatör görme, atama, görevli kabulü, varış, kapatma adımlarını sırayla ilerletin. İşlemler normal sunucu sürüm ve geçiş kontrollerini kullanır; öğrenci oturum çerezi değiştirilmez.
5. **Bildirim kutusu** kişisel bildirim sonucunu gösterir. DEMO modunda gerçek mesaj gönderilmez. Acil durum kişisi eklendiyse **Örnek konumla demo bildirimi oluştur** ile cihaz izni olmadan, açıkça örnek olarak işaretlenen (0,0) koordinatıyla prova yapılabilir. Bu konum canlı WhatsApp gönderimine çıkamaz.

Kontroller `KOVAN_ENABLE_LOCAL_DEMO_CONTROLS=true`, loopback istemci ve host, sentetik öğrenci ve `DEMO_TEST` uygunluğu gerektirir. Ağ/üretim ortamında bu bayrağı **false** yapın. Normal öğrenci kabul ve rol yetkileri değiştirilmedi. `/demo` eski teknik konsoldur. Aynı tarayıcı sekmeleri oturum çerezini paylaşır; bağımsız kullanıcı testi için ayrı tarayıcı profili kullanın.

## Google Maps kurulumu

API anahtarı yokken gerçek rota veya tahmin üretilmez. Temsili çizim Google rotası olarak gösterilmez.

1. Google Cloud projesinde faturalandırmayı ve **Routes API** ile **Maps JavaScript API** hizmetlerini açın.
2. İki ayrı anahtar oluşturun. Sunucu anahtarını Routes API ile ve barındırma düzeninize uygun sunucu kısıtlarıyla sınırlandırın. Tarayıcı anahtarını Maps JavaScript API ve izin verilen HTTP referrer adresleriyle sınırlandırın. Yerel geliştirme adresleri `http://127.0.0.1:5173/*` ve `http://localhost:5173/*` olur; üretimde yalnız kendi HTTPS alan adınızı kullanın.
3. Proje kökündeki, Git dışında tutulan `.env` dosyasında şu alanları doldurun:

```dotenv
KOVAN_GOOGLE_MAPS_API_KEY=SUNUCU_ROUTES_ANAHTARI
KOVAN_GOOGLE_MAPS_BROWSER_KEY=KISITLANMIS_TARAYICI_ANAHTARI
```

4. Sunucuyu yeniden başlatıp sayfayı yenileyin. **Demo kontrolü → Servis kurulumu** içinden buluşma ve yurt girişlerinin doğru koordinatlarını teyit ederek kaydedin. İsim araması otomatik fiziksel doğrulama sayılmaz; bilinmeyen koordinatlar doldurulmaz. Teyit kayıtları yerel veritabanındadır ve demo resetinde korunur.
5. Yolculuk özetindeki **Rotayı önizle** ile Google yürüyüş rotasını ve tahmini süreyi getirin. Süre kullanıcı tarafından değiştirilebilir. Google yürüyüş tahmini trafik veya tehdit değerlendirmesi değildir.

Sunucu `computeRoutes` çağrısını `travelMode=WALK` ve dar alan maskesiyle yapar. Sonuçlar süreç belleğinde en çok beş dakika tutulur; kullanıcı başına en fazla 10 yeni sorgu/dakika kabul edilir. Aynı nokta çifti için sonuç geçici olarak paylaşılır; yürüyüşte kullanılacak önizleme kimliği kullanıcıya ve noktalara bağlıdır. Beş dakika geçerse veya noktalar değişirse önizlemeyi yenileyin. Google önizlemesiyle başlayan yürüyüş, gösterilen rota sonucunun kopyasını saklar. Önizleme kullanılmazsa mevcut sentetik rota korunur.

Haritada Google’ın yürüyüş rotalarının beta olduğu ve kaldırım/yaya yolunun eksik olabileceği uyarısı ile API’nin ek uyarıları gösterilir. Gerçek hesapla canlı API doğrulaması, anahtarlar eklenince yapılmalıdır.

Kaynaklar: [Routes API isteği](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes), [yürüyüş uyarısı](https://developers.google.com/maps/documentation/routes/route-opt), [tarayıcı anahtarı](https://developers.google.com/maps/documentation/javascript/get-api-key), [harita yükleme](https://developers.google.com/maps/documentation/javascript/load-maps-js-api).

## Acil durum kişisi ve konum

**Kişisel destek → Kişi ekle** ile ad ve ülke koduyla WhatsApp numarası kaydedilir. Kişinin bu kullanımdan haberdar olduğu teyit edilir. Bildirim ve konum tercihleri ayrı seçilir. Kişi yalnız kendi öğrenci oturumunda görünür; genel öğrenci/operatör durumuna telefon listesi eklenmez. Bildirim kayıtlarında telefon maskelenir.

Yürüyüşte yardım, operatör talebiyle aynı işlemde bildirim kuyruğuna girer. Kampüs dışındaki **Kişime yardım bildir** yürüyüş veya grup gerektirmez; kişisel yardım kaydı oluşturur, kampüs görevlisi ataması veya resmî acil servis çağrısı sayılmaz. **Güvendeyim, talebi kapat** bu kişisel kaydı kapatır. Gönderilmiş mesaj geri çekilmez; henüz sırada olan ilk bildirim iptal edilir.

Konum tercihi açıksa, yardım anında cihazdan tek seferlik güncel koordinat istenir. Sürekli veya arka planda takip başlatılmaz. Koordinat, doğruluk ve çekim zamanı birlikte kaydedilir. İzin reddi, zaman aşımı veya eski konum, yardım talebini engellemez; bildirim açıkça konumsuz hazırlanır. İki dakikadan eski veya gelecek zamanlı konum güncel diye iletilmez. Cihazın bildirdiği konum, kimlik veya fiziksel güvenlik doğrulaması değildir. Telefonla/uzaktan kullanımda cihaz konumu için HTTPS gerekir; localhost geliştirmesi ayrı tutulur.

## WhatsApp Business Cloud API

Kişisel WhatsApp hesabında oturum açıp arka planda mesaj gönderme kullanılmaz. Bir WhatsApp Business hesabı, gönderen telefon numarası kimliği, erişim belirteci ve onaylı şablon gerekir. İlk bağlantıyı Meta’nın test göndereni ve izin verilen test alıcılarıyla doğrulayın. Başlatılan bildirimler, alıcının son mesajını varsaymadan onaylı şablonla gönderilir.

Yerel `.env`:

```dotenv
KOVAN_NOTIFICATION_MODE=DEMO
KOVAN_WHATSAPP_TOKEN=
KOVAN_WHATSAPP_PHONE_NUMBER_ID=
KOVAN_WHATSAPP_API_VERSION=
KOVAN_WHATSAPP_TEMPLATE_NAME=
KOVAN_WHATSAPP_TEMPLATE_LANGUAGE=tr
KOVAN_WHATSAPP_APP_SECRET=
KOVAN_WHATSAPP_VERIFY_TOKEN=
```

API sürümünü Meta uygulama panelinizde desteklenen sürümün `vNN.0` biçimiyle doldurun; sürüm bilinçli olarak otomatik seçilmez. TOKEN ve APP_SECRET sunucuda kalır. Hiçbir gizli değeri frontend değişkenine veya GitHub’a yazmayın.

Onaylatılacak Türkçe şablonun gövdesinde tam **dört sıralı metin değişkeni** kullanın. Örnek:

```text
Kovan kişisel yardım bildirimi
Öğrenci: {{1}}
Yardım notu: {{2}}
Konum bilgisi: {{3}}
Talep zamanı: {{4}}
Bu bildirim bir acil servis veya görevli varış teyidi değildir.
```

Üçüncü değişken konum alınamadı açıklamasını veya Google Maps koordinat bağlantısını, doğruluğu ve konum zamanını içerir. Şablon adını ve onaylı dilini `.env` ile eşleştirin. Meta şablon onayını uygulama kendisi vermez.

Gerçek gönderim hazır olunca `KOVAN_NOTIFICATION_MODE=WHATSAPP` yapıp yeniden başlatın. Eksik servis ayarlarında **NOT_CONFIGURED** gösterilir; gönderildi veya teslim edildi denmez. DEMO olarak oluşturulmuş bir bildirim daha sonra anahtar ekleyince kendiliğinden gerçek gönderime dönüşmez.

### Teslim durumlarını bağlama

Meta webhook adresini erişilebilir HTTPS sunucunuzda `/api/webhooks/whatsapp` olarak yapılandırın. Yerel localhost adresine Meta doğrudan ulaşamaz. GET doğrulamasında VERIFY_TOKEN ve challenge; POST'ta ham gövde üzerindeki `X-Hub-Signature-256` HMAC doğrulaması kullanılır. İmzasız bildirimler kabul edilmez.

Durumlar: kuyruk → gönderim → sağlayıcı kabulü → gönderildi → teslim edildi → okundu. **Sağlayıcı kabulü teslim kanıtı değildir.** Ağ sonucu belirsizse **DELIVERY_UNKNOWN** gösterilir; çift mesaj oluşturmamak için otomatik tekrar gönderilmez. Tekrar kullanıcı/operatör kararıyla yeni talep olarak yapılabilir. Sunucu kapanırken sonucu bilinmeyen gönderim yeniden başlatılınca da otomatik tekrarlanmaz. Bildirim servisinin teslimi resmî güvenlik veya kişinin müdahalesi anlamına gelmez.

Kaynak: [Meta’nın Python şablon gönderimi örneği](https://github.com/fbsamples/whatsapp-api-examples/blob/main/send-messages-flight-app-python/message_helper.py), [Meta webhook örneği](https://github.com/fbsamples/whatsapp-api-examples/blob/main/template-for-ecommerce-js/routes/incomingWebhook.js).

## Doğrulama

Backend testleri Google ve WhatsApp çağrılarını sahte HTTP taşıyıcısıyla kontrol eder; gerçek mesaj veya ücretli rota sorgusu göndermez. Tarayıcı provasında ayrı sentetik öğrenci oturumu, 10 saat sonrası, demo arkadaşları, şimdiye alma, yürüyüş, kişisel bildirim kutusu ve operatör/görevli zinciri test edilir. Canlı Google hesabı ve WhatsApp test alıcısıyla doğrulama, servis bilgileri girildikten sonra ayrıca yapılır.
