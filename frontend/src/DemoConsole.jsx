import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Shield,
  Users,
  Route,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Terminal,
  Lock,
  Radio,
  Play,
  UserCheck,
  XCircle,
  Footprints,
  HelpCircle,
  Layers,
  Server,
  Eye,
  Sliders,
  ArrowRight,
  Check,
  AlertOctagon,
  Sparkles,
  Wifi,
  WifiOff,
  FileCode
} from 'lucide-react';
import { normalizeCatalog, normalizeEdges, normalizeSnapshot, redactSensitive } from './api/backendAdapter.mjs';

// ============================================================================
// SABİT PİLOT KATALOĞU (Başka ID gönderilirse API 422 döner)
// Çevrimdışı şema koordinatsızdır; canlı katalog kaynaklı harita pinlerini sağlar.
// ============================================================================
const MEETING_POINTS = [
  { id: 'meet_library', label: 'SAÜ Kütüphanesi', coordinates: null, zone: 'pilot_origin' },
  { id: 'meet_adibahce', label: 'Kampüs Adıbahçe', coordinates: null, zone: 'pilot_origin' },
  { id: 'meet_campus_gate', label: 'Kampüs girişi', coordinates: null, zone: 'pilot_origin' },
  { id: 'meet_final_stop', label: 'Son durak', coordinates: null, zone: 'pilot_origin' },
];

const DESTINATION_DORMS = [
  { id: 'dorm_esentepe', label: 'Esentepe Öğrenci Yurdu', coordinates: null, zone: 'pilot_dest' },
  { id: 'dorm_sabahattin_zaim', label: 'Sabahattin Zaim Yurdu', coordinates: null, zone: 'pilot_dest' },
  { id: 'dorm_rahime_sultan', label: 'Rahime Sultan Yurdu', coordinates: null, zone: 'pilot_dest' },
  { id: 'dorm_ayse_humeyra_okten', label: 'Ayşe Hümeyra Ökten Yurdu', coordinates: null, zone: 'pilot_dest' },
];

const DEMO_ACCOUNTS = [
  { id: 'presenter', role: 'presenter', label: 'presenter (Sunucu / Demo Kontrol)', badge: 'Sahne & Topoloji Kontrolü' },
  { id: 'student-01', role: 'student', label: 'student-01 (Demo uygunluk onayı)', badge: 'DEMO_TEST Onaylı' },
  { id: 'student-02', role: 'student', label: 'student-02 (Demo uygunluk onayı)', badge: 'DEMO_TEST Onaylı' },
  { id: 'student-03', role: 'student', label: 'student-03 (Demo uygunluk onayı)', badge: 'DEMO_TEST Onaylı' },
  { id: 'student-pending', role: 'student_pending', label: 'student-pending (Onay Bekliyor)', badge: 'Başvuru İncelemede' },
  { id: 'reviewer', role: 'reviewer', label: 'reviewer (Uygunluk İnceleyici)', badge: 'Üyelik Onay Yetkisi' },
  { id: 'operator', role: 'operator', label: 'operator (Masa Operatörü)', badge: 'ACK / Atama / Çözüm' },
  { id: 'guard-01', role: 'guard', label: 'guard-01 (Saha Görevlisi 1)', badge: 'Saha Birimi' },
  { id: 'guard-02', role: 'guard', label: 'guard-02 (Saha Görevlisi 2)', badge: 'Saha Birimi' },
];

// Sentetik Şematik Topoloji Kenarları (SYNTHETIC_SCHEMATIC - Gerçek harita koordinatı değildir)
const INITIAL_SYNTHETIC_EDGES = [
  { id: 'edge_lib_plaza', from: 'meet_library', to: 'node_central_plaza', distance_m: 180, lighting_weight: 1.0, closed: false, label: 'Kütüphane – Merkez Koridor (Aydınlatma Öncelikli)' },
  { id: 'edge_lib_shortcut', from: 'meet_library', to: 'node_west_pass', distance_m: 140, lighting_weight: 2.35, closed: false, label: 'Kütüphane – Batı Kısa Geçit (Kısa / Düşük Aydınlatma Ağırlıklı)' },
  { id: 'edge_adibahce_plaza', from: 'meet_adibahce', to: 'node_central_plaza', distance_m: 150, lighting_weight: 1.05, closed: false, label: 'Kampüs Adıbahçe – Merkez Koridor' },
  { id: 'edge_gate_plaza', from: 'meet_campus_gate', to: 'node_central_plaza', distance_m: 210, lighting_weight: 1.1, closed: false, label: 'Ana Kapı – Merkez Koridor' },
  { id: 'edge_final_stop_plaza', from: 'meet_final_stop', to: 'node_central_plaza', distance_m: 165, lighting_weight: 1.15, closed: false, label: 'Son durak – Merkez Koridor' },
  { id: 'edge_plaza_east_lit', from: 'node_central_plaza', to: 'node_dorm_hub', distance_m: 260, lighting_weight: 1.0, closed: false, label: 'Merkez – Yurtlar Aydınlık Bulvarı' },
  { id: 'edge_west_shortcut', from: 'node_west_pass', to: 'node_dorm_hub', distance_m: 170, lighting_weight: 2.45, closed: false, label: 'Batı Geçit – Yurtlar Kestirmesi' },
  { id: 'edge_hub_esentepe', from: 'node_dorm_hub', to: 'dorm_esentepe', distance_m: 190, lighting_weight: 1.05, closed: false, label: 'Yurt Kavşağı – Esentepe Yurdu' },
  { id: 'edge_hub_zaim', from: 'node_dorm_hub', to: 'dorm_sabahattin_zaim', distance_m: 220, lighting_weight: 1.1, closed: false, label: 'Yurt Kavşağı – Sabahattin Zaim Yurdu' },
  { id: 'edge_hub_rahime', from: 'node_dorm_hub', to: 'dorm_rahime_sultan', distance_m: 240, lighting_weight: 1.12, closed: false, label: 'Yurt Kavşağı – Rahime Sultan Yurdu' },
  { id: 'edge_hub_okten', from: 'node_dorm_hub', to: 'dorm_ayse_humeyra_okten', distance_m: 255, lighting_weight: 1.15, closed: false, label: 'Yurt Kavşağı – Ayşe Hümeyra Ökten Yurdu' },
];

// Soyut topoloji düğümlerinin SVG şematik pozisyonları (Coğrafi koordinat DEĞİLDİR)
const SCHEMATIC_NODE_POSITIONS = {
  meet_library: { x: 95, y: 65, title: 'meet_library', kind: 'origin' },
  meet_adibahce: { x: 95, y: 145, title: 'meet_adibahce', kind: 'origin' },
  meet_campus_gate: { x: 95, y: 225, title: 'meet_campus_gate', kind: 'origin' },
  meet_final_stop: { x: 95, y: 305, title: 'meet_final_stop', kind: 'origin' },
  junction: { x: 310, y: 200, title: 'Ortak kavşak', kind: 'junction' },
  'lit-junction': { x: 535, y: 155, title: 'Aydınlatma öncelikli kavşak', kind: 'junction' },
  node_west_pass: { x: 310, y: 75, title: 'node_west_pass', kind: 'junction' },
  node_central_plaza: { x: 310, y: 215, title: 'node_central_plaza', kind: 'junction' },
  node_dorm_hub: { x: 535, y: 155, title: 'node_dorm_hub', kind: 'junction' },
  dorm_esentepe: { x: 745, y: 65, title: 'dorm_esentepe', kind: 'dest' },
  dorm_sabahattin_zaim: { x: 745, y: 145, title: 'dorm_sabahattin_zaim', kind: 'dest' },
  dorm_rahime_sultan: { x: 745, y: 225, title: 'dorm_rahime_sultan', kind: 'dest' },
  dorm_ayse_humeyra_okten: { x: 745, y: 305, title: 'dorm_ayse_humeyra_okten', kind: 'dest' },
};

