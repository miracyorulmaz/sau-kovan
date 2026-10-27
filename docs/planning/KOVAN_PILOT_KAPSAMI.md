# Kovan — daraltılmış pilot kapsamı

Tarih: 27 Ekim 2026.
Bu belge, Miraç'ın son kararlarını önceki Kovan planlarından ayırır. Kullanıcı tarafından kesinleştirilen kurallar ile Codex'in henüz kabul edilmemiş önerileri ayrı gösterilmiştir.

## 1. Kullanıcının kesinleştirdiği kurallar

- Öğrenci üyeliği yalnızca kız öğrencilere açık olacak; beyan tek başına yeterli olmayacak.
- Yolculuk yalnızca önceden tanımlı buluşma noktalarından başlayacak.
- Pilot varışları kampüs içi ve çevresindeki seçili kız yurtlarıyla sınırlı olacak.
- Üyelik onayını hangi makamın vereceği henüz belirlenmedi; bu açık bir ürün kararı.
- Son kullanıcı yanıtı: otomasyon isteniyor; kimlikle üyelik bir seçenek. Yüz yüze kabul seçilmiş yöntem değildir. Güncel seçenekler KOVAN_DOGRULAMA_YAKLASIMI.md dosyasında; mevcut kodda yalnızca DEMO_TEST onayı vardır.

Görevli ve operatör hesapları öğrenci üyeliğinden ayrı kurumsal rollerdir. Öğrenci hesabı kendisini görevli veya onaylayan rolüne yükseltemez.

## 2. Önceki manuel kabul alternatifi — seçilmedi; otomasyon hedefi öne alındı

İlk gerçek pilotu seçilen kız yurtlarında kalan öğrencilerle sınırlandırmak, manuel ve yüz yüze kabul yapmak.

Bu, yalnızca kız öğrenci olma koşuluna ek bir daraltmadır: evde veya başka yurtta kalan kız öğrenciler ilk pilota giremez. Miraç bu ek kısıtı kabul etmeden kesin ürün kuralı yapılmayacak.

Önerilen kontrol:

1. Başvuru sahibi hesabını açar; hesap başvurusu onay bekler.
2. Kendi e-Devlet hesabından güncel GSB Yurtta Barınma Belgesi üretir veya ilgili yurt makamından güncel kayıt teyidi alır. Şifresini uygulamaya veya ekibe vermez.
3. Pilot başvurusunu inceleyen kişi, başvuru sahibinin rızasıyla belgenin barkodunu resmî belge doğrulama kanalında kontrol eder; arşiv kaydı ile mevcut kayıt birbirine karıştırılmaz.
4. Belge sahibi, başvuran kişi ve Kovan hesabı yüz yüze eşleştirilir. Gerekirse güncel öğrenci durumu ayrıca kurum belgesiyle kontrol edilir. Görünüşten, sesten veya fotoğraftan cinsiyet tahmini yapılmaz.
5. Yurt, onaylı kız yurdu listesinde bulunuyorsa pilot uygunluğu kaydedilir. Pilot ekibinin yaptığı kabul, üniversite/GSB tarafından verilmiş resmî onay diye etiketlenmez.
6. Yalnızca başvuru sonucu, kontrol yöntemi, kontrol eden kullanıcı, yurt kimliği, kontrol ve sona erme tarihi tutulur. Ham kimlik, T.C. numarası, e-Devlet şifresi, oda/blok ve barınma belgesi kopyası bu MVP'ye yüklenmez/saklanmaz.
7. Kayıt yenileme/sona erme/iptal için yönetici işlemi bulunur. Kullanıcı kendi onay durumunu değiştiremez.

Bu yöntem “doğrulanmış kız yurdu kaydı ve başvuru sahibiyle hesap eşleştirmesi” düzeyinde uygunluk kanıtı sağlar; cinsiyeti otomatik/yanılmaz biçimde saptayan bir sistem veya hesap paylaşımını tamamen engelleyen bir garanti değildir.

