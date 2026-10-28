import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, ArrowUpRight, Check, CheckCircle2, Clock3, DoorOpen, Hexagon,
  LogIn, LogOut, MapPin, Navigation, Radio, RefreshCw, Shield, UsersRound } from 'lucide-react';
import { Action } from '../student/ui.jsx';
import { locationUrl } from '../student/safety.mjs';
import { useOperations } from './useOperations.js';
import { isOpen, OPERATION_STATES, REASONS, routeForRole, taskContext, tasksForRole, unitName } from './operations.mjs';
import '../student/student.css';
import './operations.css';

const dateTime = (value) => value ? new Date(value).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Kayıt yok';
const LABELS = { dispatcher: ['Operatör', 'Talepleri gör. Birimi sevk et.', 'Gelen talepleri incele, uygun saha birimini yönlendir ve süreci takip et.'],
  guard: ['Saha görevlisi', 'Atanan görevin, tek ekranda.', 'Görev ayrıntılarını gör ve olay yerine ulaştığında haber ver.'] };

function Status({ status }) {
  return <span className={`ko-status ko-status-${status.toLowerCase()}`}>{OPERATION_STATES[status]?.[0] ?? (status === 'CANCELLED' ? 'İptal edildi' : 'Durum bilinmiyor')}</span>;
}

function Access({ session, role }) {
  const [code, setCode] = useState('');
  const label = LABELS[role][0];
  const other = session.snapshot.user;
  return <section className="ko-access kv-main-card" aria-labelledby="access-title">
    <div className="ko-access-intro"><span className="kv-state-icon"><Shield size={27} /></span>
      <h2 id="access-title">{label} girişi</h2>
      <p>Yalnızca bu role ait pilot hesabıyla devam edebilirsin.</p>
      <div className="ko-access-steps">{(role === 'dispatcher' ? ['Talebi incele', 'Uygun birimi sevk et', 'Destek sürecini tamamla'] : ['Atanan görevi gör', 'Talep konumunu kontrol et', 'Olay yerine varışını bildir']).map((step) => <span key={step}><Check size={15} />{step}</span>)}</div>
    </div>
    {other ? <div className="ko-access-form"><AlertCircle size={26} /><h3>Farklı bir hesap açık</h3>
      <p>Bu hesap {label.toLocaleLowerCase('tr-TR')} ekranını kullanamaz. Kendi ekranına geçebilir veya farklı hesapla giriş yapabilirsin.</p>
      <a className="kv-button kv-primary" href={routeForRole(other.role)}>Hesabımın ekranına git<ArrowRight size={17} /></a>
      <Action className="kv-subtle-button" disabled={!!session.busy} busy={session.busy === 'logout'} onClick={session.logout}>Farklı hesapla giriş yap</Action>
    </div> : <form className="ko-access-form kv-login-form" onSubmit={async (event) => { event.preventDefault(); if (await session.login(code)) setCode(''); }}>
      <label htmlFor="operations-code">{label} erişim kodu</label>
      <input id="operations-code" type="password" required minLength={12} autoComplete="off" value={code}
        onChange={(event) => setCode(event.target.value)} disabled={!!session.busy} placeholder="Pilot erişim kodunu gir" />
      <Action type="submit" className="kv-primary kv-full" busy={session.busy === 'login'} disabled={!!session.busy || code.trim().length < 12}>Giriş yap<LogIn size={17} /></Action>
      <p className="kv-field-hint">Erişim kodu kaydedilmez. Bu pilot, gerçek güvenlik birimine bağlı değildir.</p>
    </form>}
  </section>;
}

