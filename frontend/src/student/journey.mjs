export const PILOT_CATALOG = {
  meeting_points: [
    { id: 'meet_library', name: 'SAÜ Kütüphanesi' },
    { id: 'meet_adibahce', name: 'Kampüs Adıbahçe' },
    { id: 'meet_campus_gate', name: 'Kampüs girişi' },
    { id: 'meet_final_stop', name: 'Son durak' },
  ],
  dormitories: [
    { id: 'dorm_sabahattin_zaim', name: 'Sabahattin Zaim Öğrenci Yurdu' },
    { id: 'dorm_rahime_sultan', name: 'Rahime Sultan Öğrenci Yurdu' },
    { id: 'dorm_ayse_humeyra_okten', name: 'Ayşe Hümeyra Ökten Öğrenci Yurdu' },
    { id: 'dorm_esentepe', name: 'Esentepe Kız Öğrenci Yurdu' },
  ],
};

function lastWhere(items, predicate) {
  for (let index = items.length - 1; index >= 0; index -= 1) if (predicate(items[index])) return items[index];
  return null;
}

export function selectJourney(snapshot = {}, now = Date.now()) {
  const uid = snapshot.user?.id;
  const ownWalks = (snapshot.walks ?? []).filter((walk) => walk.owner_id === uid);
  const walk = lastWhere(ownWalks, (item) => item.status === 'WALKING');
  const completed = lastWhere(ownWalks, (item) => item.status === 'COMPLETED');
  const finishedPods = new Set(ownWalks.filter((item) => item.status === 'COMPLETED').map((item) => item.pod_id));
  const pod = lastWhere(snapshot.pods ?? [], (item) => item.member_ids.includes(uid)
    && ['PROPOSED', 'ACCEPTED', 'WALKING'].includes(item.status) && !finishedPods.has(item.id)
    && (!item.latest_departure_at || new Date(item.latest_departure_at).getTime() >= now || walk?.pod_id === item.id));
  const intent = lastWhere(snapshot.intents ?? [], (item) => item.owner_id === uid
    && ['WAITING', 'PROPOSED', 'WALKING'].includes(item.status)
    && (item.status !== 'PROPOSED' || new Date(item.latest_at).getTime() > now));
  const latestIntent = lastWhere(snapshot.intents ?? [], (item) => item.owner_id === uid);
  const assistance = lastWhere(snapshot.assistances ?? [], (item) => item.walk_id === (walk?.id ?? completed?.id));
  return { walk, completed, pod, intent, assistance,
    expired: Boolean(intent && new Date(intent.latest_at).getTime() <= now),
    stage: walk ? 'walking' : pod ? 'group' : intent?.status === 'WAITING' ? 'waiting'
      : completed && (!latestIntent || latestIntent.status === 'COMPLETED') ? 'complete' : 'plan',
  };
}

