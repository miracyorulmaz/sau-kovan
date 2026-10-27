# İlk backend doğrulaması

27 Ekim 2026 — dört kız yurtlu, sentetik Kovan backend'i.

## Sonuç

- 29 otomatik test geçti; hata yok.
- Bir HTTPX/Starlette deprecation uyarısı var; test akışını etkilemedi. Bağımlılıklar requirements-lock.txt içinde kilitli.
- Ayrı çalışan Uvicorn sunucusunda gerçek HTTP istekleriyle üç öğrenci, operatör ve görevli akışı tamamlandı.
- OpenAPI sözleşmesi uygulamadan üretildi.

## Önemli kontroller

- Yalnızca dört seçili kız yurdu ve dört başlangıç noktası; serbest koordinat/liste dışı konum reddi.
- Onaysız ve süresi dolmuş üyeye yeni yürüyüş yasağı; öğrencinin kendini onaylamasının engellenmesi.
- Yetkili rolün iki uygunluk kontrolüyle yalnızca sentetik DEMO_TEST onayı vermesi.
- Ortak zaman aralığı, 3–5 kişi sınırı, mükerrer üye olmaması ve tüm üyelerin kabulü.
- Reddetme ve süresi dolmuş, başlamamış grubun serbest bırakılması.
- Yol kapatma ile gerçek hesaplama sonucunun değişmesi; kopuk ağda NO_ROUTE.
- Aktif yürüyüşün kaydedilmiş rotasının demo kontrolüyle değişmemesi.
- Operatör ve görevli kabulünün ayrılması; başka görevlinin işleminin engellenmesi.
- Aynı görevliye eşzamanlı iki iş atanmaması; varlık sürümü kontrolü.
- Yardım isteği tekrarlarının tek kayıt üretmesi; farklı içerikle anahtar tekrarının reddi.
- Varış süresi aşımında tek inceleme kaydı; kapalı/tamamlanmış yürüyüşte uyarı olmaması.
- Gecikmenin kabul/ulaşma yerine geçmemesi; geç kabulün mümkün olması.
- Öğrenci ve inceleyici veri kapsamlarının ayrılması; WebSocket'te oturum kontrolü.
- Güvenilmeyen Origin'in reddi, çıkışta sunucu oturumunun iptali.
- Yeniden başlatmada SQLite kaydının korunması; hata yanıtında erişim kodunun yansıtılmaması.

## Kapsam dışı

Gerçek öğrenci kabulü, barınma belgesinin gerçek kişiyle eşleştirilmesi, saha yolu/aydınlatma doğruluğu, mobil arka plan/GPS, güvenlik birimi yanıtı ve suç önleme etkinliği doğrulanmadı. Bu bileşenler bu sürümde uygulanmadı. Frontend Argon tarafına ayrılmıştır.

Yerel soket testleri yürütme ortamında yerel bağlantı izniyle çalıştırıldı. İlk geçici klasör ve soket başlatma engelleri çalışma ortamı ayarıyla giderildi.