Resmî hizmetler doğrulandı:
- GSB Yurtta Barınma Belgesi Sorgulama: https://www.turkiye.gov.tr/genclik-ve-spor-yurtta-barinma-belgesi-sorgulama
- Barkodlu belge doğrulama: https://www.turkiye.gov.tr/genclik-ve-spor-yurtta-barinma-belgesi-dogrulama

Ürün otomatik e-Devlet entegrasyonu varmış gibi sunulmayacak. Bu kapsamda belgeli kabul operasyonu manuel, uygulamadaki durum takibi ve erişim denetimi yazılımsaldır. Hackathon gösteriminde gerçek öğrenci belgeleri yerine açıkça etiketli test başvuruları kullanılabilir.

## 3. Kullanıcının verdiği varış adayları

| İç kimlik | Kullanıcının adı | Kaynak kontrolü | Pilot kaydı |
|---|---|---|---|
| dorm_sabahattin_zaim | Sabahattin Zaim | GSB listesinde Sabahattin Zaim Öğrenci Yurdu, tipi Kız | İsim/tip eşleşti; kesin giriş koordinatı ve rota kontrolü bekleniyor |
| dorm_rahime_sultan | Rahime Sultan | GSB listesinde Rahime Sultan Öğrenci Yurdu, tipi Kız | İsim/tip eşleşti; kesin giriş koordinatı ve rota kontrolü bekleniyor |
| dorm_ayse_humeyra_okten | Ayşe Hümeyra Ökten | GSB listesinde Ayşe Hümeyra Ökten Öğrenci Yurdu, tipi Kız | İsim/tip eşleşti; kesin giriş koordinatı ve rota kontrolü bekleniyor |
| dorm_esentepe | Esentepe kız KYK | GSB listesinde Esentepe Öğrenci Yurdu, tipi Kız | İsim/tip eşleşti; kesin giriş koordinatı ve rota kontrolü bekleniyor |

GSB kaynak kontrolü, 27 Ekim 2026: https://kygm.gsb.gov.tr/Ajax/gettesis.aspx?il=sakarya

Pilot listesi dört yurttan oluşur. Kullanıcı tarafından seçilmemiş başka yurtlar kendiliğinden listeye eklenmeyecek. Resmî listede bir isim bulunması hizmet anlaşması veya güvenlik desteği var demek değildir. Giriş koordinatları tahmin edilmeyecek.

## 4. Kullanıcının verdiği başlangıç adayları

| İç kimlik | Nokta | Açık ayrıntı |
|---|---|---|
| meet_library | Kampüs içi kütüphane | Hangi kapı/banko, koordinat, saat ve uygun bekleme alanı |
| meet_cinaralti | Çınaraltı | Tam buluşma yeri, koordinat, saat ve görünürlük kontrolü |
| meet_campus_gate | Kampüs girişi | Hangi giriş kapısı olduğu ve buluşma tarafı |
| meet_campus_market | Kampüs market önü | Hangi market, koordinat ve çalışma saatleri |

“vs.” kapsamındaki başka noktalar varsayılmayacak; ayrı yönetici kaydı ve saha teyidi gerekecek. Kullanıcının önerdiği noktalar aday olarak kayıtlıdır; güncel çalışma/aydınlatma koşulları doğrulanmış gibi sunulmayacak.

## 5. Yolculuk sınırlarının uygulanması

