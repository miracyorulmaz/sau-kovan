import React, { useEffect, useState } from 'react';
import { Check, Play, RefreshCw, UsersRound, Wrench, MapPin } from 'lucide-react';
import { api as request } from './api.mjs';
import { HELP_STATES, friendlyError } from './journey.mjs';
import { NotificationStatus } from './SafetyCenter.jsx';
import { locationUrl } from './safety.mjs';
import { Action, Modal } from './ui.jsx';

const NEXT = {
  CREATED: ['operator-ack', 'Operatör talebi gördü'], OPERATOR_ACKED: ['assign', 'Görevli ata'],
  ASSIGNED: ['arrive', 'Olay Yerine Ulaşıldı'], ARRIVED: ['resolve', 'Operatör talebi kapatsın'],
};
const STAGES = ['CREATED', 'OPERATOR_ACKED', 'ASSIGNED', 'ARRIVED', 'RESOLVED'];

export default function DemoPanel({ open, onClose, api, initialTab = 'journey' }) {
  const [tab, setTab] = useState(initialTab);
  const [data, setData] = useState(null);
  const [maps, setMaps] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [unit, setUnit] = useState('guard-01');
  const [pointId, setPointId] = useState('meet_library');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const userId = api.snapshot.user?.id;
  useEffect(() => { if (open) setTab(initialTab); }, [open, initialTab]);
  useEffect(() => {
    if (!open || !userId) return;
    let stopped = false;
    const refresh = () => Promise.all([request('/api/demo/control'), request('/api/maps/config')]).then(([state, config]) => {
      if (!stopped) { setData(state.data); setMaps(config.data); }
    }).catch((failure) => { if (!stopped) setError(friendlyError(failure)); });
    refresh(); const timer = setInterval(refresh, 2500);
    return () => { stopped = true; clearInterval(timer); };
  }, [open, userId]);
  const act = async (path, body, method = 'POST') => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await request(path, { method, body });
      const response = await request('/api/demo/control'); setData(response.data);
      const config = await request('/api/maps/config'); setMaps(config.data);
      await api.refresh();
    } catch (failure) { setError(friendlyError(failure)); }
    finally { setBusy(false); }
  };
  const choosePoint = (id) => {
    setPointId(id); setLatitude(maps?.points[id]?.latitude ?? ''); setLongitude(maps?.points[id]?.longitude ?? ''); setConfirmed(false);
  };
  const locations = [...api.catalog.meeting_points, ...api.catalog.dormitories];
  return <Modal id="demo-control" open={open} onClose={onClose} title="Yerel demo kontrolü" className="kv-modal-wide">
    <p className="kv-mode-note"><Wrench size={15} /> Bu panel yalnızca yerel sentetik hesaplarda açılır. Diğer üyelerin onayları ve görevli işlemleri burada simüle edilir.</p>
    <nav className="kv-demo-tabs" aria-label="Demo kontrol bölümleri">{[['journey', 'Yolculuk'], ['operator', 'Operatör / görevli'], ['notifications', 'Bildirim kutusu'], ['setup', 'Servis kurulumu']].map(([key, label]) =>
      <button key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}</nav>
    {error || api.error ? <p className="kv-login-error" role="alert">{error || api.error}</p> : null}
    {!data ? <p className="kv-field-hint">Demo verileri yükleniyor…</p> : null}
    {tab === 'journey' ? <section className="kv-demo-section"><h3>Tek kişiyle bütün akışı dene</h3><p>Önce öğrenci ekranından nokta, yurt ve çıkış saatiyle plan oluştur. Sonra iki demo arkadaşını ekle.</p>
      <div className="kv-demo-buttons"><Action className="kv-primary" disabled={busy || !!api.busy} busy={api.busy === 'companions'} onClick={() => api.demoCompanions(false)}><UsersRound size={17} />Demo arkadaşlarını ekle ve onaylat</Action>
        <Action className="kv-subtle-button" disabled={busy || !!api.busy} onClick={() => api.demoCompanions(true)}><Play size={16} />Demo çıkışını şimdiye al</Action></div>
      <p className="kv-field-hint">Kendi kabulün verilmez ve yürüyüş otomatik başlamaz. “Şimdiye al”, gelecekteki demo planını aynı nokta ve yurtla yeniden oluşturur.</p>
      <div className="kv-demo-counts"><span>{data?.pods.filter((pod) => !['CANCELLED', 'EXPIRED', 'COMPLETED'].includes(pod.status)).length ?? 0} grup kaydı</span><span>{data?.walks.filter((walk) => walk.status === 'WALKING').length ?? 0} açık yürüyüş</span><span>{data?.assistances.filter((item) => item.status !== 'RESOLVED').length ?? 0} açık destek</span></div>
    </section> : null}
    {tab === 'operator' ? <section className="kv-demo-section"><h3>Operatöre ulaşan yürüyüş taleplerin</h3><p>Öğrenci hesabını değiştirmeden, demo operatörü ve atanmış görevli işlemlerini sırayla ilerlet.</p>
      {data?.assistances.length === 0 ? <p className="kv-inline-note">Henüz talep yok. Yürüyüş ekranındaki “Yardım iste” düğmesiyle bir talep oluştur.</p> : null}
      {[...(data?.assistances ?? [])].reverse().map((item) => <article key={item.id} className="kv-operation-card"><div className="kv-section-head"><strong>{HELP_STATES[item.status]?.[0] ?? item.status}</strong><span className="kv-small-tag">{item.id.slice(0, 8)}</span></div>
        <p>{item.assigned_unit_id ? `Atanan demo görevlisi: ${item.assigned_unit_id}` : 'Henüz görevli atanmamış.'}</p>
        {item.escalation_state !== 'NONE' && item.status !== 'RESOLVED' ? <p className="kv-inline-note">{item.escalation_state === 'GUARD_OVERDUE' ? 'Saha biriminin varış bildirimi gecikti.' : 'Operatör yanıtı gecikti.'} Bu, yardımın ulaştığı anlamına gelmez.</p> : null}
        <ol className="kv-operation-timeline">{STAGES.map((status) => {
          const event = item.history.find((history) => history.status === status);
          return <li key={status} className={event ? 'is-done' : ''}><span>{event ? <Check size={12} /> : '·'}</span><strong>{HELP_STATES[status][0]}</strong><small>{event ? new Date(event.at).toLocaleTimeString('tr-TR') : 'Bekliyor'}</small></li>;
        })}</ol>
        {item.location ? <a className="kv-link-button" href={locationUrl(item.location)} target="_blank" rel="noreferrer"><MapPin size={14} />{item.location.source === 'DEMO' ? 'Örnek konum' : 'Cihazın bildirdiği konum'} ↗</a> : <p className="kv-field-hint">Bu talebe konum eklenmedi.</p>}
        {item.status === 'OPERATOR_ACKED' ? <label className="kv-message-label">Atanacak demo görevlisi<select value={unit} onChange={(event) => setUnit(event.target.value)}>{data.units.map((entry) => <option key={entry.id} value={entry.id} disabled={entry.availability !== 'AVAILABLE'}>{entry.id} · {entry.availability === 'AVAILABLE' ? 'Uygun' : 'Meşgul'}</option>)}</select></label> : null}
        {NEXT[item.status] ? <Action className="kv-primary kv-full" disabled={busy || !!api.busy} busy={busy} onClick={() => act(`/api/demo/assistances/${item.id}/${NEXT[item.status][0]}`, { expected_version: item.version, unit_id: unit })}>{NEXT[item.status][1]}<Check size={15} /></Action> : null}
      </article>)}
    </section> : null}
    {tab === 'notifications' ? <section className="kv-demo-section"><h3>Acil durum kişisine bildirimler</h3><p>Demo modu gerçek WhatsApp mesajı göndermez. WhatsApp modu açıldığında servis kabulü ve teslim teyidi ayrı gösterilir.</p>
      {data?.notifications.length === 0 ? <p className="kv-inline-note">Henüz bildirim kaydı yok. Acil durum kişisi ekleyip yürüyüşte veya kampüs dışında yardım iste.</p> : null}
      {api.capabilities.notifications?.mode === 'DEMO' ? <Action className="kv-subtle-button" disabled={busy || !data?.emergency_contact} onClick={() => act('/api/emergencies', {
        message: 'Yerel demo: yardım bildirimi denemesi.', idempotency_key: crypto.randomUUID(), location_status: 'AVAILABLE',
        location: { latitude: 0, longitude: 0, accuracy_m: 10, captured_at: new Date().toISOString(), source: 'DEMO' },
      })}>Örnek konumla demo bildirimi oluştur</Action> : null}
      <p className="kv-field-hint">Örnek konum (0,0) cihaz konumun değildir ve canlı WhatsApp gönderiminde kullanılamaz.</p>
      {[...(data?.notifications ?? [])].reverse().map((notification) => <NotificationStatus key={notification.id} notification={notification} />)}
    </section> : null}
    {tab === 'setup' ? <section className="kv-demo-section"><h3>Google Maps bağlantısı</h3>
      <div className="kv-integration-status"><span>Routes API: {maps?.routes_configured ? 'Anahtar eklendi' : 'Anahtar eksik'}</span><span>Harita: {maps?.browser_configured ? 'Tarayıcı anahtarı eklendi' : 'Tarayıcı anahtarı eksik'}</span></div>
      <ol className="kv-setup-list"><li>Google Cloud projesinde faturalandırmayı, Routes API ve Maps JavaScript API hizmetlerini aç.</li><li>Sunucu anahtarını kökteki .env dosyasında <code>KOVAN_GOOGLE_MAPS_API_KEY</code> alanına ekle.</li><li>Ayrı, site adresiyle kısıtlanmış tarayıcı anahtarını <code>KOVAN_GOOGLE_MAPS_BROWSER_KEY</code> alanına ekle. Sunucu anahtarını tarayıcıya koyma.</li><li>Sunucuyu yeniden başlat, sayfayı yenile ve aşağıdan iki giriş noktasını teyit et.</li></ol>
      <a className="kv-link-button" href="https://developers.google.com/maps/documentation/javascript/get-api-key" target="_blank" rel="noreferrer">Google Maps anahtar kurulum belgesi ↗</a>
      <form className="kv-point-form" onSubmit={(event) => { event.preventDefault(); act(`/api/demo/maps/points/${pointId}`, { latitude: Number(latitude), longitude: Number(longitude), confirmed }, 'PUT'); }}>
        <h4>Pilot giriş noktasını teyit et</h4><label>Nokta<select value={pointId} onChange={(event) => choosePoint(event.target.value)}>{locations.map((point) => <option key={point.id} value={point.id}>{point.name}{maps?.points[point.id]?.confirmed ? ' · Teyitli' : ''}</option>)}</select></label>
        <div className="kv-coordinate-fields"><label>Enlem<input type="number" step="any" min="-90" max="90" required value={latitude} onChange={(event) => { setLatitude(event.target.value); setConfirmed(false); }} /></label><label>Boylam<input type="number" step="any" min="-180" max="180" required value={longitude} onChange={(event) => { setLongitude(event.target.value); setConfirmed(false); }} /></label></div>
        <a className="kv-link-button" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((locations.find((point) => point.id === pointId)?.name ?? '') + ' Sakarya Serdivan')}`}>Bu noktayı Google Maps’te bul ↗</a>
        <label className="kv-checkbox"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required />Bu koordinatın seçilen buluşma/yurt girişine ait olduğunu teyit ettim.</label>
        <Action type="submit" className="kv-subtle-button" disabled={busy || !confirmed}>Giriş noktasını kaydet</Action>
      </form>
      <h3>WhatsApp bağlantısı</h3><p>Geçerli bir WhatsApp Business Cloud API hesabı, gönderen numarası ve onaylı Türkçe mesaj şablonu gerekir. Kişisel WhatsApp oturumunu otomatik kullanmaz.</p>
      <ol className="kv-setup-list"><li>.env içindeki <code>KOVAN_WHATSAPP_TOKEN</code>, <code>KOVAN_WHATSAPP_PHONE_NUMBER_ID</code> ve Meta panelindeki sürümle <code>KOVAN_WHATSAPP_API_VERSION</code> alanlarını doldur.</li><li>Dört sıralı gövde değişkenli onaylı şablonunu <code>KOVAN_WHATSAPP_TEMPLATE_NAME</code> alanına yaz: öğrenci adı, yardım notu, konum bilgisi, tarih-saat.</li><li>Teslim durumları için HTTPS webhook adresini <code>/api/webhooks/whatsapp</code> olarak bağla; uygulama sırrı ve doğrulama belirtecini yerel ayarlara ekle.</li><li>Gerçek gönderim için <code>KOVAN_NOTIFICATION_MODE=WHATSAPP</code> yapıp yeniden başlat. Kurulum tamamlanana kadar DEMO kullan.</li></ol>
      <p className="kv-field-hint">Ayrıntılı kurulum, şablon metni ve test adımları: docs/INTEGRATIONS.md. Anahtar ve erişim belirteçlerini GitHub’a koyma.</p>
    </section> : null}
    <button className="kv-link-button kv-panel-refresh" disabled={busy} onClick={async () => { const response = await request('/api/demo/control').catch(() => null); if (response) setData(response.data); }}><RefreshCw size={14} />Demo verilerini yenile</button>
  </Modal>;
}