// Sentetik rota hesaplayıcı (Yerel sözleşme simülatörü için)
function computeSyntheticRoutes(edges, meetingPointId, destinationDormId) {
  const validStart = MEETING_POINTS.some((m) => m.id === meetingPointId);
  const validEnd = DESTINATION_DORMS.some((d) => d.id === destinationDormId);
  if (!validStart || !validEnd) {
    return {
      error: {
        status: 422,
        code: 'UNPROCESSABLE_PILOT_POINT',
        message: 'Sabit pilot kapsamı dışında başlangıç veya varış kimliği gönderildi (422).',
        details: { meeting_point_id: meetingPointId, destination_dorm_id: destinationDormId },
      },
    };
  }

  const openEdges = edges.filter((e) => !e.closed);
  const adj = {};
  openEdges.forEach((e) => {
    if (!adj[e.from]) adj[e.from] = [];
    if (!adj[e.to]) adj[e.to] = [];
    adj[e.from].push({ to: e.to, edge: e });
    adj[e.to].push({ to: e.from, edge: e });
  });

  function findBestPath(mode) {
    const dist = {};
    const prev = {};
    const visited = new Set();
    const nodes = Object.keys(SCHEMATIC_NODE_POSITIONS);
    nodes.forEach((n) => (dist[n] = Infinity));
    dist[meetingPointId] = 0;

    while (visited.size < nodes.length) {
      let u = null;
      let best = Infinity;
      for (const n of nodes) {
        if (!visited.has(n) && dist[n] < best) {
          best = dist[n];
          u = n;
        }
      }
      if (u === null || u === destinationDormId) break;
      visited.add(u);

      for (const neighbor of adj[u] || []) {
        if (visited.has(neighbor.to)) continue;
        const e = neighbor.edge;
        const stepCost =
          mode === 'shortest'
            ? e.distance_m
            : Math.round(e.distance_m * e.lighting_weight);
        const alt = dist[u] + stepCost;
        if (alt < dist[neighbor.to]) {
          dist[neighbor.to] = alt;
          prev[neighbor.to] = { node: u, edge: e };
        }
      }
    }

    if (!prev[destinationDormId]) return null;
    const edgeIds = [];
    let totalDistance = 0;
    let totalWeighted = 0;
    let cur = destinationDormId;
    while (cur !== meetingPointId) {
      const step = prev[cur];
      if (!step) return null;
      edgeIds.unshift(step.edge.id);
      totalDistance += step.edge.distance_m;
      totalWeighted += Math.round(step.edge.distance_m * step.edge.lighting_weight);
      cur = step.node;
    }

    return {
      mode,
      label: 'SYNTHETIC_SCHEMATIC',
      edge_ids: edgeIds,
      distance_m: totalDistance,
      weighted_cost: totalWeighted,
      geometry: null,
    };
  }

  const shortest = findBestPath('shortest');
  const lightingFirst = findBestPath('lighting_first');

  if (!shortest || !lightingFirst) {
    return {
      error: {
        status: 409,
        code: 'NO_ROUTE',
        message: 'Seçilen başlangıç ve varış arasında açık kenarlarla geçerli bir rota kalmadı (409 NO_ROUTE).',
        details: { meeting_point_id: meetingPointId, destination_dorm_id: destinationDormId },
      },
    };
  }

  return {
    data: {
      label: 'SYNTHETIC_SCHEMATIC',
      meeting_point_id: meetingPointId,
      destination_dorm_id: destinationDormId,
      coordinates: null,
      shortest,
      lighting_first: lightingFirst,
    },
  };
}