- İstekler serbest koordinat yerine meeting_point_id ve destination_dorm_id ile oluşturulur.
- Sunucu, başlangıcın aktif/onaylı buluşma noktası, varışın aktif/onaylı kız yurdu olduğunu kontrol eder. Arayüzde seçeneği gizlemek tek başına yeterli değildir.
- Onayı bekleyen, sona ermiş veya iptal edilmiş üyelik eşleşmeye/yeni yürüyüşe katılamaz. Destek iletişimi ve kişinin mevcut yardım talebine erişimi sırf üyelik işlemi yüzünden kaybolmaz.
- Kapalı nokta, doğrulanmamış yurt veya bilinmeyen ID reddedilir. Yolculuk başlarken durum yeniden kontrol edilir.
- Ev, durak, erkek yurdu, başka ilçe veya haritada rastgele seçilmiş konum bu pilotun varışı olamaz.
- Buluşma, grup üyelerinin açık kabulüyle başlar. GPS'te yakın görünmek tek başına fiziksel katılım veya kimlik ispatı sayılmaz.
- Öğrencinin kayıtlı yurdu varsa arayüz bunu varsayılan hedef yapabilir. Sadece kendi yurduna gitme zorunluluğu kullanıcı tarafından kararlaştırılmadı; diğer seçili yurtlara varışı kendiliğinden yasaklamayacağız.
- Eşleşme, ortak buluşma noktası + uyumlu ayrılış aralığı + aynı yurt/hedef koridoru üzerinden yapılır. Kız öğrenci üyeliği, başka üyelerin güvenilirliği hakkında garanti olarak sunulmaz.

## 6. Geliştirme için asgari değişiklikler

- StudentMembership: user_id, status, verification_method, reviewer_id, reviewed_at, expires_at, verified_dorm_id (varsa).
- Durumlar: PENDING_REVIEW / APPROVED_PILOT / REJECTED / EXPIRED / REVOKED. Bunlar cinsiyet sınıflandırma skorları değildir.
- MeetingPoint: id, public_name, approved_for_pilot, active, opening_hours, coordinates, checked_at.
- Dormitory: id, official_name, known_aliases, dorm_type, official_source, identity_status, route_ready, active, entrance_coordinates.
- Role: eligibility_reviewer yalnızca üyelik değerlendirebilir; öğrenci konumlarını topluca göremez. dispatcher/guard yetkileri ayrıca verilir.
- Başvuru ve onay işlemleri rol kontrollü ve kayıtlıdır. Aynı kişinin yeniden başvurması önceki ret/onay geçmişini gizlemez; başka üyelerin belgesi veya yurdu herkese gösterilmez.
- Demo uygunluk onayı ile gerçek pilot belge kontrolü ayrı etiketlidir. Gerçek kişi için otomatik “onaylandı” demo düğmesi yoktur.

## 7. Argon için ekran değişiklikleri

1. Kayıt ekranı: kız öğrenci pilotunun kapsamı; başvuru/onay durumu. Tek bir “kadınım” kutusu üyeliği açmaz.
2. Onay bekleme ekranı: gerekli kontrol yöntemi henüz kararlaştırılmadıysa bunu açıkça gösterir. Yüz yüze kabul önerisi kabul edilirse işlem adımları gösterilir.
3. Başlangıç ekranı: yalnızca aktif pilot buluşma noktaları.
4. Varış ekranı: yalnızca dört aktif pilot kız yurdu.
5. Buluşma ekranı: adlandırılmış nokta, zaman, katılanların açık kabulü; üye hesaplarının uygunluk durumu ile güvenilirlik puanı birbirine karıştırılmaz.
6. Ayrı, yetkili inceleme ekranı: başvuru sonucu ve kontrol kaydı. Belge yükleme/saklama veya görüntüden cinsiyet sınıflandırma eklenmez.

## 8. Açık kararlar

- İlk pilotun seçili kız yurtlarında kalan öğrencilerle sınırlandırılması önerisi kabul edilecek mi? Alternatif, üniversite/yurt makamının doğrudan uygunluk teyidi; böyle bir erişim henüz yok.
- Yüz yüze kabulü kim, nerede ve hangi saatlerde yapacak? Pilot ekibinin incelemesi ile kurumun resmî onayı birbirinden ayrılmalı.
- Dört başlangıç noktasının kesin yerleri ve kullanılabilir saatleri.

Üyelik kontrolünün bu operasyonel ayağı seçilmeden, gerçek kullanıcılar için kesin doğrulama yapılıyormuş gibi hizmet başlatılmayacak. Ayrı etiketli sentetik hesaplarla prototip akışı geliştirilebilir.
