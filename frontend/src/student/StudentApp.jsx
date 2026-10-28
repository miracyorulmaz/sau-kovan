import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, Check, CheckCheck, ChevronDown, Clock3, Coffee,
  DoorOpen, Footprints, HeartHandshake, Hexagon, LoaderCircle, LogIn, LogOut, MapPin,
  RefreshCw, School, ShieldCheck, Bus, UsersRound, X, CircleHelp, BellRing, Wrench } from 'lucide-react';
import { useStudentJourney } from './useStudentJourney.js';
import { HELP_STATES, localDateTime, membershipAllowed, selectJourney } from './journey.mjs';
import { Action, Modal } from './ui.jsx';
import DemoPanel from './DemoPanel.jsx';
import SafetyCenter, { NotificationStatus } from './SafetyCenter.jsx';
import RoutePreview from './RoutePreview.jsx';
import './student.css';

const MEETING_ICONS = { meet_library: BookOpen, meet_adibahce: Coffee, meet_campus_gate: School, meet_final_stop: Bus };
const atTime = (date) => new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
const placeName = (items, id) => items.find((item) => item.id === id)?.name ?? ({ meet_cinaralti: 'Çınaraltı (eski nokta)', meet_campus_market: 'Kampüs market önü (eski nokta)' }[id] ?? 'Seçilen nokta');

function Progress({ stage }) {
  const step = ['plan', 'waiting'].includes(stage) ? (stage === 'plan' ? 0 : 1) : stage === 'group' ? 1 : 2;
  return <ol className="kv-progress" aria-label="Yolculuk adımları">
    {['Planını seç', 'Grubuna katıl', 'Birlikte yürü'].map((label, index) => <li key={label}
      className={index === step ? 'is-current' : index < step || stage === 'complete' ? 'is-done' : ''}
      aria-current={index === step && stage !== 'complete' ? 'step' : undefined}>
      <span className="kv-step-number">{index < step || stage === 'complete' ? <Check size={15} /> : index + 1}</span><span>{label}</span>
    </li>)}
  </ol>;
}