function Timeline({ item }) {
  return <ol className="ko-timeline" aria-label="Talebin ilerleyişi">{Object.entries(OPERATION_STATES).map(([status, [label]]) => {
    const event = item.history.find((entry) => entry.status === status);
    return <li key={status} className={event ? 'is-done' : ''} aria-current={item.status === status ? 'step' : undefined}>
      <span className="ko-timeline-dot">{event ? <Check size={12} /> : null}</span><strong>{label}</strong>
      <time dateTime={event?.at}>{event ? new Date(event.at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'Bekliyor'}</time>
    </li>;
  })}</ol>;
}

function TaskActions({ item, role, session }) {
  const [unit, setUnit] = useState('');
  const units = session.snapshot.units ?? [];
  const chosen = units.find((entry) => entry.id === unit && entry.availability === 'AVAILABLE');
  const disabled = !!session.busy;
  if (!isOpen(item)) return <p className="ko-confirmation"><CheckCircle2 size={20} />Destek süreci tamamlandı.</p>;
  if (role === 'guard') return item.status === 'ASSIGNED'
    ? <div className="ko-actions"><p>Varış bildirimin operatöre ve öğrenciye iletilir.</p>
      <Action className="kv-primary kv-full" disabled={disabled} busy={session.busy === `${item.id}:arrive`} onClick={() => session.action(item, 'arrive')}><MapPin size={19} />Olay yerine ulaşıldı</Action></div>
    : <p className="ko-confirmation"><CheckCircle2 size={20} />Varışın bildirildi. Süreci operatör tamamlayacak.</p>;
  if (item.status === 'CREATED') return <div className="ko-actions"><p>Talebi üstlenerek incelemeye başla.</p>
    <Action className="kv-primary kv-full" disabled={disabled} busy={session.busy === `${item.id}:operator-ack`} onClick={() => session.action(item, 'operator-ack')}><Radio size={18} />Talebi üstlen</Action></div>;
  if (item.status === 'OPERATOR_ACKED') return <form className="ko-actions" onSubmit={(event) => { event.preventDefault(); if (chosen) session.action(item, 'assign', { unit_id: chosen.id }); }}>
    <label htmlFor="dispatch-unit">Sevk edilecek saha birimi</label>
    <select id="dispatch-unit" required value={unit} onChange={(event) => setUnit(event.target.value)} disabled={disabled}>
      <option value="">Uygun birim seç</option>{units.map((entry) => <option key={entry.id} value={entry.id} disabled={entry.availability !== 'AVAILABLE'}>{unitName(entry)} · {entry.availability === 'AVAILABLE' ? 'Uygun' : 'Görevde'}</option>)}
    </select>
    {!units.some((entry) => entry.availability === 'AVAILABLE') ? <p className="kv-inline-note">Şu anda uygun birim yok. Bir görev kapatıldığında liste güncellenir.</p> : null}
    <Action type="submit" className="kv-primary kv-full" disabled={disabled || !chosen} busy={session.busy === `${item.id}:assign`}><Navigation size={18} />Birimi sevk et</Action>
  </form>;
  if (item.status === 'ARRIVED') return <div className="ko-actions"><p>Saha biriminin varış bildirimi alındı. İletişimi ve destek sürecini tamamladıktan sonra talebi kapat.</p>
    <Action className="kv-primary kv-full" disabled={disabled} busy={session.busy === `${item.id}:resolve`} onClick={() => session.action(item, 'resolve', { resolution: 'CONTACT_COMPLETED' })}><CheckCircle2 size={18} />Destek sürecini tamamla</Action></div>;
  return <p className="ko-confirmation"><Navigation size={20} />Saha birimi sevk edildi. Varış bildirimi bu ekrana yansıyacak.</p>;
}

function TaskDetail({ item, role, session }) {
  const context = taskContext(item, session.snapshot, session.catalog);
  const assigned = (session.snapshot.units ?? []).find((unit) => unit.id === item.assigned_unit_id);
  return <article className={`kv-main-card ko-detail ${role === 'guard' ? 'ko-field-detail' : ''}`} aria-label="Talep ayrıntıları">
    <header className="ko-detail-head"><div><span className="kv-kicker">DESTEK TALEBİ</span><h2>{REASONS[item.reason] ?? 'Yürüyüş desteği'}</h2></div><Status status={item.status} /></header>
    <div className="ko-request-info"><span><UsersRound size={16} />{item.student_name ?? 'Öğrenci'}</span><span><Clock3 size={15} /><time dateTime={item.created_at}>{dateTime(item.created_at)}</time></span></div>
    {['OPERATOR_OVERDUE', 'GUARD_OVERDUE'].includes(item.escalation_state) ? <p className="ko-delay"><AlertCircle size={17} />{item.escalation_state === 'GUARD_OVERDUE' ? 'Saha biriminin varış bildirimi gecikti.' : 'Operatör yanıtı gecikti.'} Talep açık.</p> : null}
    {role === 'guard' ? <TaskActions key={item.id} item={item} role={role} session={session} /> : null}
    <div className="ko-route"><div><MapPin size={20} /><p><span>Buluşma noktası</span><strong>{context.meeting}</strong></p></div><div><DoorOpen size={20} /><p><span>Varış yurdu</span><strong>{context.dorm}</strong></p></div></div>
    <section className="ko-location" aria-label="Talep konumu"><h3>Konum bilgisi</h3>
      {item.location ? <><p>{item.location.source === 'DEMO' ? 'Bu talebe örnek bir demo konumu eklendi.' : 'Yardım istendiğinde paylaşılan tek seferlik konum.'}</p>
        <a href={locationUrl(item.location)} className="kv-link-button" target="_blank" rel="noreferrer">{item.location.source === 'DEMO' ? 'Örnek konumu aç' : 'Paylaşılan konumu aç'}<ArrowUpRight size={15} /></a>
        <p className="kv-field-hint">{dateTime(item.location.captured_at)} · Sürekli konum takibi yok.</p></>
        : <><p>Talebe cihaz konumu eklenmemiş. Buluşma noktası öğrencinin güncel konumu değildir.</p>{context.meetingUrl ? <a href={context.meetingUrl} className="kv-link-button" target="_blank" rel="noreferrer">Buluşma noktasını haritada aç<ArrowUpRight size={15} /></a> : null}</>}
    </section>
    {item.assigned_unit_id ? <div className="ko-assigned"><Shield size={18} /><span>{unitName(assigned ?? { id: item.assigned_unit_id })}</span><small>{role === 'guard' ? 'Sana atanan görev' : 'Sevk edilen birim'}</small></div> : null}
    <Timeline item={item} />
    {role === 'dispatcher' ? <TaskActions key={item.id} item={item} role={role} session={session} /> : null}
  </article>;
}

export default function OperationsApp({ role }) {
  const session = useOperations(role);
  const [filter, setFilter] = useState('open');
  const [selectedId, setSelectedId] = useState(null);
  const [label, title, description] = LABELS[role];
  const tasks = tasksForRole(session.snapshot, role);
  const open = tasks.filter(isOpen);
  const visible = tasks.filter((task) => filter === 'open' ? isOpen(task) : !isOpen(task));
  const selected = visible.find((task) => task.id === selectedId) ?? visible[0];
  const user = session.snapshot.user;
  useEffect(() => { document.title = `Kovan · ${label}`; document.documentElement.classList.remove('dark'); }, [label]);
  return <div className="kv-app ko-app"><a className="kv-skip" href="#operations-main">İçeriğe geç</a>
    <header className="kv-header"><div className="kv-header-inner"><a href="/" className="kv-brand" aria-label="Kovan öğrenci ekranı"><span className="kv-brand-mark"><Hexagon size={26} /><UsersRound size={13} /></span>Kovan<span className="kv-brand-dot">.</span></a><span className="kv-brand-caption">{label} ekranı</span>
      <nav aria-label="Kovan ekranları"><a href="/operator" className="kv-nav-link" aria-current={role === 'dispatcher' ? 'page' : undefined}>Operatör</a><a href="/guard" className="kv-nav-link" aria-current={role === 'guard' ? 'page' : undefined}>Saha görevlisi</a>
        {user ? <button className="ko-signout" disabled={!!session.busy} onClick={session.logout} aria-label="Hesaptan çıkış yap"><LogOut size={18} /><span>Çıkış yap</span></button> : null}</nav>
    </div></header>
    <main id="operations-main" className="ko-main"><div className="kv-intro"><div><span className="kv-eyebrow"><span />SAKARYA ÜNİVERSİTESİ · {label.toLocaleUpperCase('tr-TR')}</span><h1>{title}</h1><p>{description}</p></div><span className="kv-demo-label">Pilot demo</span></div>
      {session.error ? <div className="kv-error ko-feedback" role="alert"><AlertCircle size={19} /><p>{session.error}</p></div> : null}
      {session.notice ? <p className="ko-notice" role="status"><CheckCircle2 size={18} />{session.notice}</p> : null}
      {session.loading ? <p className="ko-loading" role="status">Oturum ve talepler yükleniyor…</p> : !session.authorized ? <Access session={session} role={role} /> : <>
        <div className="ko-toolbar"><div className="ko-filter" aria-label="Talep filtresi"><button aria-pressed={filter === 'open'} onClick={() => setFilter('open')}>Açık talepler<span>{open.length}</span></button><button aria-pressed={filter === 'closed'} onClick={() => setFilter('closed')}>Tamamlananlar<span>{tasks.length - open.length}</span></button></div>
          <div className="ko-live"><span className={session.connection === 'online' ? 'is-online' : ''} />{session.connection === 'online' ? 'Canlı güncelleniyor' : session.connection === 'offline' ? 'Bağlantı kesildi' : 'Bağlanıyor'}<button className="kv-icon-button" aria-label="Talepleri yenile" disabled={!!session.busy} onClick={session.refresh}><RefreshCw size={17} /></button></div></div>
        {session.connection !== 'online' ? <p className="ko-delay"><AlertCircle size={17} />Canlı bağlantı yenileniyor. Talepler aralıklarla kontrol ediliyor; gerekirse yenile düğmesini kullan.</p> : null}
        <div className={`ko-workspace ${role === 'guard' && visible.length === 1 ? 'is-single-task' : ''}`}><aside className="kv-main-card ko-queue" aria-label="Destek talepleri"><div className="ko-queue-heading"><h2>{role === 'guard' ? 'Sana atanan görevler' : 'Gelen talepler'}</h2><span>{visible.length}</span></div>
          {visible.length ? <ul>{visible.map((task) => { const context = taskContext(task, session.snapshot, session.catalog); return <li key={task.id}><button aria-pressed={selected?.id === task.id} onClick={() => setSelectedId(task.id)} className="ko-queue-item"><div><Status status={task.status} /><time dateTime={task.created_at}>{new Date(task.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</time></div><strong>{context.meeting}</strong><span className="ko-queue-dorm">{context.dorm}</span><span className="ko-queue-student">{task.student_name ?? 'Öğrenci'}<ArrowRight size={16} /></span></button></li>; })}</ul>
            : <p className="ko-queue-empty">{filter === 'closed' ? 'Henüz tamamlanan talep yok.' : role === 'guard' ? 'Sana atanmış açık görev yok.' : 'Şu anda açık destek talebi yok.'}</p>}
        </aside>{selected ? <TaskDetail key={selected.id} item={selected} role={role} session={session} /> : <section className="kv-main-card ko-empty"><span className="kv-state-icon"><Shield size={29} /></span><h2>{filter === 'closed' ? 'Tamamlanan talepler burada.' : role === 'guard' ? 'Yeni görevin burada görünecek.' : 'Yeni talepler burada görünecek.'}</h2><p>{filter === 'closed' ? 'Kapatılan destek taleplerinin sürecini buradan inceleyebilirsin.' : role === 'guard' ? 'Operatör sana bir görev atadığında ayrıntılar ve varış düğmesi bu ekrana gelecek.' : 'Bir öğrenci yürüyüş sırasında yardım istediğinde talebi otomatik olarak listelenir.'}</p></section>}</div>
      </>}
      <p className="ko-demo-note"><Shield size={15} />Bu ekran sentetik pilot hesaplarıyla çalışır; gerçek güvenlik birimine bağlı değildir.</p>
    </main><footer className="kv-footer ko-footer"><span className="kv-footer-logo"><Hexagon size={16} />Kovan · Birlikte, yurda.</span><nav aria-label="Diğer uygulama ekranları"><a href="/">Öğrenci ekranı<ArrowUpRight size={13} /></a><a href="/demo">Demo yönetimi<ArrowUpRight size={13} /></a></nav></footer>
  </div>;
}
