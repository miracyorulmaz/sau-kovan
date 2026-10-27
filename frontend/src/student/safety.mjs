export const NOTIFICATION_STATES = {
  QUEUED: ['Bildirim sıraya alındı', 'Henüz gönderim sonucu yok.'],
  SENDING: ['Bildirim hazırlanıyor', 'Gönderim sonucu bekleniyor.'],
  SIMULATED: ['Demo bildirimi hazır', 'Gerçek WhatsApp mesajı gönderilmedi.'],
  NO_CONTACT: ['Bildirim gönderilemedi', 'Bildirim için acil durum kişisi ekle.'],
  DISABLED: ['Kişisel bildirim kapalı', 'Kişine bildirim göndermek için bu tercihi aç.'],
  NOT_CONFIGURED: ['WhatsApp bağlantısı hazır değil', 'Servis ayarları tamamlanmadan mesaj gönderilemez.'],
  PROVIDER_ACCEPTED: ['WhatsApp servisi kabul etti', 'Telefonuna teslim edildiği henüz doğrulanmadı.'],
  SENT: ['WhatsApp gönderimi bildirildi', 'Teslim bilgisi bekleniyor.'],
  DELIVERED: ['WhatsApp teslimi doğrulandı', 'Servis mesajın alıcıya teslim edildiğini bildirdi.'],
  READ: ['WhatsApp okunma bilgisi geldi', 'Servis mesajın okunduğunu bildirdi.'],
  FAILED: ['WhatsApp gönderimi başarısız', 'Talebin kayıtlı; mesajın ulaştığını varsayma.'],
  DELIVERY_UNKNOWN: ['Gönderim sonucu doğrulanamadı', 'Tekrar gönderip mükerrer mesaj oluşturmamak için otomatik tekrar yapılmadı.'],
  CANCELLED: ['Bildirim iptal edildi', 'Gönderim öncesinde talep veya kişi tercihi değişti.'],
};

export function captureLocation(geolocation = globalThis.navigator?.geolocation) {
  if (!geolocation) return Promise.resolve({ location: null, location_status: 'UNAVAILABLE' });
  return new Promise((resolve) => {
    let done = false;
    let timer;
    const finish = (value) => { if (!done) { done = true; clearTimeout(timer); resolve(value); } };
    timer = setTimeout(() => finish({ location: null, location_status: 'TIMEOUT' }), 4500);
    try {
      geolocation.getCurrentPosition((position) => finish({ location_status: 'AVAILABLE', location: {
        latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy_m: position.coords.accuracy,
        captured_at: new Date(position.timestamp).toISOString(), source: 'DEVICE',
      } }), (error) => finish({ location: null, location_status: error.code === 1 ? 'DENIED' : error.code === 3 ? 'TIMEOUT' : 'UNAVAILABLE' }),
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 });
    } catch { finish({ location: null, location_status: 'UNAVAILABLE' }); }
  });
}

export function locationUrl(location) {
  return location ? `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}` : null;
}
