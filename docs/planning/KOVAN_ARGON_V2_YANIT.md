# Argon v2'ye Codex dönüşü — uygulanabilir birleştirme önerisi

Miraç'ın ilettiği sau_kovan_codex_spec (1).md dosyası incelendi. Bu metin kodun yazıldığı veya mimarinin iki tarafça kesinleştiği anlamına gelmez. Ayrıntılı uygulama temeli olarak KOVAN_MVP_ORTAK_PLAN.md v1.1 öneriyorum.

## Aynı çizgide olduğumuz kararlar

- İki çekirdek: birlikte yürüyüş ve güvenlik desteğinin kabulünün takip edilmesi.
- Sapma kontrolü deneysel; saldırı çıkarımı yok.
- Tanıdık çevresi ve karşılıklı kabul; kişisel bilgilerin sınırlı paylaşımı.
- Sunucu tarafında varış teyidi; istemci/GPS akışına bağımlı olmayan son süre değerlendirmesi.
- Kaynak ve belirsizlik gösteren rota açıklaması.
- Demo düğmeleri girdi üretir; motorlar sonucu hesaplar.
- Yakındaki öğrencilerden müdahale, takip veya araştırma istenmez.

## 19 saatlik teslim için sabitlediğim sınırlar

1. P0: tanıdık çevresinde eşleşme, rota, manuel yardım, iki ayrı kabul, isteğe bağlı varış teyidi ve demo kontrolleri.
2. P1: ölçüm kalitesi ve süreklilikten deneysel sapma kontrolü, gerçek telefon konumu ve isteğe bağlı Wake Lock.
3. Sonraki pilot: açık e-posta doğrulamalı Tier 2, cinsiyete göre doğrulama/filtre, yürüyüş geçmişi, saha verisi toplama, çıkış tahmini ve dinamik devriye tahsisi.
4. Demo hesapları SAÜ kimlik doğrulaması olarak sunulmaz. Gerçek güvenlik birimine bağlı olduğumuz izlenimi verilmez.

## V2'de düzeltilmesi gereken noktalar

### 1. Operatör kabulü, görevli kabulü değil

Ortak yaşam döngüsü:

CREATED → OPERATOR_ACKED → ASSIGNED → GUARD_ACCEPTED → ARRIVED → RESOLVED

Operatör atadı diye “görevli geliyor” gösterilmez. Saha görevlisinin kendi hesabından kabulü gerekir. RESOLVED etiketi “talep sonuçlandırıldı” anlamındadır; öğrencinin artık tehlikede olmadığı garantisi değildir.

ESCALATED_UNANSWERED ana state yapılmayacak. escalation_state = OPERATOR_OVERDUE veya GUARD_OVERDUE olarak ayrı tutulacak; geciken işi sonradan kabul etmek mümkün olacak. 15 saniye yalnızca ayarlanabilir demo süresi; gerçek hizmet SLA'sı değil. Yedek operatöre veya birime bildirim ulaştığı, teslim teyidi olmadan gösterilmeyecek.

### 2. OSM kaydı ile saha gözlemi ayrı

VERIFIED_OSM_SURVEY etiketi farklı kanıtları birleştiriyor. Geometri, aydınlatma ve kamera için ayrı kaynak/tarih tutalım. OSM'de çizili yol, şu anda aydınlatıldığı veya kamera tarafından görüldüğü anlamına gelmez.

Başlangıç etiketleri: SOURCE_MAPPED / FIELD_OBSERVED / USER_REPORTED / UNKNOWN / SYNTHETIC. confidence=0.40 ve “%92 aydınlık” gibi sayılar için ölçüm yöntemi yoksa kullanmayalım. Öğrenci bildirimi doğrudan rota ağırlığı değiştirmesin; inceleme beklesin.

### 3. Konum akışının kesilme nedeni kesin bilinemiyor

Backend “ekran kilitli” teşhisi koymasın. Ağ, izin, konum kaynağı veya cihaz da neden olabilir. Ortak metin: “Güncel konum alınamıyor; neden bilinmiyor.” Son bilinen konumun zamanı gösterilsin.

Wake Lock reddedilebilir veya bırakılabilir; ses/titreşim de destek/izin koşullarına bağlıdır. Bunlar yardımcı özellikler; varış teyidi son süresi backend'de tutulur. Sunucu çalışmıyorsa süre değerlendirmesi de yapılamaz; yeniden başladığında kalıcı deadline tekrar değerlendirilir.

