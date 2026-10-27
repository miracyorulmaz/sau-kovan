import React, { useEffect, useRef, useState } from 'react';
import { Map, Route, RefreshCw } from 'lucide-react';
import { api } from './api.mjs';
import { friendlyError } from './journey.mjs';
import { Action } from './ui.jsx';

let googleLoader;
function loadGoogleMaps(key) {
  if (globalThis.google?.maps?.geometry) return Promise.resolve(globalThis.google.maps);
  if (!googleLoader) googleLoader = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Harita yüklenemedi. Bağlantı ve tarayıcı anahtarını kontrol et.')), 12000);
    globalThis.__kovanMapsReady = () => { clearTimeout(timeout); resolve(globalThis.google.maps); };
    globalThis.gm_authFailure = () => { clearTimeout(timeout); reject(new Error('Google Maps anahtarı veya alan adı izni doğrulanamadı.')); };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&libraries=geometry&callback=__kovanMapsReady&language=tr&region=TR`;
    script.async = true;
    script.onerror = () => { clearTimeout(timeout); googleLoader = null; reject(new Error('Google Maps yüklenemedi.')); };
    document.head.appendChild(script);
  });
  return googleLoader;
}

function GoogleRouteMap({ route, browserKey }) {
  const container = useRef(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let stopped = false;
    let map;
    let line;
    let endpoints = [];
    setError('');
    loadGoogleMaps(browserKey).then((maps) => {
      if (stopped) return;
      const path = maps.geometry.encoding.decodePath(route.encoded_polyline);
      if (path.length < 2) throw new Error('Google rota çizgisi okunamadı.');
      map = new maps.Map(container.current, { center: path[0], zoom: 15, mapTypeControl: false, streetViewControl: false, fullscreenControl: true });
      line = new maps.Polyline({ path, map, strokeColor: '#ba831a', strokeOpacity: 1, strokeWeight: 5 });
      const bounds = new maps.LatLngBounds(); path.forEach((point) => bounds.extend(point)); map.fitBounds(bounds, 35);
      endpoints = [path[0], path[path.length - 1]].map((center) => new maps.Circle({ map, center, radius: 12, fillColor: '#247354', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 }));
    }).catch((failure) => { if (!stopped) setError(failure.message); });
    return () => { stopped = true; line?.setMap(null); endpoints.forEach((point) => point.setMap(null)); if (map) globalThis.google.maps.event.clearInstanceListeners(map); };
  }, [route, browserKey]);
  return <>{error ? <p className="kv-login-error" role="alert">{error}</p> : null}<div ref={container} className="kv-google-map" aria-label="Google Maps yürüyüş rotası" /></>;
}

export default function RoutePreview({ userId, meetingId, dormId, walkRoute, onPreview, onSetup }) {
  const [config, setConfig] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => {
    let stopped = false;
    generation.current += 1;
    setPreview(null); onPreview(null); setError(''); setBusy(false);
    if (userId) api('/api/maps/config').then((response) => { if (!stopped) setConfig(response.data); }).catch(() => { if (!stopped) setConfig(null); });
    else setConfig(null);
    return () => { stopped = true; generation.current += 1; };
  }, [userId, meetingId, dormId, onPreview]);
  const route = walkRoute?.source === 'GOOGLE_MAPS' ? walkRoute : preview;
  const ready = config?.routes_configured && config?.browser_configured;
  const load = async () => {
    const current = ++generation.current;
    setBusy(true); setError('');
    try {
      const response = await api(`/api/maps/preview?meeting_point_id=${encodeURIComponent(meetingId)}&destination_dorm_id=${encodeURIComponent(dormId)}`);
      if (current !== generation.current) return;
      setPreview(response.data); onPreview(response.data);
    } catch (failure) { if (current === generation.current) { setError(friendlyError(failure)); setPreview(null); onPreview(null); } }
    finally { if (current === generation.current) setBusy(false); }
  };
  return <section className="kv-route-preview" aria-label="Gerçek rota önizlemesi">
    <div className="kv-section-head"><span className="kv-kicker"><Map size={15} /> GOOGLE MAPS ROTASI</span>
      {route ? <span className="kv-small-tag">Yürüyüş tahmini</span> : null}</div>
    {route && config?.browser_key ? <><GoogleRouteMap route={route} browserKey={config.browser_key} />
      <div className="kv-route-metrics"><span><ClockLabel seconds={route.duration_seconds} /></span><span>{(route.distance_m / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} km</span></div>
      <div className="kv-map-warning">{route.warnings.map((warning, index) => <p key={index}>{warning}</p>)}</div></>
      : <p className="kv-field-hint">{!userId ? 'Rota ve tahmini süre için öğrenci hesabınla giriş yap.' : ready ? 'Seçtiğin iki nokta için Google yürüyüş rotasını hesapla.' : 'Google Maps henüz kurulmadı. Anahtar ve teyitli giriş noktaları eklenince gerçek rota ve süre burada görünecek.'}</p>}
    {error ? <p role="alert" className="kv-login-error">{error}</p> : null}
    <div className="kv-inline-actions"><Action className="kv-subtle-button" disabled={!userId || busy || !ready || walkRoute?.source === 'GOOGLE_MAPS'} busy={busy} onClick={load}>
      {preview ? <RefreshCw size={15} /> : <Route size={15} />}{preview ? 'Rotayı yenile' : 'Rotayı önizle'}</Action>
      {userId && !ready && onSetup ? <button className="kv-link-button" onClick={onSetup}>Kurulumu aç</button> : null}</div>
  </section>;
}

function ClockLabel({ seconds }) { return <>{Math.ceil(seconds / 60)} dk tahmini yürüyüş</>; }
