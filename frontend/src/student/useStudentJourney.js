import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.mjs';
import { createDeparturePlan, friendlyError, PILOT_CATALOG, selectJourney } from './journey.mjs';
import { captureLocation } from './safety.mjs';

const EMPTY = { user: null, intents: [], pods: [], walks: [], assistances: [] };

export function useStudentJourney() {
  const [snapshot, setSnapshot] = useState(EMPTY);
  const [catalog, setCatalog] = useState(PILOT_CATALOG);
  const [capabilities, setCapabilities] = useState({ local_demo_controls: false, notifications: { mode: 'DEMO' } });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState('connecting');
  const stateRef = useRef(EMPTY);
  const epoch = useRef(0);
  const revision = useRef(-1);
  const locked = useRef(false);
  const helpKeys = useRef(new Map());
  const emergencyKey = useRef(null);

  const apply = useCallback((envelope) => {
    if (envelope.revision < revision.current) return;
    revision.current = envelope.revision;
    const next = envelope.data.user?.role === 'student' ? envelope.data : EMPTY;
    stateRef.current = next;
    setSnapshot(next);
  }, []);

  const loadSession = useCallback(async (signal) => {
    const current = epoch.current;
    const [bootstrap, state] = await Promise.all([api('/api/bootstrap', { signal }), api('/api/state', { signal })]);
    if (current !== epoch.current || signal?.aborted) return;
    setCatalog(bootstrap.data.catalog);
    setCapabilities(bootstrap.data.capabilities ?? { local_demo_controls: false });
    apply(state);
    return state.data.user;
  }, [apply]);

  const refresh = useCallback(async () => {
    const current = epoch.current;
    const response = await api('/api/state');
    if (current === epoch.current) apply(response);
    return response.data;
  }, [apply]);

  useEffect(() => {
    const controller = new AbortController();
    loadSession(controller.signal).catch((failure) => {
      if (!controller.signal.aborted && failure.status !== 401) setError(friendlyError(failure));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); epoch.current += 1; };
  }, [loadSession]);

  const userId = snapshot.user?.id;
  useEffect(() => {
    if (!userId) return;
    let stopped = false;
    let socket;
    let retry;
    let delay = 1000;
    const current = epoch.current;
    const onRefreshError = (failure) => {
      if (stopped || current !== epoch.current) return;
      if (failure.status === 401) {
        stateRef.current = EMPTY; setSnapshot(EMPTY); setError(friendlyError(failure));
      }
    };
    const connect = () => {
      if (stopped) return;
      setConnection('connecting');
      socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/events`);
      socket.onopen = () => { if (!stopped) { delay = 1000; setConnection('online'); } };
      socket.onmessage = (event) => {
        if (stopped || current !== epoch.current) return;
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'state.snapshot') apply(message);
        } catch { /* A malformed frame does not replace confirmed state. */ }
      };
      socket.onclose = () => {
        if (stopped) return;
        setConnection('offline'); retry = setTimeout(connect, delay); delay = Math.min(delay * 2, 10_000);
      };
    };
    const reloadVisible = () => { if (!document.hidden && !stopped) refresh().catch(onRefreshError); };
    connect();
    const poll = setInterval(() => { if (socket?.readyState !== WebSocket.OPEN) reloadVisible(); }, 4000);
    document.addEventListener('visibilitychange', reloadVisible);
    return () => {
      stopped = true; clearTimeout(retry); clearInterval(poll); socket?.close();
      document.removeEventListener('visibilitychange', reloadVisible);
    };
  }, [userId, apply, refresh]);

  const run = async (name, action) => {
    if (locked.current) return false;
    locked.current = true; setBusy(name); setError('');
    try {
      await action();
      return true;
    } catch (failure) {
      if (failure.status === 409) await refresh().catch(() => {});
      if (failure.status === 401) { stateRef.current = EMPTY; setSnapshot(EMPTY); }
      setError(friendlyError(failure));
      return false;
    } finally {
      locked.current = false; setBusy(null);
    }
  };

  const login = (accessCode) => run('login', async () => {
    epoch.current += 1; revision.current = -1;
    const response = await api('/api/auth/demo-session', { method: 'POST', body: { access_code: accessCode.trim() } });
    if (response.data.user.role !== 'student') {
      stateRef.current = EMPTY; setSnapshot(EMPTY);
      throw Object.assign(new Error(), { code: 'STUDENT_ACCOUNT_REQUIRED' });
    }
    await loadSession();
  });

  const logout = () => run('logout', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    epoch.current += 1; revision.current = -1; helpKeys.current.clear(); emergencyKey.current = null; stateRef.current = EMPTY; setSnapshot(EMPTY);
  });

  const search = (plan) => run('search', async () => {
    const body = createDeparturePlan(plan);
    const current = selectJourney(await refresh());
    if (current.walk || current.pod) return;
    if (current.intent?.status === 'WAITING') {
      await api(`/api/intents/${current.intent.id}/cancel`, { method: 'POST', body: { expected_version: current.intent.version } });
    }
    await api('/api/intents', { method: 'POST', body });
    await api('/api/matches/preview', { method: 'POST' });
    await refresh();
  });

  const matchAgain = () => run('match', async () => { await api('/api/matches/preview', { method: 'POST' }); await refresh(); });
  const cancel = () => run('cancel', async () => {
    const current = selectJourney(stateRef.current);
    if (current.pod?.status === 'PROPOSED') {
      await api(`/api/pods/${current.pod.id}/decline`, { method: 'POST', body: { expected_version: current.pod.version } });
    } else if (current.intent?.status === 'WAITING') {
      await api(`/api/intents/${current.intent.id}/cancel`, { method: 'POST', body: { expected_version: current.intent.version } });
    }
    await refresh();
  });

  const accept = () => run('accept', async () => {
    const { pod } = selectJourney(stateRef.current);
    if (!pod) return;
    await api(`/api/pods/${pod.id}/accept`, { method: 'POST', body: { expected_version: pod.version } });
    await refresh();
  });

  const start = (arrivalCheck, duration, mapPreviewId = null) => run('start', async () => {
    const { pod } = selectJourney(stateRef.current);
    if (!pod) return;
    await api('/api/walks/start', { method: 'POST', body: { pod_id: pod.id,
      arrival_check_enabled: arrivalCheck, estimated_duration_seconds: Number(duration) * 60, map_preview_id: mapPreviewId } });
    await refresh();
  });

  const complete = () => run('complete', async () => {
    const { walk } = selectJourney(stateRef.current);
    if (!walk) return;
    await api(`/api/walks/${walk.id}/complete`, { method: 'POST', body: { expected_version: walk.version } });
    await refresh();
  });

  const requestHelp = () => run('help', async () => {
    const { walk, assistance } = selectJourney(stateRef.current);
    if (!walk || (assistance && !['RESOLVED', 'CANCELLED'].includes(assistance.status))) return;
    const resolvedId = assistance?.id ?? null;
    let attempt = helpKeys.current.get(walk.id);
    if (!attempt || attempt.resolvedId !== resolvedId) {
      attempt = { key: `help-${walk.id}-${crypto.randomUUID()}`, resolvedId };
      helpKeys.current.set(walk.id, attempt);
    }
    const location = stateRef.current.emergency_contact?.share_location_on_help ? await captureLocation() : { location: null, location_status: 'NOT_REQUESTED' };
    await api('/api/assistances', { method: 'POST', body: { walk_id: walk.id, reason: 'HELP_REQUEST', idempotency_key: attempt.key, ...location } });
    await refresh();
  });

  const demoCompanions = (immediate = false) => run('companions', async () => {
    await api('/api/demo/companions', { method: 'POST', body: { immediate } }); await refresh();
  });
  const saveContact = (contact) => run('contact', async () => {
    await api('/api/emergency-contact', { method: 'PUT', body: contact }); await refresh();
  });
  const deleteContact = () => run('contact', async () => {
    await api('/api/emergency-contact', { method: 'DELETE' }); await refresh();
  });
  const sendEmergency = (message) => run('emergency', async () => {
    if (!emergencyKey.current) emergencyKey.current = crypto.randomUUID();
    const location = stateRef.current.emergency_contact?.share_location_on_help ? await captureLocation() : { location: null, location_status: 'NOT_REQUESTED' };
    await api('/api/emergencies', { method: 'POST', body: { message, idempotency_key: emergencyKey.current, ...location } });
    await refresh();
  });
  const resolveEmergency = (item) => run('resolve-emergency', async () => {
    await api(`/api/emergencies/${item.id}/resolve`, { method: 'POST', body: { expected_version: item.version } });
    emergencyKey.current = null; await refresh();
  });

  return { snapshot, catalog, capabilities, loading, busy, error, connection, clearError: () => setError(''),
    login, logout, search, matchAgain, cancel, accept, start, complete, requestHelp,
    demoCompanions, saveContact, deleteContact, sendEmergency, resolveEmergency,
    refresh: () => run('refresh', refresh) };
}
