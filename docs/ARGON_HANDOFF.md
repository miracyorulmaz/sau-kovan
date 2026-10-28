# Argon — çalışan backend teslimi

Bu belge uygulanmış durumu anlatır. Önceki taslak endpoint'leri varsaymayın; `contracts/openapi.json` kaynaktır.

## Sabit pilot

Başlangıç kimlikleri:
- meet_library
- meet_adibahce
- meet_campus_gate
- meet_final_stop

Varış kimlikleri:
- dorm_sabahattin_zaim
- dorm_rahime_sultan
- dorm_ayse_humeyra_okten
- dorm_esentepe

Başka başlangıç veya varış API'de 422 döner. Sekiz Google Maps pini kaynaklarıyla hazırdır; `/api/maps/preview` gerçek yürüyüş rotası ve süre döndürür. Ayrıntılar: [MAP_POINTS.md](MAP_POINTS.md). `entrance_coordinates: null` ve `physical_route_verified: false` fiziksel saha kontrolünün yapılmadığını belirtir. Teknik konsolun rota ve aydınlatma ağı sentetiktir; etiketini koruyun. Eski `meet_cinaralti` / `meet_campus_market` yeni planlarda kabul edilmez; başlamamış eski planlar açılışta `CATALOG_CHANGED` nedeniyle kapatılır. Aktif yürüyüş ve geçmiş rota kopyaları korunur.

## Oturum ve başlangıç

1. Yerel, paylaşılmayan `.local/demo-access.json` dosyasındaki ilgili kodla `POST /api/auth/demo-session`, gövde `{access_code}`.
2. Cookie tarayıcıda saklanır. GET /api/bootstrap: kullanıcı + katalog + örnek bağlantılar.
3. GET /api/state: yalnızca o role izin verilen durum. WS /api/events: aynı scope'ta `state.snapshot` mesajları.
4. WebSocket koparsa GET /api/state ile yenileyin. Global `revision` yayın sırası, `version` ise varlığın işlem sürümüdür.
5. Yanıt zarfı `{revision, server_time, run_id, environment: "demo", data}`; hata `{code, message, details}`.

Mevcut hesaplar: student-01…student-60 (DEMO_TEST onaylı), student-pending (onay bekliyor), reviewer, operator, guard-01, guard-02, presenter. Erişim kodları kaynak kodunda veya JSON sözleşmesinde yoktur.

## Demo sırası

- Presenter hesabında POST /api/demo/reset `{student_count: 3}`. Bu, üç sentetik çıkış niyeti kurar; bir reset tüm sentetik sahneyi yeniler.
- student-01 hesabında POST /api/matches/preview. Sonuçta `data.pod`, `member_ids`, `version`, `accepted_member_ids` bulunur. Uygun grup yoksa pod null ve gerekçe döner.
- Her üye kendi hesabıyla POST /api/pods/{id}/accept `{expected_version}`. Her kabulden sonra güncel version kullanılmalı. Reddetme /decline ile yapılır.
- Öğrencinin pod yanıtlarında `members: [{id, masked_name}]` bulunur. Adlar sunucuda ilk harf + yıldızlar biçiminde üretilir; tam akran adları gönderilmez. Bu alan `/api/state`, `/api/matches/preview`, kabul/red ve WebSocket yanıtlarında aynıdır. `member_ids` ve `accepted_member_ids` mevcut görevlerini korur. Grup dışındaki öğrencilere üyeler açılmaz.
- Tüm kabuller tamamlanınca her öğrenci POST /api/walks/start `{pod_id, arrival_check_enabled, estimated_duration_seconds}` verir. Süre 60–7200 saniye, varsayılan 900. Yerel varış ek süresi 60 saniyedir.
- Öğrenci POST /api/assistances `{walk_id, reason: "HELP_REQUEST", idempotency_key}` ile destek ister. Aynı anahtar aynı talebi tekrar üretmez.
- Operatör /operator-ack, ardından /assign `{expected_version, unit_id}` çağırır.
- Operatör /assign çağrısıyla saha birimini doğrudan sevk eder (ASSIGNED). Atanmış görevli yalnızca /arrive ile varış bildirir; kabul adımı yoktur.
- Operatör /resolve `{expected_version, resolution: "DEMO_COMPLETED"}` çağırır.
- Öğrenci /api/walks/{id}/complete `{expected_version}` ile varışını teyit eder.

Görev durumları: CREATED → OPERATOR_ACKED → ASSIGNED → ARRIVED → RESOLVED.
Gecikme: escalation_state = NONE / OPERATOR_OVERDUE / GUARD_OVERDUE. GUARD_OVERDUE sevkten sonra varış bildiriminin gecikmesidir; görev kabulü beklenmez. Bu alan yardım ulaştığı anlamına gelmez. Geç varış bildirilebilir; başarılı geçişte güncel gecikme işareti temizlenir. Eski altı durumlu sürümde kabul edilmiş açık kayıtlar, geçmişleri korunarak ASSIGNED durumuna taşınır.

Sade ekranlar `/operator` ve `/guard` yollarındadır. Mevcut `/api/bootstrap`, `/api/state`, rol filtreli WebSocket ve görev komutlarını kullanır. Personel durum yanıtlarındaki yardım kayıtları `student_name` alanında sansürlü öğrenci adını taşır. Guard yalnız atanmış görevleri ve bunların yürüyüş bağlamını alır; dispatcher birim uygunluğunu da alır. Ekranlar rol uyuşmazlığında görevleri göstermez. Tarayıcıda görünen role ek olarak sunucunun yetki kontrolleri geçerlidir.

## Yeni öğrenci başvurusu gösterimi

Gerçek üyelik kaydı henüz yok. student-pending hesabı sentetik başvuru ekranıdır. Reviewer hesabıyla POST /api/memberships/student-pending/review:

```json
{
  "expected_version": 1,
  "decision": "APPROVED_PILOT",
  "method": "DEMO_TEST",
  "student_eligibility_checked": true,
  "women_student_eligibility_checked": true,
  "verified_dorm_id": "dorm_esentepe"
}
```

Onaylı kullanıcıları “SAÜ tarafından doğrulandı” diye göstermeyin; “Demo uygunluk onayı” yazın. Gerçek onay yöntemi kararlaştırılmadı.

## Rota deneyi

GET /api/routes?meeting_point_id=meet_library&destination_dorm_id=dorm_esentepe

İki sonuç: shortest ve lighting_first. edge_ids, distance_m, weighted_cost ve açık SYNTHETIC_SCHEMATIC etiketi gelir. Geometry yoktur. Soyut topoloji veya kart karşılaştırması çizilebilir; gerçek kampüs haritasına hayalî koordinat oturtmayın.

Presenter POST /api/demo/edges/{edge_id} `{closed: true}` ile yeni rota önerilerini etkiler. Aktif yürüyüşün kaydedilmiş rotası değişmez. Yeni /api/routes isteği güncel ağı hesaplar. Geçerli rota yoksa NO_ROUTE 409.

## Arayüzün henüz bağlanmaması gereken özellikler

Gerçek GPS, sapma değerlendirmesi, belge yükleme, e-posta doğrulama, genel incident transition ve çıkış tahmini endpoint'leri yok. Bu sürümde buton eklenip çalışıyormuş gibi gösterilmesin.

Frontend klasörü oluşturulmadı; Argon tarafı sahiplenebilir. Başlangıçta backend origin'ine /api ve ws proxy kurun. Origin listesine gerçek geliştirme origin'ini ekleyin; kontrolü '*' yapmayın.