function PlanForm({ catalog, plan, setPlan, onSearch, busy, disabled, approved, loading, now }) {
  return <form onSubmit={(event) => { event.preventDefault(); onSearch(); }} className="kv-plan-form">
    <div className="kv-section-head"><span className="kv-kicker">YOLCULUK PLANIN</span><span className="kv-small-tag"><UsersRound size={13} /> 3–5 kişi</span></div>
    <fieldset disabled={disabled}><legend>Nerede buluşalım?</legend>
      <div className="kv-place-grid">{catalog.meeting_points.map((item) => {
        const Icon = MEETING_ICONS[item.id] ?? MapPin;
        return <label key={item.id} className={`kv-place-option ${plan.meetingId === item.id ? 'is-selected' : ''}`}>
          <input type="radio" name="meeting" value={item.id} checked={plan.meetingId === item.id}
            onChange={() => setPlan({ ...plan, meetingId: item.id })} />
          <Icon size={22} aria-hidden="true" /><span>{item.name}</span><span className="kv-radio-dot" aria-hidden="true" />
        </label>;
      })}</div>
    </fieldset>
    <div className="kv-field"><label htmlFor="destination-dorm">Hangi yurda gidiyorsun?</label>
      <div className="kv-select-wrap"><DoorOpen size={20} aria-hidden="true" />
        <select id="destination-dorm" value={plan.dormId} disabled={disabled} onChange={(event) => setPlan({ ...plan, dormId: event.target.value })}>
          {catalog.dormitories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select><ChevronDown size={17} aria-hidden="true" /></div>
    </div>
    <div className="kv-field"><label htmlFor="departure-time">Ne zaman çıkıyorsun?</label>
      <input id="departure-time" type="datetime-local" required disabled={disabled} value={plan.departureAt || localDateTime(now)}
        min={localDateTime(now)} max={localDateTime(now + 24 * 60 * 60_000)} onChange={(event) => setPlan({ ...plan, departureAt: event.target.value })} />
      <div className="kv-time-shortcuts">{[[0, 'Şimdi'], [3, '+3 saat'], [10, '+10 saat']].map(([hours, label]) => <button key={hours} type="button" disabled={disabled}
        onClick={() => setPlan({ ...plan, departureAt: hours ? localDateTime(Date.now() + hours * 60 * 60_000) : '' })}>{hours ? <Clock3 size={13} /> : null}{label}</button>)}</div>
      <p className="kv-field-hint">Önümüzdeki 24 saat içinde bir tarih ve saat seç. Bu saatten itibaren 10 dakikalık ortak çıkış aralığı aranır.</p>
    </div>
    <Action type="submit" className="kv-primary kv-full" disabled={disabled || !approved || loading} busy={busy === 'search'}>
      {loading ? 'Oturum kontrol ediliyor…' : approved ? 'Yol arkadaşı bul' : 'Üyelik onayı bekleniyor'}<ArrowRight size={18} />
    </Action>
    <p className="kv-form-note"><ShieldCheck size={15} aria-hidden="true" /> Herkes kendi katılımını onaylar. Sen hazır olduğunda yürürsün.</p>
  </form>;
}

function RouteSummary({ catalog, meetingId, dormId, compact = false }) {
  return <div className={`kv-route-summary ${compact ? 'is-compact' : ''}`}>
    <div><span className="kv-route-dot" /><p><span>Buluşma noktası</span><strong>{placeName(catalog.meeting_points, meetingId)}</strong></p></div>
    <div><span className="kv-route-dot is-destination" /><p><span>Varış yurdu</span><strong>{placeName(catalog.dormitories, dormId)}</strong></p></div>
  </div>;
}

function MemberList({ pod, userId }) {
  return <ul className="kv-members" aria-label="Grup arkadaşların">{pod.member_ids.map((id, index) => {
    const accepted = pod.accepted_member_ids.includes(id);
    const name = id === userId ? 'Sen' : `Yol arkadaşı ${index + 1}`;
    return <li key={id}><span className={`kv-avatar kv-avatar-${index % 4}`} aria-hidden="true">{id === userId ? 'S' : index + 1}</span>
      <span><strong>{name}</strong><small>{id === userId ? 'Senin katılımın' : 'Aynı noktadan, aynı yurda'}</small></span>
      <span className={`kv-member-state ${accepted ? 'is-accepted' : ''}`}>{accepted ? <><Check size={14} /> Katılıyor</> : 'Onay bekleniyor'}</span>
    </li>;
  })}</ul>;
}

function Waiting({ journey, catalog, api, now }) {
  return <section className="kv-state-panel">
    <span className="kv-state-icon"><UsersRound size={29} /></span>
    <span className="kv-kicker">PLANIN KAYDEDİLDİ</span>
    <h2>{journey.expired ? 'Çıkış aralığın doldu.' : 'Yol arkadaşlarını arıyoruz.'}</h2>
    <p>{journey.expired ? 'Yeni bir çıkış saatiyle tekrar grup arayabilirsin.' : 'Aynı buluşma noktasından aynı yurda giden en az üç öğrenci olduğunda grubunuz oluşur.'}</p>
    <RouteSummary catalog={catalog} meetingId={journey.intent.meeting_point_id} dormId={journey.intent.destination_dorm_id} compact />
    <div className="kv-time-note"><Clock3 size={17} /><span>Çıkış aralığın: <strong>{atTime(journey.intent.earliest_at)} – {atTime(journey.intent.latest_at)}</strong></span></div>
    {!journey.expired ? <Action className="kv-primary kv-full" disabled={!!api.busy} busy={api.busy === 'match'} onClick={api.matchAgain}>
      <RefreshCw size={17} /> Yeniden grup ara</Action> : null}
    {api.capabilities.local_demo_controls && !journey.expired ? <div className="kv-demo-inline"><span>Yerel demo</span><Action className="kv-subtle-button kv-full" disabled={!!api.busy} busy={api.busy === 'companions'} onClick={() => api.demoCompanions(false)}><UsersRound size={17} />İki demo arkadaşı ekle ve onaylat</Action><p>Kendi katılımını yine sen onaylarsın.</p></div> : null}
    <Action className="kv-text-button kv-full" disabled={!!api.busy} busy={api.busy === 'cancel'} onClick={api.cancel}>
      {journey.expired ? 'Yeni plan oluştur' : 'Planımı değiştir'}</Action>
    {!journey.expired ? <p className="kv-field-hint">Bir gruba eklendiğinde bu ekran güncellenir. {Math.max(1, Math.ceil((new Date(journey.intent.latest_at) - now) / 60_000))} dk içinde eşleşme aranabilir.</p> : null}
  </section>;
}

function Group({ journey, userId, api, now, arrivalCheck, setArrivalCheck, duration, setDuration, mapPreview }) {
  const { pod } = journey;
  const accepted = pod.accepted_member_ids.includes(userId);
  const allAccepted = pod.accepted_member_ids.length === pod.member_ids.length;
  const inWindow = now >= new Date(pod.departure_at).getTime() && now <= new Date(pod.latest_departure_at).getTime();
  const timedOut = now > new Date(pod.latest_departure_at).getTime();
  return <section className="kv-state-panel">
    <span className="kv-state-icon"><UsersRound size={29} /></span><span className="kv-kicker">YOL ARKADAŞLARIN HAZIR</span>
    <h2>{allAccepted ? 'Herkes katılıyor.' : `${pod.member_ids.length} kişilik bir grup bulduk.`}</h2>
    <p>{allAccepted ? 'Buluşma noktasında bir araya geldiğinizde kendi yürüyüşünü başlatabilirsin.' : 'Gruba katılmak için onay ver. Yürüyüş, herkes kabul ettiğinde başlayabilir.'}</p>
    <MemberList pod={pod} userId={userId} />
    <div className="kv-time-note"><Clock3 size={17} /><span>Ortak çıkış: <strong>{atTime(pod.departure_at)} – {atTime(pod.latest_departure_at)}</strong></span></div>
    {allAccepted ? <div className="kv-walk-options">
      <label htmlFor="walk-duration">Tahmini yürüyüş süren <select id="walk-duration" value={duration} onChange={(event) => setDuration(event.target.value)} disabled={!!api.busy}>
        {[...new Set([Number(duration), 10, 15, 20, 30])].sort((a, b) => a - b).map((minutes) => <option value={minutes} key={minutes}>{minutes} dakika</option>)}</select></label>
      {mapPreview ? <p className="kv-field-hint">Google rota tahmini: {Math.ceil(mapPreview.duration_seconds / 60)} dk. Gerekirse süreyi değiştirebilirsin.</p> : null}
      <label className="kv-checkbox"><input type="checkbox" checked={arrivalCheck} onChange={(event) => setArrivalCheck(event.target.checked)} disabled={!!api.busy} /> Varışımı kontrol et</label>
      {arrivalCheck ? <p className="kv-field-hint">Seçtiğin sürede varışını onaylamazsan, 1 dk ek süre sonunda demo operatörüne inceleme kaydı açılır.</p> : null}
    </div> : null}
    {timedOut ? <p role="status" className="kv-inline-note">Buluşma süresi doldu. Planın kapanırken son durum güncelleniyor.</p> : null}
    {allAccepted ? <Action className="kv-primary kv-full" disabled={!!api.busy || !inWindow} busy={api.busy === 'start'} onClick={() => api.start(arrivalCheck, duration, mapPreview?.preview_id)}>
      <Footprints size={19} />{inWindow ? 'Yürüyüşü başlat' : timedOut ? 'Buluşma süresi doldu' : `Çıkış saatin ${atTime(pod.departure_at)}`}</Action>
      : <Action className="kv-primary kv-full" disabled={!!api.busy || accepted || timedOut} busy={api.busy === 'accept'} onClick={api.accept}>
        {accepted ? <CheckCheck size={18} /> : <Check size={18} />}{accepted ? 'Katıldın · Diğer onaylar bekleniyor' : 'Gruba katıl'}</Action>}
    {pod.status === 'PROPOSED' && !timedOut ? <Action className="kv-text-button kv-full" disabled={!!api.busy} onClick={api.cancel} busy={api.busy === 'cancel'}>Bu gruptan ayrıl</Action> : null}
  </section>;
}

function HelpStatus({ assistance }) {
  if (!assistance) return null;
  const [title, description] = HELP_STATES[assistance.status] ?? ['Destek durumu güncellendi', 'Son bilgiyi kontrol edebilirsin.'];
  const overdue = ['OPERATOR_OVERDUE', 'GUARD_OVERDUE'].includes(assistance.escalation_state) && assistance.status !== 'RESOLVED';
  return <div className={`kv-help-status ${assistance.status === 'RESOLVED' ? 'is-resolved' : ''}`} role="status">
    <HeartHandshake size={22} /><div><strong>{title}</strong><p>{description}</p>
      {overdue ? <p className="kv-overdue">{assistance.escalation_state === 'GUARD_OVERDUE' ? 'Saha biriminin varış bildirimi gecikti.' : 'Operatör yanıtı gecikti.'} Talebin açık; yardımın ulaştığı henüz doğrulanmadı.</p> : null}</div>
  </div>;
}

function Walking({ journey, api }) {
  const helpOpen = journey.assistance && !['RESOLVED', 'CANCELLED'].includes(journey.assistance.status);
  return <section className="kv-state-panel">
    <span className="kv-state-icon is-green"><Footprints size={29} /></span><span className="kv-kicker">YÜRÜYÜŞÜN BAŞLADI</span>
    <h2>Yolunuz açık olsun.</h2><p>Grubunla birlikte ilerle. Yurda vardığında aşağıdan haber ver.</p>
    <div className="kv-walking-detail"><Clock3 size={20} /><div><span>Planladığın varış saati</span><strong>{atTime(journey.walk.arrival_due_at)}</strong></div>
      <span className="kv-small-tag">{journey.walk.arrival_check_enabled ? 'Varış kontrolü açık' : 'Varış kontrolü kapalı'}</span></div>
    <p className="kv-field-hint">Canlı konumun izlenmiyor. Varış saati, seçtiğin süreye göre hesaplanır.</p>
    <Action className="kv-primary kv-full" disabled={!!api.busy} busy={api.busy === 'complete'} onClick={api.complete}><CheckCheck size={20} />Yurda vardım</Action>
    <div className="kv-help-area"><div><HeartHandshake size={20} /><strong>Yolda desteğe ihtiyacın olursa</strong></div>
      <Action className="kv-help-button kv-full" disabled={!!api.busy || helpOpen} busy={api.busy === 'help'} onClick={api.requestHelp}>
        <BellRing size={19} />{helpOpen ? 'Destek talebin açık' : 'Yardım iste'}</Action>
      <p className="kv-field-hint">Demo operatörüne talep oluşturur. Resmî güvenliğe veya acil servislere bildirim göndermez.</p>
    </div><HelpStatus assistance={journey.assistance} />
    <NotificationStatus notification={(api.snapshot.notifications ?? []).find((item) => item.incident_id === journey.assistance?.id)} />
  </section>;
}

function SharedPath() {
  return <div className="kv-shared-path" aria-hidden="true">
    <svg viewBox="0 0 480 280" fill="none">
      <defs><pattern id="kv-grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#DCE2E7" /></pattern></defs>
      <rect width="480" height="280" rx="22" fill="url(#kv-grid)" />
      <path d="M50 80C115 80 90 165 187 160M50 210C120 210 110 160 187 160M120 35C170 35 125 160 187 160" stroke="#CBD4DA" strokeWidth="2" strokeDasharray="5 6" />
      <path d="M187 160H250C290 160 274 80 320 80H414" stroke="#F5E3B6" strokeWidth="24" strokeLinecap="round" />
      <path d="M187 160H250C290 160 274 80 320 80H414" stroke="#D39418" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 8" />
      <circle cx="187" cy="160" r="29" fill="white" stroke="#E5B447" strokeWidth="2" />
      <circle cx="187" cy="160" r="8" fill="#E5AA2A" />
      <rect x="389" y="55" width="50" height="50" rx="15" fill="#DDEFE7" stroke="#77A78E" />
      <path d="m402 80 12-10 12 10v14h-24V80Z" stroke="#317454" strokeWidth="2" strokeLinejoin="round" /><path d="M411 94V82h6v12" stroke="#317454" strokeWidth="2" />
      <circle cx="50" cy="80" r="19" fill="#E0E9F4" /><circle cx="120" cy="35" r="19" fill="#EEE5F4" /><circle cx="50" cy="210" r="19" fill="#E0EEE6" />
      {[[50, 80], [120, 35], [50, 210]].map(([x, y]) => <g key={y} stroke="#627488" strokeWidth="1.8"><circle cx={x} cy={y - 4} r="4" /><path d={`M${x - 7} ${y + 8}c0-8 14-8 14 0`} strokeLinecap="round" /></g>)}
      <rect x="247" y="201" width="173" height="37" rx="18.5" fill="white" stroke="#E1E5E8" />
      <circle cx="269" cy="220" r="4" fill="#277A58" /><text x="282" y="224" fill="#526274" fontSize="12" fontFamily="Segoe UI, sans-serif">Aynı yöne, birlikte.</text>
    </svg><span className="kv-path-label kv-path-meeting">Buluşma</span><span className="kv-path-label kv-path-dorm">Yurt</span>
  </div>;
}

function JourneyAside({ journey, stage, catalog, plan, userId, onPreview, onSetup, mapPreview }) {
  const activePlan = journey.walk ?? journey.pod ?? journey.intent;
  return <aside className="kv-aside" aria-label="Yolculuk özeti">
    <div className="kv-aside-heading"><span className="kv-kicker">KAMPÜSTEN YURDA</span><span className="kv-campus-tag"><span /> SAÜ öğrenci pilotu</span></div>
    <h2>{stage === 'walking' ? 'Birlikte yoldasınız.' : stage === 'group' ? 'Aynı yolun arkadaşları.' : 'Bir noktada buluşun.\nYolu paylaşın.'}</h2>
    <p className="kv-aside-intro">{stage === 'walking' ? 'Yürüyüşünü ve destek talebinin durumunu bu ekrandan takip edebilirsin.' : 'Kampüsten yurda dönerken, aynı yöne giden öğrencilerle bir araya gel.'}</p>
    {!mapPreview && journey.walk?.route?.source !== 'GOOGLE_MAPS' ? <SharedPath /> : null}
    <RouteSummary catalog={catalog} meetingId={activePlan?.meeting_point_id ?? plan.meetingId} dormId={activePlan?.destination_dorm_id ?? plan.dormId} />
    <p className="kv-illustration-note">Temsili çizim · Yol tarifi değildir.</p>
    <RoutePreview userId={userId} meetingId={activePlan?.meeting_point_id ?? plan.meetingId} dormId={activePlan?.destination_dorm_id ?? plan.dormId}
      walkRoute={journey.walk?.route} onPreview={onPreview} onSetup={onSetup} />
    {stage === 'walking' && journey.pod ? <div className="kv-aside-members"><span className="kv-kicker">YOL ARKADAŞLARIN</span><MemberList pod={journey.pod} userId={userId} /></div> : null}
    <div className="kv-pilot-note"><ShieldCheck size={21} /><p><strong>Kız öğrenciler için planlandı.</strong>Bu pilotta dört yurt ve kampüs içindeki belirlenmiş buluşma noktaları yer alıyor.</p></div>
  </aside>;
}

export default function StudentApp() {
  const api = useStudentJourney();
  const [plan, setPlan] = useState({ meetingId: 'meet_library', dormId: 'dorm_sabahattin_zaim', departureAt: '' });
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoTab, setDemoTab] = useState('journey');
  const [mapPreview, setMapPreview] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [resumeSearch, setResumeSearch] = useState(false);
  const [arrivalCheck, setArrivalCheck] = useState(false);
  const [duration, setDuration] = useState(15);
  const [dismissedCompletion, setDismissedCompletion] = useState(null);
  const [now, setNow] = useState(Date.now());
  const journey = selectJourney(api.snapshot, now);
  const stage = journey.stage === 'complete' && dismissedCompletion === journey.completed.id ? 'plan' : journey.stage;
  const user = api.snapshot.user;
  const allowed = !user || membershipAllowed(user, now);
  const receivePreview = useCallback((preview) => {
    setMapPreview(preview);
    if (preview) setDuration(Math.min(120, Math.max(1, Math.ceil(preview.duration_seconds / 60))));
  }, []);
  const openDemo = (tab = 'journey') => { api.clearError(); setDemoTab(tab); setDemoOpen(true); };

  useEffect(() => {
    document.title = 'Kovan · Birlikte, yurda.';
    document.documentElement.classList.remove('dark');
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const closeLogin = () => { if (api.busy !== 'login') { setLoginOpen(false); setAccessCode(''); setResumeSearch(false); } };
  const search = () => {
    if (!user) { api.clearError(); setResumeSearch(true); setLoginOpen(true); return; }
    api.search(plan);
  };
  const submitLogin = async (event) => {
    event.preventDefault();
    const shouldSearch = resumeSearch;
    if (await api.login(accessCode)) {
      setAccessCode(''); setLoginOpen(false); setResumeSearch(false);
      if (shouldSearch) await api.search(plan);
    }
  };

  return <div className="kv-app">
    <a className="kv-skip" href="#journey-main">Yolculuk planına geç</a>
    <header className="kv-header"><div className="kv-header-inner">
      <a href="/" className="kv-brand" aria-label="Kovan ana sayfa"><span className="kv-brand-mark"><Hexagon size={27} strokeWidth={2.3} /><Footprints size={13} /></span><span>Kovan<span className="kv-brand-dot">.</span></span></a>
      <span className="kv-brand-caption">Birlikte, yurda.</span>
      <nav aria-label="Ana menü"><button className="kv-nav-link" onClick={() => setHowOpen(true)}>Nasıl çalışır?</button>
        {user ? <a className="kv-nav-link kv-help-nav" href="#personal-help"><HeartHandshake size={16} />Yardım</a> : null}
        {user ? <button className="kv-account" onClick={api.logout} disabled={!!api.busy} aria-label={`${user.display_name}, çıkış yap`}><span className="kv-account-avatar">S</span><span>{user.display_name}</span><LogOut size={16} /></button>
          : <button className="kv-login-button" onClick={() => { api.clearError(); setLoginOpen(true); }} disabled={api.loading}><LogIn size={17} /> Giriş yap</button>}
      </nav>
    </div></header>
    <main id="journey-main" className="kv-main">
      <div className="kv-intro"><div><span className="kv-eyebrow"><span /> SAKARYA ÜNİVERSİTESİ</span>
        <h1>{stage === 'walking' ? 'Yurda giden yolu paylaş.' : stage === 'complete' ? 'Birlikte geldiniz, iyi dinlenmeler.' : 'Yurda dönüşü birlikte planlayalım.'}</h1>
        <p>{stage === 'plan' ? 'Buluşma noktanı seç, aynı yurda gidenlerle yol arkadaşı ol.' : stage === 'complete' ? 'Varışın kaydedildi. Yeni bir yolculukta yeniden buluşuruz.' : 'Planın, grubun ve yürüyüşün tek bir yerde.'}</p></div>
        {api.capabilities.local_demo_controls && user ? <button className="kv-demo-label kv-demo-trigger" onClick={() => openDemo()}><Wrench size={13} />Demo kontrolü</button> : <span className="kv-demo-label">Pilot demo</span>}
      </div>
      <Progress stage={stage} />
      {api.error && !loginOpen ? <div className="kv-error" role="alert"><CircleHelp size={21} /><p>{api.error}</p><button aria-label="Uyarıyı kapat" onClick={api.clearError}><X size={18} /></button></div> : null}
      {user && !allowed ? <div className="kv-membership-note" role="status"><ShieldCheck size={21} /><div><strong>{user.membership?.status === 'PENDING_REVIEW' ? 'Üyelik incelemen devam ediyor.' : 'Pilot erişiminin yenilenmesi gerekiyor.'}</strong><p>Grup bulma ve yürüyüş başlatma, uygunluk onayından sonra açılır.</p></div></div> : null}
      {user && api.connection !== 'online' ? <div className="kv-connection" role="status"><RefreshCw size={15} /><span>Canlı bağlantı yenileniyor. Son doğrulanan bilgileri görüyorsun.</span><button onClick={api.refresh} disabled={!!api.busy}>Yenile</button></div> : null}
      <div className="kv-workspace"><div className="kv-main-card" aria-busy={!!api.busy}>
        {stage === 'plan' ? <PlanForm catalog={api.catalog} plan={plan} setPlan={setPlan} onSearch={search} busy={api.busy} disabled={!!api.busy} approved={allowed} loading={api.loading} now={now} /> : null}
        {stage === 'waiting' ? <Waiting journey={journey} catalog={api.catalog} api={api} now={now} /> : null}
        {stage === 'group' ? <Group journey={journey} userId={user.id} api={api} now={now} arrivalCheck={arrivalCheck} setArrivalCheck={setArrivalCheck} duration={duration} setDuration={setDuration} mapPreview={mapPreview} /> : null}
        {stage === 'walking' ? <Walking journey={journey} api={api} /> : null}
        {stage === 'complete' ? <section className="kv-state-panel kv-complete"><span className="kv-state-icon is-green"><CheckCheck size={31} /></span><span className="kv-kicker">VARIŞIN KAYDEDİLDİ</span><h2>Yurda vardın.</h2><p>Bu yürüyüşün tamamlandı. Yol arkadaşların kendi varışlarını ayrıca onaylayacak.</p>
          <RouteSummary catalog={api.catalog} meetingId={journey.completed.meeting_point_id} dormId={journey.completed.destination_dorm_id} compact />
          <HelpStatus assistance={journey.assistance} />
          {journey.assistance && !['RESOLVED', 'CANCELLED'].includes(journey.assistance.status) ? <p className="kv-field-hint">Yürüyüşü tamamlamak açık destek talebini kapatmaz.</p> : null}
          <Action className="kv-primary kv-full" onClick={() => setDismissedCompletion(journey.completed.id)}>Yeni yolculuk planla<ArrowRight size={18} /></Action></section> : null}
      </div><JourneyAside journey={journey} stage={stage} catalog={api.catalog} plan={plan} userId={user?.id} onPreview={receivePreview}
        onSetup={api.capabilities.local_demo_controls ? () => openDemo('setup') : null} mapPreview={mapPreview} /></div>
      {user ? <SafetyCenter api={api} allowed={allowed} /> : null}
      <div className="kv-how-strip"><span><MapPin size={19} /><strong>Bir noktada buluş</strong></span><ArrowRight size={16} /><span><UsersRound size={19} /><strong>Grubuna katıl</strong></span><ArrowRight size={16} /><span><Footprints size={19} /><strong>Yolu birlikte paylaş</strong></span></div>
    </main>
    <footer className="kv-footer"><div><span className="kv-footer-logo"><Hexagon size={16} /> Kovan</span><p>Üyelikler pilot demoya aittir. Harita ve WhatsApp, servis ayarlarına bağlıdır. Sürekli konum takibi veya resmî güvenlik bağlantısı yoktur.</p></div>
      <a href="/demo">Demo yönetimi<ArrowUpRight size={13} /></a></footer>
    {user && api.capabilities.local_demo_controls ? <DemoPanel open={demoOpen} onClose={() => setDemoOpen(false)} api={api} initialTab={demoTab} /> : null}
    <Modal id="login" open={loginOpen} onClose={closeLogin} title="Kovan’a hoş geldin">
      <p className="kv-modal-copy">Yolculuğunu planlamak için öğrenci erişim kodunla giriş yap.</p>
      <form onSubmit={submitLogin} className="kv-login-form"><label htmlFor="student-access-code">Pilot erişim kodun</label>
        <input id="student-access-code" type="password" autoComplete="off" required minLength={12} value={accessCode}
          onChange={(event) => setAccessCode(event.target.value)} placeholder="Erişim kodunu gir" disabled={api.busy === 'login'} />
        {api.error ? <p className="kv-login-error" role="alert">{api.error}</p> : null}
        <Action type="submit" className="kv-primary kv-full" busy={api.busy === 'login'} disabled={!!api.busy || accessCode.trim().length < 12}>Giriş yap ve devam et<ArrowRight size={17} /></Action>
      </form><p className="kv-field-hint">Bu sürümde önceden oluşturulmuş demo öğrenci hesapları kullanılır. Erişim kodun bu sayfada saklanmaz.</p>
    </Modal>
    <Modal id="how" open={howOpen} onClose={() => setHowOpen(false)} title="Birlikte dönmek için üç adım">
      <ol className="kv-explainer"><li><MapPin /><div><strong>Planını seç</strong><p>Buluşma noktanı, varış yurdunu ve çıkış saatini belirle.</p></div></li><li><UsersRound /><div><strong>Grubuna katıl</strong><p>Aynı aralıkta aynı yöne giden 3–5 kişilik grubunda herkes kendi katılımını onaylar.</p></div></li><li><Footprints /><div><strong>Birlikte yürü</strong><p>Buluştuğunuzda yürüyüşünü başlat. Varınca haber ver; ihtiyaç duyarsan demo destek talebi oluştur.</p></div></li></ol>
      <p className="kv-inline-note">Pilot yalnızca listelenen kız yurtları ve kampüs buluşma noktaları içindir. Bu demo gerçek güvenlik hizmeti sunmaz.</p>
      <Action className="kv-primary kv-full" onClick={() => setHowOpen(false)}>Planımı seçeyim<ArrowRight size={17} /></Action>
    </Modal>
  </div>;
}
