import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../student/api.mjs';
import { friendlyError, PILOT_CATALOG } from '../student/journey.mjs';

const EMPTY = { user: null, assistances: [], walks: [], units: [] };

export function useOperations(role) {
  const [snapshot, setSnapshot] = useState(EMPTY);
  const [catalog, setCatalog] = useState(PILOT_CATALOG);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [connection, setConnection] = useState('connecting');
  const revision = useRef(-1);
  const epoch = useRef(0);
  const locked = useRef(false);
  const apply = useCallback((response) => {
    if (response.revision < revision.current) return;
    revision.current = response.revision;
    setSnapshot(response.data);
  }, []);

  const load = useCallback(async (signal) => {
    const current = epoch.current;
    const [bootstrap, state] = await Promise.all([api('/api/bootstrap', { signal }), api('/api/state', { signal })]);
    if (signal?.aborted || current !== epoch.current) return;
    setCatalog(bootstrap.data.catalog);
    apply(state);
  }, [apply]);
  const refresh = useCallback(async () => {
    const current = epoch.current;
    const response = await api('/api/state');
    if (current === epoch.current) apply(response);
  }, [apply]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).catch((failure) => {
      if (!controller.signal.aborted && failure.status !== 401) setError(friendlyError(failure));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); epoch.current += 1; };
  }, [load]);

  const userId = snapshot.user?.id;
  const authorized = snapshot.user?.role === role;
  useEffect(() => {
    if (!userId || !authorized) return;
    let stopped = false;
    let socket;
    let retry;
    let delay = 1000;
    const current = epoch.current;
    const handleFailure = (failure) => {
      if (stopped || current !== epoch.current) return;
      if (failure.status === 401) { setSnapshot(EMPTY); setError('Oturumun sona erdi. Yeniden giriş yap.'); }
      else setError(friendlyError(failure));
    };
    const connect = () => {
      if (stopped) return;
      setConnection('connecting');
      socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/events`);
      socket.onopen = () => { if (!stopped) { delay = 1000; setConnection('online'); } };
      socket.onmessage = (event) => {
        if (stopped || current !== epoch.current) return;
        try { const message = JSON.parse(event.data); if (message.type === 'state.snapshot') apply(message); }
        catch { /* Polling still retrieves authoritative state if a frame cannot be read. */ }
      };
      socket.onclose = () => {
        if (stopped) return;
        setConnection('offline'); retry = setTimeout(connect, delay); delay = Math.min(delay * 2, 10000);
      };
    };
    const reloadVisible = () => { if (!document.hidden && !stopped) refresh().catch(handleFailure); };
    connect();
    const poll = setInterval(() => { if (socket?.readyState !== WebSocket.OPEN) reloadVisible(); }, 5000);
    document.addEventListener('visibilitychange', reloadVisible);
    return () => { stopped = true; clearTimeout(retry); clearInterval(poll); socket?.close(); document.removeEventListener('visibilitychange', reloadVisible); };
  }, [authorized, userId, apply, refresh]);

  const run = async (key, action) => {
    if (locked.current) return false;
    locked.current = true; setBusy(key); setError(''); setNotice('');
    try { await action(); return true; }
    catch (failure) {
      if (failure.status === 409) await refresh().catch(() => {});
      if (failure.status === 401) setSnapshot(EMPTY);
      setError(friendlyError(failure)); return false;
    } finally { locked.current = false; setBusy(''); }
  };
  const login = (code) => run('login', async () => {
    epoch.current += 1; revision.current = -1;
    await api('/api/auth/demo-session', { method: 'POST', body: { access_code: code.trim() } });
    await load();
  });
  const logout = () => run('logout', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    epoch.current += 1; revision.current = -1; setSnapshot(EMPTY); setConnection('connecting');
  });
  const action = (item, step, extra = {}) => run(`${item.id}:${step}`, async () => {
    await api(`/api/assistances/${item.id}/${step}`, { method: 'POST', body: { expected_version: item.version, ...extra } });
    await refresh();
    setNotice({ 'operator-ack': 'Talep incelemeye alındı.', assign: 'Saha birimi sevk edildi.', arrive: 'Olay yerine ulaştığın bildirildi.', resolve: 'Destek talebi kapatıldı.' }[step]);
  });
  return { snapshot, catalog, loading, busy, error, notice, connection, authorized, login, logout, action,
    refresh: () => run('refresh', refresh) };
}