export function localDateTime(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function createDeparturePlan({ meetingId, dormId, delay = 0, departureAt }, now = Date.now()) {
  const requested = departureAt ? new Date(departureAt).getTime() : now + Number(delay) * 60_000;
  if (!Number.isFinite(requested) || requested < now - 60_000 || requested > now + 24 * 60 * 60_000) {
    throw Object.assign(new Error(), { code: 'INVALID_DEPARTURE_TIME' });
  }
  const earliest = Math.max(now, requested);
  return { meeting_point_id: meetingId, destination_dorm_id: dormId,
    earliest_at: new Date(earliest).toISOString(), latest_at: new Date(earliest + 10 * 60_000).toISOString() };
}

export function membershipAllowed(user, now = Date.now()) {
  return user?.role === 'student' && user.membership?.status === 'APPROVED_PILOT'
    && new Date(user.membership.expires_at).getTime() > now;
}

export function friendlyError(error) {
  const messages = {
    INVALID_DEPARTURE_TIME: 'Önümüzdeki 24 saat içinde geçerli bir çıkış tarihi ve saati seç.',
    LOCAL_DEMO_DISABLED: 'Bu kontrol yalnızca etkin yerel demoda kullanılabilir.',
    PLAN_REQUIRED: 'Önce buluşma noktası, yurt ve çıkış saatiyle bir plan oluştur.',
    DEMO_ACCOUNTS_BUSY: 'Boş demo hesabı kalmadı; önce açık demo yürüyüşlerini tamamla.',
    MAPS_NOT_CONFIGURED: 'Google Maps anahtarları henüz eklenmedi. Demo kontrolündeki kurulum adımlarını kullan.',
    MAP_POINTS_REQUIRED: 'Buluşma noktası ve yurt girişinin harita koordinatlarını demo kontrolünden teyit et.',
    MAPS_UNAVAILABLE: 'Google rota yanıtı alınamadı. Anahtar ve nokta ayarlarını kontrol et.',
    MAPS_RATE_LIMIT: 'Rota sorgu sınırına ulaşıldı. Bir dakika sonra yeniden dene.',
    MAPS_PREVIEW_EXPIRED: 'Rota önizlemesi eskidi veya plan değişti. Önizlemeyi yenileyip tekrar başlat.',
    CONTACT_CONSENT_REQUIRED: 'Bildirim alacak kişinin bu kullanımdan haberdar olduğunu teyit et.',
    VALIDATION_ERROR: 'Alanları kontrol et. Telefonu ülke koduyla, örneğin +90 ile başlayan biçimde gir.',
    POINT_CONFIRMATION_REQUIRED: 'Seçtiğin koordinatın doğru giriş noktası olduğunu teyit et.',
    EMERGENCY_RATE_LIMIT: 'Mevcut yardım talebini takip et. Çok sık yeni talep oluşturuldu.',
    LOGIN_REQUIRED: 'Devam etmek için giriş yap.', SESSION_EXPIRED: 'Oturumun sona erdi. Yeniden giriş yapabilirsin.',
    INVALID_ACCESS_CODE: 'Erişim kodu tanınmadı. Öğrenci kodunu kontrol edip yeniden dene.',
    LOGIN_RATE_LIMIT: 'Çok fazla giriş denemesi yapıldı. Bir dakika sonra tekrar dene.',
    STUDENT_ACCOUNT_REQUIRED: 'Bu kod öğrenci hesabına ait değil. Öğrenci erişim kodunu kullan.',
    MEMBERSHIP_NOT_APPROVED: 'Üyeliğin henüz kullanıma açık değil. Uygunluk incelemesinin tamamlanması gerekiyor.',
    MEMBERSHIP_EXPIRED: 'Pilot üyelik onayının süresi dolmuş. Onayının yenilenmesi gerekiyor.',
    VERSION_CONFLICT: 'Grubunun durumu değişti. Son durumu getirdik; işlemini yeniden deneyebilirsin.',
    NO_ROUTE: 'Seçtiğin noktalar arasında şu anda yürüyüş planlanamıyor. Başka bir buluşma noktası deneyebilirsin.',
    GROUP_NOT_ACCEPTED: 'Yürüyüş başlamadan önce herkesin grubu kabul etmesi gerekiyor.',
    OUTSIDE_DEPARTURE_WINDOW: 'Grubun çıkış saatinde yürüyüşü başlatabilirsin. Süre dolduysa yeni plan oluştur.',
    ACTIVE_INTENT_EXISTS: 'Zaten açık bir planın var. Güncel planını ekrana getirdik.',
    INVALID_TRANSITION: 'Bu adım artık kullanılamıyor. Güncel yolculuk durumunu kontrol et.',
    FORBIDDEN: 'Bu işlem için uygun bir öğrenci oturumu gerekiyor.',
    NETWORK_ERROR: 'Bağlantı kurulamadı. İşlemin sonucunu doğrulamak için yeniden bağlanıp güncel durumu kontrol et.',
  };
  return messages[error.code] ?? 'İşlem tamamlanamadı. Güncel durumu kontrol edip tekrar dene.';
}

export const HELP_STATES = {
  CREATED: ['Talebin alındı', 'Demo operatörünün talebini görmesi bekleniyor. Henüz görevli kabulü yok.'],
  OPERATOR_ACKED: ['Operatör talebini gördü', 'Demo operatörü talebini değerlendiriyor. Henüz görevli atanmadı.'],
  ASSIGNED: ['Görevli atandı', 'Atanan demo görevlisinin kabulü bekleniyor.'],
  GUARD_ACCEPTED: ['Görevli talebini kabul etti', 'Demo görevlisi henüz varış bildirmedi.'],
  ARRIVED: ['Görevli varış bildirdi', 'Bu, görevlinin demo ekranında verdiği varış bildirimidir.'],
  RESOLVED: ['Destek talebin kapatıldı', 'Demo operatörü destek sürecini tamamladı.'],
};
