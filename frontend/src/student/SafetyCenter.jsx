import React, { useState } from 'react';
import { BellRing, HeartHandshake, MapPin, Settings2, Check } from 'lucide-react';
import { Action, Modal } from './ui.jsx';
import { NOTIFICATION_STATES, locationUrl } from './safety.mjs';

export function NotificationStatus({ notification }) {
  if (!notification) return null;
  const [title, detail] = NOTIFICATION_STATES[notification.status] ?? ['Bildirim durumu güncellendi', 'Son durumu kontrol et.'];
  return <div className="kv-notification" role="status"><BellRing size={19} /><div><strong>{title}</strong><p>{detail}</p>
    {notification.recipient_masked ? <small>Alıcı: {notification.recipient_name} · {notification.recipient_masked}</small> : null}
    {notification.location ? <p><a href={locationUrl(notification.location)} target="_blank" rel="noreferrer">{notification.location.source === 'DEMO' ? 'Örnek konumu aç' : 'Paylaşılan konumu aç'} ↗</a> · {new Date(notification.location.captured_at).toLocaleTimeString('tr-TR')} · ±{Math.round(notification.location.accuracy_m)} m</p>
      : <p>Konum eklenmedi{notification.location_status === 'DENIED' ? ': cihaz izni verilmedi.' : notification.location_status === 'STALE' ? ': konum güncel değildi.' : '.'}</p>}
    {notification.preview_text ? <blockquote>{notification.preview_text}</blockquote> : null}
  </div></div>;
}

export default function SafetyCenter({ api, allowed }) {
  const contact = api.snapshot.emergency_contact;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('Kampüs dışında desteğe ihtiyacım var.');
  const emergencies = api.snapshot.emergencies ?? [];
  const active = [...emergencies].reverse().find((item) => item.status === 'CREATED');
  const latest = active ?? emergencies[emergencies.length - 1];
  const notification = (api.snapshot.notifications ?? []).find((item) => item.incident_id === latest?.id);
  const edit = () => {
    api.clearError();
    setForm(contact ? { name: contact.name, phone_e164: contact.phone_e164, consent_confirmed: contact.consent_confirmed,
      notify_on_help: contact.notify_on_help, share_location_on_help: contact.share_location_on_help }
      : { name: '', phone_e164: '', consent_confirmed: false, notify_on_help: true, share_location_on_help: true });
    setOpen(true);
  };
  const save = async (event) => {
    event.preventDefault();
    if (await api.saveContact({ ...form, phone_e164: form.phone_e164.replace(/[\s()-]/g, '') })) setOpen(false);
  };
  return <section id="personal-help" className="kv-safety-center" aria-labelledby="personal-help-heading" tabIndex={-1}>
    <div className="kv-safety-heading"><span className="kv-state-icon"><HeartHandshake size={25} /></span><div><span className="kv-kicker">KİŞİSEL DESTEK</span>
      <h2 id="personal-help-heading">Kampüs dışında da birine haber ver.</h2><p>Yürüyüş başlatmadan, seçtiğin kişiye yardım ve isteğine bağlı anlık konum bildirimi oluştur.</p></div></div>
    <div className="kv-contact-summary"><div><strong>{contact ? contact.name : 'Henüz acil durum kişisi eklemedin.'}</strong><span>{contact ? `${contact.phone_e164} · WhatsApp` : 'Kişini kaydet ve bildirim tercihlerini seç.'}</span></div>
      <button className="kv-link-button" onClick={edit} disabled={!!api.busy}><Settings2 size={16} />{contact ? 'Kişiyi düzenle' : 'Kişi ekle'}</button></div>
    <p className="kv-mode-note">{api.capabilities.notifications?.mode === 'WHATSAPP'
      ? api.capabilities.notifications.whatsapp_configured ? 'WhatsApp gönderimi açık. Alıcı rızası ve cihaz izni tercihlerine göre gönderilir.' : 'WhatsApp modu seçili; servis ayarları tamamlanmadı. Gerçek gönderim yapılamıyor.'
      : 'Demo modu: mesajı gelen kutusunda önizlersin; gerçek WhatsApp mesajı gönderilmez.'}</p>
    {active ? <><p className="kv-inline-note">Kampüs dışı yardım talebin açık. Bu talep resmî acil servis veya kampüs görevlisi çağrısı değildir.</p>
      <Action className="kv-subtle-button" disabled={!!api.busy} busy={api.busy === 'resolve-emergency'} onClick={() => api.resolveEmergency(active)}><Check size={17} />Güvendeyim, talebi kapat</Action></>
      : <><label className="kv-message-label" htmlFor="personal-help-message">Kişine iletilecek not</label><textarea id="personal-help-message" value={message} maxLength={500} onChange={(event) => setMessage(event.target.value)} disabled={!!api.busy} />
        <Action className="kv-help-button" disabled={!!api.busy || !contact || !contact.notify_on_help || !allowed || !message.trim()} busy={api.busy === 'emergency'} onClick={() => api.sendEmergency(message)}><BellRing size={18} />Kişime yardım bildir</Action>
        {contact?.share_location_on_help ? <p className="kv-field-hint"><MapPin size={13} /> Gönderirken cihazından güncel konum istenir. İzin verilmezse talep konumsuz oluşturulur.</p> : null}</>}
    <NotificationStatus notification={notification} />
    <Modal id="emergency-contact" open={open} onClose={() => setOpen(false)} title="Acil durum kişin">
      {form ? <form onSubmit={save} className="kv-contact-form"><label htmlFor="contact-name">Adı<input id="contact-name" value={form.name} required minLength={2} maxLength={80} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label htmlFor="contact-phone">WhatsApp numarası<input id="contact-phone" type="tel" placeholder="+90…" value={form.phone_e164} required onChange={(event) => setForm({ ...form, phone_e164: event.target.value })} /></label>
        <label className="kv-checkbox"><input type="checkbox" checked={form.notify_on_help} onChange={(event) => setForm({ ...form, notify_on_help: event.target.checked })} />Yardım talebimde kişime bildirim oluştur</label>
        <label className="kv-checkbox"><input type="checkbox" checked={form.share_location_on_help} onChange={(event) => setForm({ ...form, share_location_on_help: event.target.checked })} />O anki konumumu da ekle</label>
        <label className="kv-checkbox"><input type="checkbox" required checked={form.consent_confirmed} onChange={(event) => setForm({ ...form, consent_confirmed: event.target.checked })} />Bu kişi, kendisini acil durum kişim olarak eklediğimden ve bildirim alacağından haberdar.</label>
        {api.error ? <p className="kv-login-error" role="alert">{api.error}</p> : null}
        <Action className="kv-primary kv-full" type="submit" disabled={!!api.busy} busy={api.busy === 'contact'}>Kişiyi kaydet</Action>
        {contact ? <button className="kv-link-button" type="button" disabled={!!api.busy} onClick={async () => { if (await api.deleteContact()) setOpen(false); }}>Kişiyi kaldır</button> : null}
        <p className="kv-field-hint">Konum tek seferlik bir cihaz bildirimidir; sürekli takip başlatılmaz. WhatsApp servis bağlantısı ayrı kurulur.</p>
      </form> : null}
    </Modal>
  </section>;
}
