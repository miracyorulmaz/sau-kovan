# Kovan — otomasyon isteyen üyelik doğrulaması için karar notu

Güncelleme: 28 Ekim 2026. Kullanıcı yüz yüze onay yöntemini seçmedi; otomasyon istedi ve kimlikle üyeliği seçenek olarak belirtti. Bu not gerçek bir kimlik doğrulama entegrasyonunun tamamlandığını iddia etmez.

## Kesin kalan kapsam

- Öğrenci üyeliği kız öğrencilerle sınırlı.
- Varışlar yalnızca Sabahattin Zaim, Rahime Sultan, Ayşe Hümeyra Ökten ve Esentepe kız yurtları.
- Başlangıçlar tanımlı pilot buluşma noktaları.
- Yurt sakini olmak henüz üyelik şartı olarak seçilmedi. Bu ek kısıt otomasyon için kendiliğinden uygulanmayacak.

## Ayrı doğrulanacak üç husus

1. Kimlik belgesi: geçerlilik ve gerçeklik kontrolü.
2. Başvuru sahibi: belgenin bu kişiye ait olduğunun doğrulanması; kişinin sadece başkasının belgesini yüklemesi yeterli değil.
3. Öğrencilik ve üyelik uygunluğu: kimlik doğrulaması tek başına aktif öğrencilik veya kampüs üyelik şartını ispatlamaz.

OCR yalnızca metin çıkarır. Kimlik numarasının biçimi/kontrol basamağı, belge görselindeki tutarlılık veya “kadınım” kutusu gerçek kimlik/öğrencilik doğrulaması değildir. Ad, görünüş, ses veya selfie üzerinden cinsiyet tahmini yapılmaz.

## Önerilen gerçek hizmet mimarisi

- Hazır kimlik doğrulama sağlayıcısı: belge kontrolü ve başvuru sahibiyle eşleştirme. Desteklenen ülke/belge, sözleşme, hesap, veri işleme ve ücret koşulları seçilmeden belirli bir sağlayıcıya bağlanılmayacak.
- Aktif öğrenci kontrolü: yetkili kurum teyidi veya resmî kanalda doğrulanabilen güncel öğrenci belgesi. Kurumsal e-posta OTP'si hesap sahipliğini gösterir; tek başına aktif öğrencilik kanıtı sayılmaz.
- Üyelik uygunluğu için iki farklı politika mümkün:
  - Yetkili kurumdan uygunluk sonucu almak.
  - Üyelik şartını doğrulanmış resmî kayıttaki kadın bilgisi üzerinden tanımlamak. Bu, kişinin cinsiyet kimliğini otomatik saptamak değildir ve kullanıcı tarafından henüz seçilmemiş politika seçeneğidir. Sağlayıcının yalnızca kullanıcı beyanını değil, kontrol edilmiş belgeden gelen alanı döndürdüğü teyit edilmelidir.
- Doğrulanmış kız yurdu kaydı ayrı, daha dar bir alternatif olarak kalır; bunun seçilmesi yurtta kalmayan öğrencileri dışarıda bırakır.

Kimlik servisi belgenin sahibini doğrulasa bile öğrenci belgesiyle aynı kişiye aitlik ayrıca bağlanmalıdır. Yalnızca isim benzerliğine dayanarak otomatik onay verilmez. Başarısız veya belirsiz sonuçta kayıt PENDING_REVIEW kalır; hata/timeout onaya dönüşmez.

## MVP ve entegrasyon sınırı

- Çalışan backend'deki DEMO_TEST etiketli sentetik onay korunuyor; gerçek belge kabul etmiyor.
- Gerçek sağlayıcı seçilene kadar kimlik/fotoğraf yükleme endpoint'i açılmayacak ve belge toplanmayacak.
- Sağlayıcı hesabı ve yetkili öğrenci doğrulama yolu temin edilirse adaptör eklenecek. Bu temin süreleri için garanti verilmeyecek.
- Hazır bir doğrulama yolu olmadan otomatik OCR ön kontrolü yapılabilir; sonucu “bilgi okundu” olur, “kimlik doğrulandı” olmaz.
- e-Devlet'in kullanıcıya açık belge sorgulama/doğrulama sayfaları, otomatik erişim yetkisi veya entegrasyon sözleşmesi olarak değerlendirilmez. Kimsenin e-Devlet şifresi alınmaz; giriş/CAPTCHA aşılmaz.

## Adaptör için tasarım ilkeleri

- identity_document_check, applicant_binding_check, active_student_check ve eligibility_check ayrı sonuçlar olarak tutulur.
- Sonuçlar: NOT_STARTED / PENDING / VERIFIED / INCONCLUSIVE / FAILED / EXPIRED. Tek bir tümünü kapsayan “AI onayladı” puanı yok.
- Kullanıcı ID'sine bağlı tekil başvuru referansı; imzası ve tekrar kullanımı denetlenen sağlayıcı bildirimi; istemci kendi sonucunu VERIFIED yapamaz.
- Onay, gerekli bütün kontrollerin güncel ve aynı başvuru sahibine bağlı sonucu üzerinden verilir. Gönderilmiş form veya SDK ekranındaki başarı animasyonu onay kaynağı değildir.
- Ham kimlik görüntülerini ve biyometrik verileri Kovan sunucusuna kopyalamak varsayılan tasarım olmaz; sağlayıcı referansı ve ihtiyaç kadar sonuç tutulur. Saklama/işleme koşulları sağlayıcı seçimiyle somutlaştırılmalı.

## Argon'a aktarılacak güncelleme

Kayıt akışında “Kimlik kontrolü” ve “Öğrencilik kontrolü” ayrı adımlar gösterilsin. Gerçek entegrasyon bulunmuyorsa “demo/test” etiketi korunsun. Kayıt sonucu belirsizken kız öğrenci uygunluğu doğrulanmış rozeti verilmesin. Yurt sakini olma ve yüz yüze kabul varsayılmasın.

## İncelenen birincil kaynaklar

- YÖK öğrenci belgesi: https://www.turkiye.gov.tr/yok-ogrenci-belgesi-sorgulama
- Resmî barkodlu belge doğrulama: https://www.turkiye.gov.tr/belge-dogrulama
- Örnek kimlik servisi belge kontrolü: https://docs.sumsub.com/docs/how-id-verification-works
- Örnek kimlik servisi kişiye bağlama/canlılık kontrolü: https://docs.sumsub.com/docs/user-verification-check-results
- Sağlayıcıya kullanıcı tarafından verilen bilgi ile belgeden çıkarılan bilgi ayrımı: https://docs.sumsub.com/reference/create-applicant
- Belgeden çıkarılan bilgi alanı: https://docs.sumsub.com/reference/change-applicant-information-extracted-by-sumsub

Kaynaklar bir yöntemin teknik karşılığını gösterir; Kovan için sağlayıcı hesabı, Türkiye belgesi kapsamı, ücret veya gerçek öğrenci kontrolü temin edildiği anlamına gelmez.