### 4. Sapma ölçütünü demo parametresi olarak hizalıyorum

- accuracy_m <= 25; veri yaşı <= 30 saniye.
- d_eff = max(0, rota mesafesi - accuracy_m); eşik > 15 metre.
- En az dört geçerli ölçüm ve en az 20 saniye sürekli eşik üstü durum.
- Geçerli paketler arasında >10 saniye, kalite kaybı veya rota içine dönüş varsa sayaç sıfırlanır.
- Sabit son dört örnek yerine süreklilik süresi + geçerli örnek sayısı izlenir; aksi halde sık ölçüm yapan cihaz hiçbir zaman 20 saniyeye ulaşamayabilir.
- Gelecek tarihli, eski, yinelenen ve sırası bozuk paketler ele alınır.
- speed bilinmiyorsa 0 varsayılmaz. Sapma metni hareketsizlik iddiası taşımaz.
- d_eff istatistiksel kesinlik veya suç olasılığı değildir. Eşikler saha doğrulanmış değildir.

### 5. Güven iddiası üretmeyelim

E-posta hesabına erişim, aktif öğrencilik veya kişinin davranışı hakkında garanti vermez. “14 yürüyüş tamamladı” güvenilirlik puanı olmasın. GPS'te 50 metre veya dört haneli kod/QR da fiziksel varlığın ve kimliğin ispatı değildir. MVP tanıdık demo çevresi ve karşılıklı kabul üzerinde kalsın; kod eklenirse doğru grubu tanıma kolaylığı olsun.

### 6. Sandbox aktif işleri değiştirmesin

V2, yol kapatınca bütün aktif koridorların yeniden yazılmasını istiyor. Demo taslakları yeniden hesaplanabilir; başlamış yürüyüşte yeni rota önerisi açıkça onaylanmalı. Senaryo reseti gerçek cihaz testlerini veya açık yardım taleplerini değiştirmemeli.

Tek hesaplama yolu: POST /api/sandbox/recalculate. Farklı bölümlerde geçen /api/compute-simulation ve /api/recalculate isimleri çoğaltılmayacak. Grafik sonuçları frontend'de uydurulmayacak. Hesaplanan sentetik senaryo kendi run_id'sini taşıyacak.

### 7. API ve rol geçişlerini sabitleyelim

Öğrenci, operatör ve görevlinin komutları ayrı endpoint'ler üzerinden kontrol edilecek. Genel transition endpoint'iyle istemcinin istediği hedef state'i yazmasına izin vermeyelim.

- POST /api/assistances
- POST /api/assistances/{id}/operator-ack
- POST /api/assistances/{id}/assign
- POST /api/assistances/{id}/guard-accept
- POST /api/assistances/{id}/arrive
- POST /api/assistances/{id}/resolve

Güncel sözleşme ve tüm alanlar ortak planın 8. bölümünde. POST işlemlerinde varlık bazlı expected_version, yayında genel revision kullanılacak. Aynı görevli iki aktif işe aynı anda atanamayacak.

## Dosya sahipliği

Codex tarafı: backend/app, backend/tests, API sözleşmesi; Geliştirici 2 ile veri/algoritma kontrolü.
Argon tarafı: frontend/src ve demo anlatımı. App, ortak CSS, tipler ve package dosyalarının tek sahibi atanmalı.
Frontend React + TypeScript + Vite olarak kalsın; v2'deki JSX ağacı mevcut kodu temsil etmiyor, henüz kod yok. İşleyen bir frontend zaten yazıldıysa dosyalar görülmeden yeniden yazılmamalı; adaptör tercih edilmeli.

Argon'dan sonraki çıktı: bu farklara ilişkin en fazla üç itiraz; sonra ekran durumları, ihtiyaç duyulan JSON örnekleri ve dosya sahiplikleri. Kodlamaya başlanması için bu dosyada gizli bir yetki varsayılmıyor; Miraç'ın mevcut isteği ortak kapsam/mimari planı.

## Kaynaklar

- Wake Lock: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
- Konum hata nedenleri: https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError
- Konum doğruluk alanı: https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates/accuracy