export default function App() {
  // Yerel simülatör sunum provası içindir; canlı mod sunucu durumunu kullanır.
  const [connectionMode, setConnectionMode] = useState('live');
  const [wsConnected, setWsConnected] = useState(false);

  // Aktif oturum ve erişim kodu
  const [activeAccount, setActiveAccount] = useState('presenter');
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [sessionCookieActive, setSessionCookieActive] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('presenter');
  const [liveUser, setLiveUser] = useState(null);
  const [meetingCatalog, setMeetingCatalog] = useState(MEETING_POINTS);
  const [dormCatalog, setDormCatalog] = useState(DESTINATION_DORMS);
  const sessionCodesRef = useRef({});

  // Global zarf (Envelope) durumu
  const [revision, setRevision] = useState(1);
  const [runId, setRunId] = useState('run-argon-pilot-2026');
  const [serverTime, setServerTime] = useState(() => new Date().toISOString());
  const [lastEnvelope, setLastEnvelope] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [apiLogs, setApiLogs] = useState([]);

  // Sabit Pilot Seçimleri
  const [selectedMeetingPoint, setSelectedMeetingPoint] = useState('meet_library');
  const [selectedDorm, setSelectedDorm] = useState('dorm_esentepe');
  const [resetStudentCount, setResetStudentCount] = useState(3);

  // Sentetik Sahne Durumu (Local Contract Engine & Live State)
  const [edges, setEdges] = useState([]);
  const [departureIntents, setDepartureIntents] = useState([]);

  const [pod, setPod] = useState(null);
  const [podNullReason, setPodNullReason] = useState(null);

  // Yürüyüş (Walks) durumu: her üye için ayrı veya grup bazlı
  const [walks, setWalks] = useState([]);
  const [arrivalCheckEnabled, setArrivalCheckEnabled] = useState(true);
  const [estimatedDurationSeconds, setEstimatedDurationSeconds] = useState(900);

  // Yardım / Destek (Assistances) durumu
  const [assistances, setAssistances] = useState([]);
  const [idempotencyKeyInput, setIdempotencyKeyInput] = useState('idem-walk-help-001');
  const [selectedUnitId, setSelectedUnitId] = useState('guard-01');
  const [escalationSimulation, setEscalationSimulation] = useState('NONE');

  // student-pending üyelik inceleme durumu
  const [pendingMembership, setPendingMembership] = useState({
    user_id: 'student-pending',
    version: 1,
    status: 'NOT_VISIBLE',
    decision: null,
    method: null,
    student_eligibility_checked: false,
    women_student_eligibility_checked: false,
    verified_dorm_id: null,
    display_badge: 'Başvuru bilgisi için yetkili demo oturumu açın',
  });

  const [reviewForm, setReviewForm] = useState({
    decision: 'APPROVED_PILOT',
    method: 'DEMO_TEST',
    student_eligibility_checked: true,
    women_student_eligibility_checked: true,
    verified_dorm_id: 'dorm_esentepe',
  });

  // Rota Deneyi Sonucu
  const [routeExperiment, setRouteExperiment] = useState(null);

  // 422 Test Tetikleyicisi için Özel Alan
  const [customInvalidPointTest, setCustomInvalidPointTest] = useState(false);

  const wsRef = useRef(null);

  // Zarf (Envelope) oluşturucu ve loglayıcı
  const recordEnvelope = (method, endpoint, reqBody, dataPayload, errorPayload = null, httpStatus = 200) => {
    const nextRev = connectionMode === 'live' ? revision : revision + 1;
    const nowIso = new Date().toISOString();
    setRevision(nextRev);
    setServerTime(nowIso);

    if (errorPayload) {
      setLastError({ status: httpStatus, ...errorPayload });
      const errEnv = {
        status: httpStatus,
        error: errorPayload,
      };
      setLastEnvelope(errEnv);
      setApiLogs((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          time: nowIso.slice(11, 19),
          actor: activeAccount,
          method,
          endpoint,
          status: httpStatus,
          reqBody: redactSensitive(reqBody),
          response: errorPayload,
          isError: true,
        },
        ...prev.slice(0, 29),
      ]);
      return errEnv;
    }

    setLastError(null);
    const envelope = {
      revision: nextRev,
      server_time: nowIso,
      run_id: runId,
      environment: 'demo',
      data: dataPayload,
    };
    setLastEnvelope(envelope);
    setApiLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        time: nowIso.slice(11, 19),
        actor: activeAccount,
        method,
        endpoint,
        status: httpStatus,
        reqBody: redactSensitive(reqBody),
        response: envelope,
        isError: false,
      },
      ...prev.slice(0, 29),
    ]);
    return envelope;
  };

  const publishMetadata = (envelope) => {
    if (envelope.revision !== undefined) setRevision(envelope.revision);
    if (envelope.run_id) setRunId(envelope.run_id);
    if (envelope.server_time) setServerTime(envelope.server_time);
  };

  const applyBackendState = (snapshot) => {
    const view = normalizeSnapshot(snapshot);
    if (view.user) {
      setLiveUser(view.user);
      setActiveAccount(view.user.id);
    }
    setDepartureIntents(view.intents);
    setPod(view.pod);
    setWalks(view.walks);
    setAssistances(view.assistances);
    setPendingMembership(view.pendingMembership ?? {
      user_id: 'student-pending', version: 1, status: 'NOT_VISIBLE',
      display_badge: 'Bu oturumda başvuru bilgisi paylaşılmıyor',
    });
    setEdges((previous) => previous.map((edge) => ({ ...edge, closed: view.closedEdges.includes(edge.id) })));
  };

  const fetchLive = async (method, endpoint, body) => {
    const response = await fetch(endpoint, {
      method, credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    let envelope;
    try { envelope = await response.json(); }
    catch { throw new Error(`Sunucu okunabilir yanıt vermedi (HTTP ${response.status}).`); }
    if (!response.ok) {
      const error = new Error(envelope.message || 'İstek tamamlanamadı.');
      error.payload = envelope;
      error.status = response.status;
      throw error;
    }
    return { envelope, status: response.status };
  };

  const refreshLiveState = async () => {
    const { envelope } = await fetchLive('GET', '/api/state');
    publishMetadata(envelope);
    applyBackendState(envelope.data);
    return envelope.data;
  };

  const readLiveRoutes = async (meeting, dorm) => {
    const { envelope } = await fetchLive('GET', `/api/routes?meeting_point_id=${encodeURIComponent(meeting)}&destination_dorm_id=${encodeURIComponent(dorm)}`);
    setRouteExperiment(envelope.data);
    publishMetadata(envelope);
  };

  const callBackendOrSimulate = async (method, endpoint, bodyObj, simulatorFn) => {
    if (connectionMode !== 'live') return simulatorFn();
    try {
      const { envelope: json, status } = await fetchLive(method, endpoint, bodyObj);
      publishMetadata(json);
      setLastError(null);
      setLastEnvelope(json);
      setApiLogs((previous) => [{
        id: `${Date.now()}-${Math.random()}`, time: new Date().toISOString().slice(11, 19),
        actor: json.data?.user?.id ?? activeAccount, method, endpoint, status,
        reqBody: redactSensitive(bodyObj), response: json, isError: false,
      }, ...previous.slice(0, 29)]);
      if (endpoint === '/api/bootstrap') {
        const nextCatalog = normalizeCatalog(json.data.catalog);
        setMeetingCatalog(nextCatalog.meetings);
        setDormCatalog(nextCatalog.dorms);
        setEdges(normalizeEdges(json.data.edges));
        setLiveUser(json.data.user);
        setActiveAccount(json.data.user.id);
      } else if (endpoint === '/api/state') {
        applyBackendState(json.data);
      } else if (endpoint.startsWith('/api/routes?')) {
        setRouteExperiment(json.data);
      }
      if (method === 'POST' && !endpoint.startsWith('/api/auth/')) {
        const snapshot = await refreshLiveState();
        if (endpoint === '/api/matches/preview') {
          setPodNullReason(json.data.pod ? null : 'Uyumlu en az üç onaylı öğrenci için ortak ayrılış aralığı bulunamadı.');
          if (json.data.pod) {
            setSelectedMeetingPoint(json.data.pod.meeting_point_id);
            setSelectedDorm(json.data.pod.destination_dorm_id);
            await readLiveRoutes(json.data.pod.meeting_point_id, json.data.pod.destination_dorm_id);
          }
        }
        if (endpoint === '/api/demo/reset') {
          setPodNullReason(null);
          const first = snapshot.intents[0];
          const meeting = first?.meeting_point_id ?? selectedMeetingPoint;
          const dorm = first?.destination_dorm_id ?? selectedDorm;
          setSelectedMeetingPoint(meeting);
          setSelectedDorm(dorm);
          await readLiveRoutes(meeting, dorm);
        } else if (endpoint.startsWith('/api/demo/edges/')) {
          await readLiveRoutes(selectedMeetingPoint, selectedDorm);
        }
      }
      return { ok: true, data: json.data, raw: json };
    } catch (error) {
      const payload = error.payload ?? { code: 'BACKEND_UNREACHABLE', message: error.message, details: {} };
      if (error.status === 401) setSessionCookieActive(false);
      if (payload.code === 'NO_ROUTE') setRouteExperiment(null);
      recordEnvelope(method, endpoint, redactSensitive(bodyObj), null, payload, error.status ?? 503);
      return { ok: false, error: payload };
    }
  };

  useEffect(() => {
    setWsConnected(false);
    setPod(null); setWalks([]); setAssistances([]); setPodNullReason(null); setLastError(null);
    if (connectionMode === 'live') {
      setSessionCookieActive(false); setLiveUser(null);
      setDepartureIntents([]); setEdges([]); setRouteExperiment(null);
      setPendingMembership({ user_id: 'student-pending', version: 1, status: 'NOT_VISIBLE', display_badge: 'Başvuru bilgisi için yetkili demo oturumu açın' });
    } else {
      setSessionCookieActive(true);
      setMeetingCatalog(MEETING_POINTS); setDormCatalog(DESTINATION_DORMS);
      setEdges(INITIAL_SYNTHETIC_EDGES);
      setDepartureIntents(Array.from({ length: 3 }, (_, i) => ({ student_id: `student-0${i + 1}`, meeting_point_id: 'meet_library', destination_dorm_id: 'dorm_esentepe' })));
      setRouteExperiment(computeSyntheticRoutes(INITIAL_SYNTHETIC_EDGES, 'meet_library', 'dorm_esentepe').data);
      setSelectedAccount(activeAccount);
      setPendingMembership({ user_id: 'student-pending', version: 1, status: 'PENDING_REVIEW', display_badge: 'Onay Bekliyor (Sentetik Başvuru)' });
      setSelectedMeetingPoint('meet_library'); setSelectedDorm('dorm_esentepe');
    }
  }, [connectionMode]);

  useEffect(() => {
    if (connectionMode !== 'live' || !sessionCookieActive) return;
    let stopped = false;
    let retryTimer;
    let socket;
    let retryDelay = 1000;
    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/events`);
      wsRef.current = socket;
      socket.onopen = () => { if (!stopped) { setWsConnected(true); retryDelay = 1000; } };
      socket.onmessage = (event) => {
        if (stopped) return;
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'state.snapshot') {
            publishMetadata(message); applyBackendState(message.data);
          }
        } catch { /* Ignore malformed transport frames; REST remains authoritative. */ }
      };
      socket.onclose = () => {
        if (stopped) return;
        setWsConnected(false);
        retryTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(8000, retryDelay * 2);
      };
    };
    connect();
    const poll = setInterval(() => {
      if (!stopped && (!socket || socket.readyState !== WebSocket.OPEN)) {
        refreshLiveState().catch((error) => {
          if (error.status === 401) setSessionCookieActive(false);
        });
      }
    }, 3000);
    return () => { stopped = true; clearTimeout(retryTimer); clearInterval(poll); socket?.close(); setWsConnected(false); };
  }, [connectionMode, sessionCookieActive, activeAccount]);

  // ============================================================================
  // ENDPOINT İŞLEYİCİLERİ (Sözleşmeye %100 Uyumlu)
  // ============================================================================

  // 1. POST /api/auth/demo-session
  const handleStartDemoSession = async (targetAccount = selectedAccount, savedCode = null) => {
    const accessCode = savedCode ?? accessCodeInput.trim();
    if (connectionMode === 'live' && !accessCode) {
      setSelectedAccount(targetAccount);
      setLastError({ status: 401, code: 'ACCESS_CODE_REQUIRED', message: `${targetAccount} hesabının yerel demo erişim kodunu girin.` });
      return;
    }
    if (connectionMode === 'live') setSessionCookieActive(false);
    const reqBody = { access_code: accessCode || `<demo:${targetAccount}>` };
    const result = await callBackendOrSimulate('POST', '/api/auth/demo-session', reqBody, () => {
      setActiveAccount(targetAccount); setSelectedAccount(targetAccount); setSessionCookieActive(true);
      return recordEnvelope('POST', '/api/auth/demo-session', redactSensitive(reqBody), { session: { user_id: targetAccount, cookie_set: true } });
    });
    if (connectionMode === 'live' && result.ok) {
      const user = result.data.user;
      sessionCodesRef.current[user.id] = accessCode;
      setSelectedAccount(user.id); setActiveAccount(user.id); setLiveUser(user);
      setAccessCodeInput('');
      const bootstrap = await callBackendOrSimulate('GET', '/api/bootstrap', null, () => null);
      if (!bootstrap.ok) return;
      try {
        const snapshot = await refreshLiveState();
        const ownPod = snapshot.pods?.find((item) => item.member_ids.includes(user.id));
        const ownIntent = snapshot.intents?.find((item) => item.owner_id === user.id) ?? snapshot.intents?.[0];
        const meeting = ownPod?.meeting_point_id ?? ownIntent?.meeting_point_id ?? selectedMeetingPoint;
        const dorm = ownPod?.destination_dorm_id ?? ownIntent?.destination_dorm_id ?? selectedDorm;
        setSelectedMeetingPoint(meeting); setSelectedDorm(dorm);
        setSessionCookieActive(true);
        try { await readLiveRoutes(meeting, dorm); }
        catch (error) { setRouteExperiment(null); setLastError({ status: error.status, ...error.payload }); }
      } catch (error) {
        setLastError({ status: error.status ?? 503, code: 'STATE_LOAD_FAILED', message: error.message });
      }
    }
  };

  const handleSelectAccount = async (accountId) => {
    setSelectedAccount(accountId); setAccessCodeInput('');
    if (connectionMode === 'simulator') return handleStartDemoSession(accountId);
    const saved = sessionCodesRef.current[accountId];
    if (saved) await handleStartDemoSession(accountId, saved);
  };

  // 2. GET /api/bootstrap & GET /api/state
  const handleFetchBootstrapAndState = async (endpoint = '/api/state') => {
    if (connectionMode === 'live') {
      const result = await callBackendOrSimulate('GET', endpoint, null, () => null);
      if (result.ok && endpoint === '/api/bootstrap') {
        try { await refreshLiveState(); }
        catch (error) { setLastError({ status: error.status ?? 503, code: 'STATE_LOAD_FAILED', message: error.message }); }
      }
      return;
    }
    await callBackendOrSimulate('GET', endpoint, null, () => {
      const acctObj = DEMO_ACCOUNTS.find((a) => a.id === activeAccount) || DEMO_ACCOUNTS[0];
      if (endpoint === '/api/bootstrap') {
        return recordEnvelope('GET', '/api/bootstrap', null, {
          user: {
            id: acctObj.id,
            role: acctObj.role,
            verification_note: 'Demo uygunluk onayı (Gerçek SAÜ onay yöntemi kararlaştırılmadı)',
          },
          catalog: {
            meeting_points: MEETING_POINTS,
            destination_dorms: DESTINATION_DORMS,
            network_label: 'SYNTHETIC_SCHEMATIC',
            coordinates: null,
          },
          links: {
            state: '/api/state',
            events_ws: '/api/events',
            routes: `/api/routes?meeting_point_id=${selectedMeetingPoint}&destination_dorm_id=${selectedDorm}`,
          },
        });
      }
      // Role-scoped GET /api/state
      return recordEnvelope('GET', '/api/state', null, {
        scope_role: acctObj.role,
        active_user_id: acctObj.id,
        departure_intents: departureIntents,
        pod,
        walks,
        assistances,
        pending_membership:
          acctObj.role === 'reviewer' || acctObj.id === 'student-pending' || acctObj.role === 'presenter'
            ? pendingMembership
            : undefined,
      });
    });
  };

  // 3. POST /api/demo/reset {student_count} (Presenter)
  const handleDemoReset = async (countOverride) => {
    const count = Number(countOverride ?? resetStudentCount);
    const reqBody = { student_count: count };
    await callBackendOrSimulate('POST', '/api/demo/reset', reqBody, () => {
      if (count < 1 || count > 60) {
        return recordEnvelope(
          'POST',
          '/api/demo/reset',
          redactSensitive(reqBody),
          null,
          {
            code: 'INVALID_STUDENT_COUNT',
            message: 'student_count 1 ile 60 arasında olmalıdır (student-01…student-60).',
            details: { student_count: count },
          },
          422
        );
      }
      const newIntents = Array.from({ length: count }, (_, idx) => {
        const num = String(idx + 1).padStart(2, '0');
        return {
          student_id: `student-${num}`,
          meeting_point_id: selectedMeetingPoint,
          destination_dorm_id: selectedDorm,
          eligibility_label: 'Demo uygunluk onayı',
          method: 'DEMO_TEST',
        };
      });
      setEdges(INITIAL_SYNTHETIC_EDGES);
      setDepartureIntents(newIntents);
      setPod(null);
      setPodNullReason(null);
      setWalks([]);
      setAssistances([]);
      setEscalationSimulation('NONE');
      setRunId(`run-argon-${Math.random().toString(36).slice(2, 7)}`);
      const freshRoutes = computeSyntheticRoutes(INITIAL_SYNTHETIC_EDGES, selectedMeetingPoint, selectedDorm);
      if (freshRoutes.data) setRouteExperiment(freshRoutes.data);

      return recordEnvelope('POST', '/api/demo/reset', reqBody, {
        reset: true,
        student_count: count,
        synthetic_intents_created: newIntents.map((i) => i.student_id),
        meeting_point_id: selectedMeetingPoint,
        destination_dorm_id: selectedDorm,
      });
    });
  };

  // 4. POST /api/matches/preview (student-01)
  const handleMatchesPreview = async () => {
    if (connectionMode === 'live' && customInvalidPointTest) return handleFetchRoutes('meet_invalid_422', selectedDorm);
    const reqBody = {
      meeting_point_id: customInvalidPointTest ? 'meet_invalid_422' : selectedMeetingPoint,
      destination_dorm_id: selectedDorm,
    };
    await callBackendOrSimulate('POST', '/api/matches/preview', connectionMode === 'live' ? null : reqBody, () => {
      if (customInvalidPointTest) {
        return recordEnvelope(
          'POST',
          '/api/matches/preview',
          redactSensitive(reqBody),
          null,
          {
            code: 'UNPROCESSABLE_ENTITY',
            message: 'Sabit pilot listesi dışında başlangıç veya varış kimliği gönderildi (422).',
            details: { allowed_meeting_points: MEETING_POINTS.map((m) => m.id) },
          },
          422
        );
      }

      if (departureIntents.length < 3) {
        setPod(null);
        setPodNullReason('Aynı başlangıç ve varış koridorunda eşleşecek yeterli çıkış niyeti bulunamadı (En az 3 öğrenci gerekli).');
        return recordEnvelope('POST', '/api/matches/preview', reqBody, {
          pod: null,
          reason: 'INSUFFICIENT_COMPATIBLE_INTENTS',
          explanation: 'Uygun grup oluşturulamadı; yeterli sayıda eşzamanlı çıkış niyeti yok.',
        });
      }

      const routeCheck = computeSyntheticRoutes(edges, selectedMeetingPoint, selectedDorm);
      const selectedRoute = routeCheck.data ? routeCheck.data.lighting_first : null;

      const memberIds = departureIntents.slice(0, Math.min(4, departureIntents.length)).map((i) => i.student_id);
      const newPod = {
        id: 'pod-demo-01',
        meeting_point_id: selectedMeetingPoint,
        destination_dorm_id: selectedDorm,
        member_ids: memberIds,
        accepted_member_ids: [],
        declined_member_ids: [],
        version: 1,
        status: 'FORMING',
        recorded_route: selectedRoute,
      };
      setPod(newPod);
      setPodNullReason(null);

      return recordEnvelope('POST', '/api/matches/preview', reqBody, {
        pod: newPod,
        member_ids: newPod.member_ids,
        version: newPod.version,
        accepted_member_ids: newPod.accepted_member_ids,
      });
    });
  };

  // 5. POST /api/pods/{id}/accept veya /decline {expected_version}
  const handlePodDecision = async (memberId, action = 'accept', customExpectedVersion = null) => {
    if (!pod) return;
    if (connectionMode === 'live' && memberId !== activeAccount) {
      setLastError({ status: 403, code: 'OWN_ACCOUNT_REQUIRED', message: `${memberId} kendi oturumundan kabul vermeli.` });
      return;
    }
    const expectedVersion = Number(customExpectedVersion ?? pod.version);
    const reqBody = { expected_version: expectedVersion };
    const endpoint = `/api/pods/${pod.id}/${action}`;

    await callBackendOrSimulate('POST', endpoint, reqBody, () => {
      if (expectedVersion !== pod.version) {
        return recordEnvelope(
          'POST',
          endpoint,
          redactSensitive(reqBody),
          null,
          {
            code: 'VERSION_CONFLICT',
            message: `İyimser kilitleme hatası: Gönderilen expected_version (${expectedVersion}), güncel pod.version (${pod.version}) ile eşleşmiyor. Her kabulden sonra güncel version kullanılmalıdır.`,
            details: { expected_version: expectedVersion, current_version: pod.version },
          },
          409
        );
      }

      if (action === 'decline') {
        const nextVersion = pod.version + 1;
        const updated = {
          ...pod,
          version: nextVersion,
          status: 'DECLINED_REFORM_REQUIRED',
          declined_member_ids: Array.from(new Set([...pod.declined_member_ids, memberId])),
        };
        setPod(updated);
        return recordEnvelope('POST', endpoint, reqBody, {
          pod: updated,
          member_ids: updated.member_ids,
          version: updated.version,
          accepted_member_ids: updated.accepted_member_ids,
        });
      }

      const nextAccepted = Array.from(new Set([...pod.accepted_member_ids, memberId]));
      const nextVersion = pod.version + 1;
      const allAccepted = pod.member_ids.every((m) => nextAccepted.includes(m));
      const updated = {
        ...pod,
        accepted_member_ids: nextAccepted,
        version: nextVersion,
        status: allAccepted ? 'READY_TO_WALK' : 'FORMING',
      };
      setPod(updated);
      return recordEnvelope('POST', endpoint, reqBody, {
        pod: updated,
        member_ids: updated.member_ids,
        version: updated.version,
        accepted_member_ids: updated.accepted_member_ids,
      });
    });
  };

  // 6. POST /api/walks/start {pod_id, arrival_check_enabled, estimated_duration_seconds}
  const handleStartWalk = async (studentId) => {
    if (!pod) return;
    const dur = Number(estimatedDurationSeconds);
    const reqBody = {
      pod_id: pod.id,
      arrival_check_enabled: Boolean(arrivalCheckEnabled),
      estimated_duration_seconds: dur,
    };

    await callBackendOrSimulate('POST', '/api/walks/start', reqBody, () => {
      const allAccepted = pod.member_ids.every((m) => pod.accepted_member_ids.includes(m));
      if (!allAccepted) {
        return recordEnvelope(
          'POST',
          '/api/walks/start',
          redactSensitive(reqBody),
          null,
          {
            code: 'POD_NOT_FULLY_ACCEPTED',
            message: 'Tüm grup üyeleri kabul (/accept) vermeden yürüyüş başlatılamaz.',
            details: { accepted_member_ids: pod.accepted_member_ids, member_ids: pod.member_ids },
          },
          409
        );
      }

      if (dur < 60 || dur > 7200) {
        return recordEnvelope(
          'POST',
          '/api/walks/start',
          redactSensitive(reqBody),
          null,
          {
            code: 'INVALID_DURATION',
            message: 'estimated_duration_seconds 60 ile 7200 saniye arasında olmalıdır (varsayılan 900).',
            details: { estimated_duration_seconds: dur },
          },
          422
        );
      }

      const existing = walks.find((w) => w.student_id === studentId);
      if (existing) {
        return recordEnvelope('POST', '/api/walks/start', reqBody, { walk: existing });
      }

      const newWalk = {
        id: `walk-${studentId}`,
        student_id: studentId,
        pod_id: pod.id,
        status: 'ACTIVE',
        version: 1,
        arrival_check_enabled: Boolean(arrivalCheckEnabled),
        estimated_duration_seconds: dur,
        local_grace_seconds: 60,
        recorded_route: pod.recorded_route,
        started_at: new Date().toISOString(),
      };
      const updatedWalks = [...walks, newWalk];
      setWalks(updatedWalks);

      return recordEnvelope('POST', '/api/walks/start', reqBody, {
        walk: newWalk,
        note: 'Aktif yürüyüşün kaydedilmiş rotası sabitlendi; sonradan kenar kapatılsa bile bu yürüyüşün kayıtlı rotası değişmez.',
      });
    });
  };

  // Tüm üyeler için hızlı yürüyüş başlatıcı (Sahne kolaylığı)
  const handleStartAllWalks = async () => {
    if (!pod) return;
    if (connectionMode === 'live') return handleStartWalk(activeAccount);
    const dur = Number(estimatedDurationSeconds);
    if (dur < 60 || dur > 7200) {
      await handleStartWalk(pod.member_ids[0]);
      return;
    }
    const created = pod.member_ids.map((mId) => ({
      id: `walk-${mId}`,
      student_id: mId,
      pod_id: pod.id,
      status: 'ACTIVE',
      version: 1,
      arrival_check_enabled: Boolean(arrivalCheckEnabled),
      estimated_duration_seconds: dur,
      local_grace_seconds: 60,
      recorded_route: pod.recorded_route,
      started_at: new Date().toISOString(),
    }));
    setWalks(created);
    recordEnvelope(
      'POST',
      '/api/walks/start (batch-demo)',
      { pod_id: pod.id, arrival_check_enabled: Boolean(arrivalCheckEnabled), estimated_duration_seconds: dur },
      { walks: created }
    );
  };

  // 7. POST /api/assistances {walk_id, reason: "HELP_REQUEST", idempotency_key}
  const handleCreateAssistance = async (walkId) => {
    const targetWalk = walks.find((w) => w.id === walkId) || walks[0];
    if (!targetWalk) {
      recordEnvelope(
        'POST',
        '/api/assistances',
        {},
        null,
        {
          code: 'NO_ACTIVE_WALK',
          message: 'Destek talebi oluşturmak için önce yürüyüş başlatılmalıdır (/api/walks/start).',
          details: {},
        },
        409
      );
      return;
    }

    const reqBody = {
      walk_id: targetWalk.id,
      reason: 'HELP_REQUEST',
      idempotency_key: idempotencyKeyInput.trim() || 'idem-default-001',
    };

    await callBackendOrSimulate('POST', '/api/assistances', reqBody, () => {
      const duplicate = assistances.find(
        (a) => a.walk_id === reqBody.walk_id && a.idempotency_key === reqBody.idempotency_key
      );
      if (duplicate) {
        return recordEnvelope('POST', '/api/assistances', reqBody, {
          assistance: duplicate,
          idempotent_replay: true,
          note: 'Aynı idempotency_key gönderildiği için yeni talep üretilmedi; mevcut kayıt döndürüldü.',
        });
      }

      const newAssistance = {
        id: `ast-${assistances.length + 1}`,
        walk_id: targetWalk.id,
        student_id: targetWalk.student_id,
        reason: 'HELP_REQUEST',
        idempotency_key: reqBody.idempotency_key,
        state: 'CREATED',
        escalation_state: escalationSimulation,
        version: 1,
        assigned_unit_id: null,
        resolution: null,
        updated_at: new Date().toISOString(),
      };
      setAssistances((prev) => [newAssistance, ...prev]);
      return recordEnvelope('POST', '/api/assistances', reqBody, {
        assistance: newAssistance,
        idempotent_replay: false,
      });
    });
  };

  // 8. Görev Durum Geçişleri: CREATED → OPERATOR_ACKED → ASSIGNED → GUARD_ACCEPTED → ARRIVED → RESOLVED
  const handleAssistanceStep = async (astId, stepAction) => {
    const target = assistances.find((a) => a.id === astId);
    if (!target) return;

    let endpoint = `/api/assistances/${target.id}/${stepAction}`;
    let reqBody = { expected_version: target.version };
    let nextState = target.state;
    let nextUnit = target.assigned_unit_id;
    let nextResolution = target.resolution;

    if (stepAction === 'operator-ack') {
      if (target.state !== 'CREATED') {
        return recordEnvelope('POST', endpoint, reqBody, null, {
          code: 'INVALID_STATE_TRANSITION',
          message: 'Yalnızca CREATED durumundaki talep operator-ack alabilir.',
          details: { current_state: target.state },
        }, 409);
      }
      nextState = 'OPERATOR_ACKED';
    } else if (stepAction === 'assign') {
      if (target.state !== 'OPERATOR_ACKED') {
        return recordEnvelope('POST', endpoint, reqBody, null, {
          code: 'INVALID_STATE_TRANSITION',
          message: 'Atama (/assign) yapmadan önce operatör kabulü (OPERATOR_ACKED) gereklidir.',
          details: { current_state: target.state },
        }, 409);
      }
      reqBody = { expected_version: target.version, unit_id: selectedUnitId };
      nextState = 'ASSIGNED';
      nextUnit = selectedUnitId;
    } else if (stepAction === 'guard-accept') {
      if (target.state !== 'ASSIGNED') {
        return recordEnvelope('POST', endpoint, reqBody, null, {
          code: 'INVALID_STATE_TRANSITION',
          message: 'Görevli kabulü (/guard-accept) için görevin ASSIGNED durumunda olması gerekir.',
          details: { current_state: target.state },
        }, 409);
      }
      nextState = 'GUARD_ACCEPTED';
    } else if (stepAction === 'arrive') {
      if (target.state !== 'GUARD_ACCEPTED') {
        return recordEnvelope('POST', endpoint, reqBody, null, {
          code: 'INVALID_STATE_TRANSITION',
          message: 'Olay yerine varış (/arrive) için önce görevli kabulü (GUARD_ACCEPTED) gereklidir.',
          details: { current_state: target.state },
        }, 409);
      }
      nextState = 'ARRIVED';
    } else if (stepAction === 'resolve') {
      if (target.state !== 'ARRIVED') {
        return recordEnvelope('POST', endpoint, reqBody, null, {
          code: 'INVALID_STATE_TRANSITION',
          message: 'Çözüm (/resolve) için önce görevlinin ARRIVED bildirmesi gereklidir.',
          details: { current_state: target.state },
        }, 409);
      }
      reqBody = { expected_version: target.version, resolution: 'DEMO_COMPLETED' };
      nextState = 'RESOLVED';
      nextResolution = 'DEMO_COMPLETED';
    }

    await callBackendOrSimulate('POST', endpoint, reqBody, () => {
      const updated = {
        ...target,
        state: nextState,
        version: target.version + 1,
        assigned_unit_id: nextUnit,
        resolution: nextResolution,
        escalation_state: nextState === 'RESOLVED' ? 'NONE' : target.escalation_state,
        updated_at: new Date().toISOString(),
      };
      setAssistances((prev) => prev.map((item) => (item.id === target.id ? updated : item)));
      return recordEnvelope('POST', endpoint, reqBody, { assistance: updated });
    });
  };

  // 9. POST /api/walks/{id}/complete {expected_version}
  const handleCompleteWalk = async (walkId) => {
    const target = walks.find((w) => w.id === walkId);
    if (!target) return;
    const reqBody = { expected_version: target.version };
    const endpoint = `/api/walks/${target.id}/complete`;

    await callBackendOrSimulate('POST', endpoint, reqBody, () => {
      const updated = {
        ...target,
        status: 'COMPLETED',
        version: target.version + 1,
        completed_at: new Date().toISOString(),
      };
      setWalks((prev) => prev.map((w) => (w.id === target.id ? updated : w)));
      return recordEnvelope('POST', endpoint, reqBody, { walk: updated });
    });
  };

  // 10. POST /api/memberships/student-pending/review (Reviewer)
  const handleReviewMembership = async () => {
    const reqBody = {
      expected_version: pendingMembership.version,
      decision: reviewForm.decision,
      method: reviewForm.method,
      student_eligibility_checked: Boolean(reviewForm.student_eligibility_checked),
      women_student_eligibility_checked: Boolean(reviewForm.women_student_eligibility_checked),
      verified_dorm_id: reviewForm.verified_dorm_id,
    };
    const endpoint = '/api/memberships/student-pending/review';

    await callBackendOrSimulate('POST', endpoint, reqBody, () => {
      const updated = {
        ...pendingMembership,
        version: pendingMembership.version + 1,
        status: reqBody.decision,
        decision: reqBody.decision,
        method: reqBody.method,
        student_eligibility_checked: reqBody.student_eligibility_checked,
        women_student_eligibility_checked: reqBody.women_student_eligibility_checked,
        verified_dorm_id: reqBody.verified_dorm_id,
        display_badge: 'Demo uygunluk onayı (DEMO_TEST)',
      };
      setPendingMembership(updated);
      return recordEnvelope('POST', endpoint, reqBody, {
        membership: updated,
        ui_policy_note: 'Onaylı kullanıcılar "SAÜ tarafından doğrulandı" diye gösterilmez; "Demo uygunluk onayı" yazılır.',
      });
    });
  };

  // 11. GET /api/routes & POST /api/demo/edges/{edge_id} {closed}
  const handleFetchRoutes = async (meetId = selectedMeetingPoint, dormId = selectedDorm, currentEdges = edges) => {
    const query = `/api/routes?meeting_point_id=${encodeURIComponent(meetId)}&destination_dorm_id=${encodeURIComponent(dormId)}`;
    await callBackendOrSimulate('GET', query, null, () => {
      const result = computeSyntheticRoutes(currentEdges, meetId, dormId);
      if (result.error) {
        setRouteExperiment(null);
        return recordEnvelope('GET', query, null, null, result.error, result.error.status);
      }
      setRouteExperiment(result.data);
      return recordEnvelope('GET', query, null, result.data);
    });
  };

  const handleToggleEdgeClosed = async (edgeId) => {
    const targetEdge = edges.find((e) => e.id === edgeId);
    if (!targetEdge) return;
    const nextClosed = !targetEdge.closed;
    const reqBody = { closed: nextClosed };
    const endpoint = `/api/demo/edges/${edgeId}`;

    await callBackendOrSimulate('POST', endpoint, reqBody, () => {
      const updatedEdges = edges.map((e) => (e.id === edgeId ? { ...e, closed: nextClosed } : e));
      setEdges(updatedEdges);
      const env = recordEnvelope('POST', endpoint, reqBody, {
        edge_id: edgeId,
        closed: nextClosed,
        note: 'Aktif yürüyüşün kaydedilmiş rotası değişmez; yeni /api/routes isteği güncel ağı hesaplar.',
      });
      // Yeni /api/routes isteği ile güncel ağı hesapla
      const routeRes = computeSyntheticRoutes(updatedEdges, selectedMeetingPoint, selectedDorm);
      if (routeRes.error) {
        setRouteExperiment(null);
        recordEnvelope(
          'GET',
          `/api/routes?meeting_point_id=${selectedMeetingPoint}&destination_dorm_id=${selectedDorm}`,
          null,
          null,
          routeRes.error,
          routeRes.error.status
        );
      } else {
        setRouteExperiment(routeRes.data);
      }
      return env;
    });
  };

  // Gecikme (escalation_state) simülasyonu değiştirici
  const handleEscalationChange = (nextEsc) => {
    if (connectionMode === 'live') return;
    setEscalationSimulation(nextEsc);
    setAssistances((prev) =>
      prev.map((a) => (a.state !== 'RESOLVED' ? { ...a, escalation_state: nextEsc } : a))
    );
  };

  // Seçili başlangıç/varış değiştiğinde rotayı yenile
  const handleSelectPilotEndpoints = (newMeet, newDorm) => {
    setSelectedMeetingPoint(newMeet);
    setSelectedDorm(newDorm);
    setCustomInvalidPointTest(false);
    handleFetchRoutes(newMeet, newDorm, edges);
  };

  const currentAccountObj = useMemo(() => {
    const account = DEMO_ACCOUNTS.find((a) => a.id === activeAccount) || DEMO_ACCOUNTS[0];
    if (connectionMode !== 'live') return account;
    if (!sessionCookieActive) return { ...account, id: 'Oturum açılmadı', badge: `${selectedAccount} kodu bekleniyor` };
    return { ...account, id: liveUser?.id ?? activeAccount, badge: liveUser?.membership?.status ?? liveUser?.role ?? account.badge };
  }, [activeAccount, selectedAccount, connectionMode, sessionCookieActive, liveUser]);

  const shortestEdgeSet = useMemo(
    () => new Set(routeExperiment?.shortest?.edge_ids || []),
    [routeExperiment]
  );
  const lightingEdgeSet = useMemo(
    () => new Set(routeExperiment?.lighting_first?.edge_ids || []),
    [routeExperiment]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* ÜST SÖZLEŞME VE OTURUM BARI */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">
                  SAÜ-Kovan <span className="text-amber-400 font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">ARGON PİLOT v1</span>
                </h1>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                  SYNTHETIC_SCHEMATIC
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Uygulanmış Backend Sözleşmesi (`contracts/openapi.json`) • Sabit Pilot Başlangıç/Varış • İyimser Kilitleme (`expected_version`)
              </p>
            </div>
          </div>

          {/* Mod Seçici + Zarf Telemetrisi */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setConnectionMode('simulator')}
                className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
                  connectionMode === 'simulator'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Sözleşme Simülatörü
              </button>
              <button
                type="button"
                onClick={() => setConnectionMode('live')}
                className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
                  connectionMode === 'live'
                    ? 'bg-emerald-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {wsConnected ? <Wifi className="w-3.5 h-3.5" /> : <Server className="w-3.5 h-3.5" />}
                Canlı Backend (/api + WS)
              </button>
            </div>

            <div className="hidden md:flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
              <span className="text-slate-400">rev:</span>
              <span className="text-amber-400 font-bold">{revision}</span>
              <span className="text-slate-700">|</span>
              <span className="text-slate-400">env:</span>
              <span className="text-emerald-400">&quot;demo&quot;</span>
              <span className="text-slate-700">|</span>
              <span className="text-slate-400">coords:</span>
              <span className="text-rose-400">null</span>
            </div>
          </div>
        </div>

        {/* OTURUM & ROL GEÇİŞ ÇUBUĞU (POST /api/auth/demo-session) */}
        <div className="max-w-7xl mx-auto mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-400" /> Aktif Rol (Session):
            </span>
            {DEMO_ACCOUNTS.map((acct) => (
              <button
                key={acct.id}
                type="button"
                onClick={() => handleSelectAccount(acct.id)}
                className={`px-2.5 py-1 rounded-md font-mono transition border ${
                  selectedAccount === acct.id
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {acct.id}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="password"
              value={accessCodeInput}
              onChange={(e) => setAccessCodeInput(e.target.value)}
              aria-label="Demo erişim kodu"
              placeholder={`${selectedAccount} erişim kodu...`}
              autoComplete="off"
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 w-48 font-mono"
            />
            <button
              type="button"
              onClick={() => handleStartDemoSession(selectedAccount)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono"
            >
              POST /auth/demo-session
            </button>
            <button
              type="button"
              onClick={() => handleFetchBootstrapAndState('/api/bootstrap')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono"
            >
              GET /bootstrap
            </button>
            <button
              type="button"
              onClick={() => handleFetchBootstrapAndState('/api/state')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> GET /state
            </button>
          </div>
        </div>
      </header>

      {/* SAHNE DEMO AKIŞ KILAVUZU (9 Adımlı Sıralı Rehber) */}
      <section className="bg-slate-900/50 border-b border-slate-800 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
              Canlı Demo Sırası
            </span>
            <span>
              1. <b>Presenter</b> Reset (3 öğrenci) → 2. <b>student-01</b> Preview → 3. Üyeler <b>Accept (v1..v3)</b> → 4. <b>Walk Start</b> → 5. <b>Help Request</b> → 6. <b>ACK → Assign → Guard Accept → Arrive → Resolve</b> → 7. <b>Walk Complete</b>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Oturum Çerezi:</span>
            <span className={`px-2 py-0.5 rounded font-mono ${sessionCookieActive ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300'}`}>
              {currentAccountObj.id} ({currentAccountObj.badge})
            </span>
          </div>
        </div>
      </section>

      {/* HATA BANNER'I (422 / 409 / NO_ROUTE / VERSION_CONFLICT) */}
      {lastError && (
        <div className="max-w-7xl mx-auto w-full px-4 mt-3">
          <div className="bg-rose-950/70 border border-rose-500/60 rounded-xl p-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-rose-200 font-mono">
                  HTTP {lastError.status} — {lastError.code}
                </div>
                <p className="text-rose-300 mt-0.5">{lastError.message}</p>
                {lastError.details && (
                  <pre className="mt-1 text-[11px] bg-slate-950/80 p-1.5 rounded text-rose-200 font-mono overflow-x-auto">
                    {JSON.stringify(lastError.details)}
                  </pre>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLastError(null)}
              className="text-xs text-rose-300 hover:text-white px-2 py-1 rounded bg-rose-900/50"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* ANA ÇİFT EKRANLI (3 SÜTUNLU) OPERASYON GÖVDESİ */}
      <main className="max-w-7xl mx-auto w-full flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* SOL SÜTUN (4 BİRİM): PRESENTER SAHNE RESET + ÖĞRENCİ EŞLEŞME VE YÜRÜYÜŞ AKIŞI */}
        <div className="lg:col-span-4 space-y-4">
          {/* 1. PRESENTER SAHNE VE SABİT PİLOT KONTROLÜ */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                1. Sabit Pilot & Presenter Reset
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                POST /api/demo/reset
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Başlangıç Kimliği (meeting_point_id):</label>
                <select
                  value={selectedMeetingPoint}
                  onChange={(e) => handleSelectPilotEndpoints(e.target.value, selectedDorm)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                >
                  {meetingCatalog.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} — {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Varış Kimliği (destination_dorm_id):</label>
                <select
                  value={selectedDorm}
                  onChange={(e) => handleSelectPilotEndpoints(selectedMeetingPoint, e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                >
                  {dormCatalog.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.id} — {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <label className="text-slate-400">student_count:</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={resetStudentCount}
                    onChange={(e) => setResetStudentCount(e.target.value)}
                    className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-center font-mono text-amber-300"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleDemoReset(resetStudentCount)}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sahneyi Sıfırla ({resetStudentCount} Niyet)
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
                <span>Bu oturumda görünen niyet: <strong className="text-white">{departureIntents.length}</strong> öğrenci</span>
                <button
                  type="button"
                  onClick={() => handleDemoReset(1)}
                  className="text-amber-400 hover:underline font-mono"
                >
                  [Test: 1 Öğrenci (Pod=null)]
                </button>
              </div>
            </div>
          </div>

          {/* 2. ÖĞRENCİ GRUP ÖNİZLEME & KABUL (Optimistic Locking) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                2. Grup Eşleşme & Kabul (`version`)
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-300">
                /api/matches/preview
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMatchesPreview}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2 px-3 rounded-lg text-xs transition flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                POST /api/matches/preview (student-01)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomInvalidPointTest(!customInvalidPointTest);
                }}
                className={`px-2.5 py-2 rounded-lg text-[11px] font-mono border transition ${
                  customInvalidPointTest
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Sabit pilot dışı ID göndererek 422 doğrulamasını test et"
              >
                422 Testi
              </button>
            </div>

            {podNullReason && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-lg p-2.5 text-xs text-amber-200">
                <div className="font-semibold font-mono">data.pod = null</div>
                <p className="text-amber-300/90 mt-0.5">{podNullReason}</p>
              </div>
            )}

            {pod && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <span className="font-mono font-bold text-white">{pod.id}</span>
                    <span className="ml-2 text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Demo uygunluk onayı
                    </span>
                  </div>
                  <div className="font-mono text-amber-400 font-bold">
                    version: {pod.version}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Durum: <strong className="text-slate-200 font-mono">{pod.status}</strong></span>
                  <span>Kabul: <strong className="text-emerald-400">{pod.accepted_member_ids.length}/{pod.member_ids.length}</strong></span>
                </div>

                <div className="space-y-1.5">
                  {pod.member_ids.map((mId) => {
                    const isAccepted = pod.accepted_member_ids.includes(mId);
                    const isDeclined = pod.declined_member_ids?.includes(mId);
                    return (
                      <div
                        key={mId}
                        className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-200 font-medium">{mId}</span>
                          <span className="text-[10px] text-slate-400">(Demo uygunluk onayı)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {isAccepted ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] flex items-center gap-1">
                              <Check className="w-3 h-3" /> Kabul Edildi
                            </span>
                          ) : isDeclined ? (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[11px]">
                              Reddedildi
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  if (connectionMode === 'simulator') setActiveAccount(mId);
                                  handlePodDecision(mId, 'accept', pod.version);
                                }}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[11px]"
                              >
                                /accept (v{pod.version})
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (connectionMode === 'simulator') setActiveAccount(mId);
                                  handlePodDecision(mId, 'decline', pod.version);
                                }}
                                className="px-1.5 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-mono text-[11px]"
                              >
                                /decline
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-1 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handlePodDecision(pod.member_ids[0], 'accept', Math.max(1, pod.version - 1))}
                    className="text-[11px] font-mono text-rose-400 hover:underline"
                  >
                    [Eski expected_version Çakışma Testi (409)]
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. YÜRÜYÜŞ BAŞLATMA, DESTEK TALEBİ VE VARIŞ TEYİDİ */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Footprints className="w-4 h-4 text-sky-400" />
                3. Yürüyüş & Destek (`/api/walks`)
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300">
                +60s ek süre
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Süre (60–7200 sn):</label>
                <input
                  type="number"
                  min={60}
                  max={7200}
                  value={estimatedDurationSeconds}
                  onChange={(e) => setEstimatedDurationSeconds(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 font-mono text-slate-200"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5">
                  <input
                    type="checkbox"
                    checked={arrivalCheckEnabled}
                    onChange={(e) => setArrivalCheckEnabled(e.target.checked)}
                    className="rounded border-slate-700"
                  />
                  <span className="text-slate-300 text-[11px]">arrival_check_enabled</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!pod}
                onClick={() => handleStartWalk(activeAccount.startsWith('student-') ? activeAccount : 'student-01')}
                className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-semibold py-1.5 px-3 rounded-lg text-xs transition"
              >
                POST /walks/start (Tek Üye)
              </button>
              <button
                type="button"
                disabled={!pod || pod.accepted_member_ids.length !== pod.member_ids.length}
                hidden={connectionMode === 'live'}
                onClick={handleStartAllWalks}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 py-1.5 px-2.5 rounded-lg text-xs font-mono border border-slate-700"
              >
                Tüm Grubu Başlat
              </button>
            </div>

            {/* Aktif Yürüyüşler ve Yardım / Tamamlama */}
            {walks.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 font-mono text-[11px]">idempotency_key:</span>
                  <input
                    type="text"
                    value={idempotencyKeyInput}
                    onChange={(e) => setIdempotencyKeyInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-[11px] text-amber-300"
                  />
                </div>

                {walks.map((w) => (
                  <div key={w.id} className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sky-300">
                        {w.id} ({w.student_id})
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        v{w.version} • {w.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Kayıtlı Rota: {w.recorded_route?.edge_ids?.join(' → ') || 'Yok'} ({w.recorded_route?.distance_m}m)
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCreateAssistance(w.id)}
                        className="flex-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 py-1 px-2 rounded font-mono text-[11px]"
                      >
                        POST /assistances (HELP_REQUEST)
                      </button>
                      {w.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => handleCompleteWalk(w.id)}
                          className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 py-1 px-2 rounded font-mono text-[11px]"
                        >
                          /complete (v{w.version})
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ORTA SÜTUN (5 BİRİM): SENTETİK ŞEMATİK TOPOLOJİ & ROTA DENEYİ */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Route className="w-4 h-4 text-amber-400" />
                  Sentetik Şematik Topoloji & Rota Deneyi
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  `GET /api/routes` • Etiket: <code className="text-amber-300">SYNTHETIC_SCHEMATIC</code> • Koordinatlar: <code className="text-rose-400">null</code> (Gerçek harita/kamera verisi uydurulmaz)
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleFetchRoutes(selectedMeetingPoint, selectedDorm, edges)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 border border-slate-700"
              >
                GET /api/routes
              </button>
            </div>

            {/* SOYUT TOPOLOJİ ŞEMASI (SVG) */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 relative overflow-hidden">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 font-mono">
                <span>ŞEMATİK GRAF (Presenter kenara tıklayarak kapatıp açabilir)</span>
                <span className="text-amber-400">geometry: null</span>
              </div>

              <svg viewBox="0 0 840 360" className="w-full h-64 select-none">
                {/* Kenarlar (Edges) */}
                {edges.map((e) => {
                  const p1 = SCHEMATIC_NODE_POSITIONS[e.from];
                  const p2 = SCHEMATIC_NODE_POSITIONS[e.to];
                  if (!p1 || !p2) return null;
                  const inShortest = shortestEdgeSet.has(e.id);
                  const inLighting = lightingEdgeSet.has(e.id);
                  const midX = (p1.x + p2.x) / 2;
                  const midY = (p1.y + p2.y) / 2;

                  let strokeColor = '#334155';
                  let strokeWidth = 3;
                  if (e.closed) {
                    strokeColor = '#f43f5e';
                    strokeWidth = 3;
                  } else if (inLighting && inShortest) {
                    strokeColor = '#10b981';
                    strokeWidth = 5;
                  } else if (inLighting) {
                    strokeColor = '#10b981';
                    strokeWidth = 5;
                  } else if (inShortest) {
                    strokeColor = '#f59e0b';
                    strokeWidth = 4;
                  }

                  return (
                    <g
                      key={e.id}
                      onClick={() => handleToggleEdgeClosed(e.id)}
                      className="cursor-pointer group"
                    >
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={e.closed ? '6 6' : inShortest && !inLighting ? '8 4' : undefined}
                      />
                      <rect
                        x={midX - 46}
                        y={midY - 11}
                        width={92}
                        height={22}
                        rx={5}
                        fill="#0f172a"
                        stroke={e.closed ? '#f43f5e' : '#334155'}
                        strokeWidth={1}
                      />
                      <text
                        x={midX}
                        y={midY + 3}
                        textAnchor="middle"
                        fill={e.closed ? '#fda4af' : '#cbd5e1'}
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        {e.closed ? 'KAPALI (X)' : `${e.distance_m}m (x${e.lighting_weight})`}
                      </text>
                    </g>
                  );
                })}

                {/* Düğümler (Nodes) */}
                {Object.entries(SCHEMATIC_NODE_POSITIONS).filter(([id]) => edges.some((edge) => edge.from === id || edge.to === id)).map(([nodeId, pos]) => {
                  const isSelectedOrigin = nodeId === selectedMeetingPoint;
                  const isSelectedDest = nodeId === selectedDorm;
                  let fill = '#1e293b';
                  let stroke = '#64748b';
                  if (isSelectedOrigin) {
                    fill = '#065f46';
                    stroke = '#34d399';
                  } else if (isSelectedDest) {
                    fill = '#78350f';
                    stroke = '#fbbf24';
                  }

                  return (
                    <g key={nodeId}>
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={isSelectedOrigin || isSelectedDest ? 14 : 10}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={2.5}
                      />
                      <text
                        x={pos.x}
                        y={pos.y + 26}
                        textAnchor="middle"
                        fill={isSelectedOrigin || isSelectedDest ? '#ffffff' : '#94a3b8'}
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight={isSelectedOrigin || isSelectedDest ? 'bold' : 'normal'}
                      >
                        {pos.title}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-2 border-t border-slate-900">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-3 h-1 bg-emerald-400 inline-block rounded" /> lighting_first
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-3 h-1 bg-amber-400 inline-block rounded" /> shortest
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-3 h-1 bg-rose-500 inline-block rounded" /> closed: true
                  </span>
                </div>
                <span className="text-slate-400">Kenara tıklamak `POST /api/demo/edges/&#123;id&#125;` çağırır</span>
              </div>
            </div>

            {/* ROTA KART KARŞILAŞTIRMASI (shortest vs lighting_first) */}
            {routeExperiment ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-300">1. shortest</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">
                      {routeExperiment.shortest.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300 font-mono">
                    <span>distance_m: <b>{routeExperiment.shortest.distance_m}m</b></span>
                    <span>weighted_cost: <b>{routeExperiment.shortest.weighted_cost}</b></span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono break-all">
                    edge_ids: [{routeExperiment.shortest.edge_ids.join(', ')}]
                  </div>
                </div>

                <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-300">2. lighting_first</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
                      {routeExperiment.lighting_first.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300 font-mono">
                    <span>distance_m: <b>{routeExperiment.lighting_first.distance_m}m</b></span>
                    <span>weighted_cost: <b>{routeExperiment.lighting_first.weighted_cost}</b></span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono break-all">
                    edge_ids: [{routeExperiment.lighting_first.edge_ids.join(', ')}]
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-200 font-mono">
                {lastError?.code === 'NO_ROUTE' ? 'Seçili noktalar arasında açık rota bulunamadı.' : sessionCookieActive ? 'Rota henüz hesaplanmadı.' : 'Canlı katalog ve rota için demo oturumunu açın.'}
              </div>
            )}

            {/* PRESENTER KENAR KAPATMA / AÇMA LİSTESİ */}
            <div className="space-y-1.5 pt-1">
              <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Presenter Kenar Kontrolü (`POST /api/demo/edges/&#123;edge_id&#125;`)</span>
                <span className="text-[11px] text-slate-400 font-normal">Aktif yürüyüşün rotası değişmez</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {edges.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => handleToggleEdgeClosed(e.id)}
                    className={`text-left px-2.5 py-1.5 rounded-lg border text-[11px] font-mono flex items-center justify-between transition ${
                      e.closed
                        ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="truncate mr-2">{e.id}</span>
                    <span className={e.closed ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {e.closed ? 'closed: true' : 'open'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* YENİ ÖĞRENCİ BAŞVURUSU GÖSTERİMİ (student-pending & Reviewer) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-400" />
                  Yeni Öğrenci Başvurusu (`student-pending` & `reviewer`)
                </h2>
                <p className="text-[11px] text-slate-400">
                  Onaylı kullanıcılar <b>&quot;SAÜ tarafından doğrulandı&quot;</b> diye gösterilmez; <b>&quot;Demo uygunluk onayı&quot;</b> yazılır.
                </p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                v{pendingMembership.version} • {pendingMembership.status}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Hesap: <b className="text-white font-mono">student-pending</b></span>
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono text-[11px]">
                  {pendingMembership.display_badge}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-800">
                  <input
                    type="checkbox"
                    checked={reviewForm.student_eligibility_checked}
                    onChange={(e) => setReviewForm({ ...reviewForm, student_eligibility_checked: e.target.checked })}
                  />
                  <span className="font-mono text-[11px]">student_eligibility_checked</span>
                </label>
                <label className="flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-800">
                  <input
                    type="checkbox"
                    checked={reviewForm.women_student_eligibility_checked}
                    onChange={(e) =>
                      setReviewForm({ ...reviewForm, women_student_eligibility_checked: e.target.checked })
                    }
                  />
                  <span className="font-mono text-[11px]">women_student_eligibility_checked</span>
                </label>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <select
                  value={reviewForm.verified_dorm_id}
                  onChange={(e) => setReviewForm({ ...reviewForm, verified_dorm_id: e.target.value })}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1.5 font-mono text-xs text-slate-200"
                >
                  {dormCatalog.map((d) => (
                    <option key={d.id} value={d.id}>
                      verified_dorm_id: {d.id}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setActiveAccount('reviewer');
                    handleReviewMembership();
                  }}
                  className="bg-purple-500 hover:bg-purple-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs transition"
                >
                  POST /memberships/student-pending/review
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ SÜTUN (3 BİRİM): OPERATÖR & SAHA GÖREVLİSİ DURUM MAKİNESİ + ZARF LOGU */}
        <div className="lg:col-span-3 space-y-4">
          {/* OPERATÖR & GUARD GÖREV DURUM MAKİNESİ */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-400" />
                4. Operatör & Görevli Akışı
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                6 Durumlu Akış
              </span>
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-950 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
              <div className="font-mono text-slate-300">
                CREATED → OPERATOR_ACKED → ASSIGNED → GUARD_ACCEPTED → ARRIVED → RESOLVED
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span>escalation_state:</span>
                <select
                  value={escalationSimulation}
                  disabled={connectionMode === 'live'}
                  onChange={(e) => handleEscalationChange(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 font-mono text-[11px] text-amber-300"
                >
                  <option value="NONE">NONE</option>
                  <option value="OPERATOR_OVERDUE">OPERATOR_OVERDUE</option>
                  <option value="GUARD_OVERDUE">GUARD_OVERDUE</option>
                </select>
              </div>
              <p className="text-[10px] text-amber-300/90">
                Uyarı: `escalation_state` gecikme göstergesidir; yardımın ulaştığı anlamına gelmez.
              </p>
            </div>

            <div className="flex items-center justify-between text-xs gap-2">
              <label className="text-slate-400 font-mono text-[11px]">Atanacak Birim:</label>
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-xs text-slate-200"
              >
                <option value="guard-01">guard-01</option>
                <option value="guard-02">guard-02</option>
              </select>
            </div>

            {assistances.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-lg">
                Henüz aktif destek talebi yok. Yürüyüş başlatıp `POST /api/assistances` çağırın.
              </div>
            ) : (
              <div className="space-y-2.5">
                {assistances.map((ast) => (
                  <div key={ast.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white">
                        {ast.id} ({ast.student_id})
                      </span>
                      <span className="font-mono text-amber-400">v{ast.version}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                      <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                        {ast.state}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded border ${
                          ast.escalation_state === 'NONE'
                            ? 'bg-slate-900 text-slate-400 border-slate-800'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        esc: {ast.escalation_state}
                      </span>
                      {ast.assigned_unit_id && (
                        <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300">
                          unit: {ast.assigned_unit_id}
                        </span>
                      )}
                    </div>

                    {/* Adım Adım Durum Makinesi Butonları */}
                    <div className="grid grid-cols-1 gap-1.5 pt-1">
                      <button
                        type="button"
                        disabled={ast.state !== 'CREATED'}
                        onClick={() => {
                          if (connectionMode === 'simulator') setActiveAccount('operator');
                          handleAssistanceStep(ast.id, 'operator-ack');
                        }}
                        className="w-full py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-left font-mono text-[11px] flex items-center justify-between"
                      >
                        <span>1. Operatör: /operator-ack</span>
                        <span>v{ast.version}</span>
                      </button>

                      <button
                        type="button"
                        disabled={ast.state !== 'OPERATOR_ACKED'}
                        onClick={() => {
                          if (connectionMode === 'simulator') setActiveAccount('operator');
                          handleAssistanceStep(ast.id, 'assign');
                        }}
                        className="w-full py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-left font-mono text-[11px] flex items-center justify-between"
                      >
                        <span>2. Operatör: /assign ({selectedUnitId})</span>
                        <span>v{ast.version}</span>
                      </button>

                      <button
                        type="button"
                        disabled={ast.state !== 'ASSIGNED'}
                        onClick={() => {
                          if (connectionMode === 'simulator') setActiveAccount(ast.assigned_unit_id || 'guard-01');
                          handleAssistanceStep(ast.id, 'guard-accept');
                        }}
                        className="w-full py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-left font-mono text-[11px] flex items-center justify-between"
                      >
                        <span>3. Görevli: /guard-accept</span>
                        <span>v{ast.version}</span>
                      </button>

                      <button
                        type="button"
                        disabled={ast.state !== 'GUARD_ACCEPTED'}
                        onClick={() => {
                          if (connectionMode === 'simulator') setActiveAccount(ast.assigned_unit_id || 'guard-01');
                          handleAssistanceStep(ast.id, 'arrive');
                        }}
                        className="w-full py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-left font-mono text-[11px] flex items-center justify-between"
                      >
                        <span>4. Görevli: /arrive</span>
                        <span>v{ast.version}</span>
                      </button>

                      <button
                        type="button"
                        disabled={ast.state !== 'ARRIVED'}
                        onClick={() => {
                          if (connectionMode === 'simulator') setActiveAccount('operator');
                          handleAssistanceStep(ast.id, 'resolve');
                        }}
                        className="w-full py-1 px-2 rounded bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 disabled:opacity-30 text-left font-mono text-[11px] text-emerald-200 flex items-center justify-between"
                      >
                        <span>5. Operatör: /resolve (DEMO_COMPLETED)</span>
                        <span>v{ast.version}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* KAPSAM DIŞI (BAĞLANMAMIŞ) ÖZELLİKLER ŞEFFAFLIK KARTI */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="font-bold text-slate-300 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-slate-400" />
              Bu Sürümde Bağlanmayan Özellikler
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Sözleşme gereği gerçek GPS akışı, sapma değerlendirmesi, belge yükleme, e-posta doğrulama, genel incident transition ve çıkış tahmini endpoint&apos;leri bu sürümde yoktur; arayüzde çalışıyormuş gibi sahte buton eklenmemiştir.
            </p>
          </div>

          {/* YANIT ZARFI (ENVELOPE) VE SON API KAYITLARI */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-amber-400" />
                Yanıt Zarfı (`revision` / `version`)
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {apiLogs.length} istek
              </span>
            </div>

            {lastEnvelope && (
              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-mono text-emerald-300 max-h-40 overflow-auto">
                {JSON.stringify(lastEnvelope, null, 2)}
              </pre>
            )}

            <div className="space-y-1 max-h-36 overflow-y-auto pt-1">
              {apiLogs.map((log) => (
                <div
                  key={log.id}
                  className={`px-2 py-1 rounded text-[10px] font-mono flex items-center justify-between border ${
                    log.isError
                      ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="truncate">
                    [{log.actor}] {log.method} {log.endpoint}
                  </span>
                  <span className={log.isError ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
