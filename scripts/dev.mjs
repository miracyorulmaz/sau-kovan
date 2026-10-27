import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const backendPort = Number(option('--backend-port', '8000'));
const frontendPort = Number(option('--frontend-port', '5173'));
if (![backendPort, frontendPort].every((port) => Number.isInteger(port) && port > 1024 && port < 65536)) throw new Error('Geçersiz port.');
const candidates = [option('--python', ''), process.env.KOVAN_PYTHON, resolve(root, '.venv/Scripts/python.exe'), resolve(root, '.venv/bin/python'), resolve(root, '../../work/kovan-venv/Scripts/python.exe')].filter(Boolean);
const python = candidates.find((path) => existsSync(path)) ?? option('--python', 'python');
const backendOnly = args.includes('--backend-only');
if (!backendOnly && backendPort === frontendPort) throw new Error('Frontend ve backend portları farklı olmalı.');
async function ensurePortFree(port) {
  await new Promise((done, fail) => {
    const probe = createServer();
    probe.once('error', () => fail(new Error(`${port} portu kullanımda. Mevcut sunucuyu kapatın veya farklı port seçin.`)));
    probe.listen(port, '127.0.0.1', () => probe.close(done));
  });
}
await ensurePortFree(backendPort);
if (!backendOnly) await ensurePortFree(frontendPort);
const vite = resolve(root, 'frontend/node_modules/vite/bin/vite.js');
if (!backendOnly && !existsSync(vite)) throw new Error('Önce frontend klasöründe npm install çalıştırın.');
const origins = [backendPort, frontendPort].flatMap((port) => [`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
const environment = { ...process.env, PYTHONUTF8: '1', KOVAN_ALLOWED_ORIGINS: process.env.KOVAN_ALLOWED_ORIGINS || origins.join(','), VITE_BACKEND_ORIGIN: `http://127.0.0.1:${backendPort}` };
const children = [];
let shuttingDown = false;
function stop(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) if (child.exitCode === null) child.kill();
  setTimeout(() => process.exit(code), 250);
}
function launch(command, argv, cwd, label) {
  const child = spawn(command, argv, { cwd, env: environment, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  for (const stream of [child.stdout, child.stderr]) stream.on('data', (data) => process.stdout.write(`[${label}] ${data}`));
  child.on('error', (error) => { console.error(`${label}: ${error.message}`); stop(1); });
  child.on('exit', (code) => { if (!shuttingDown) stop(code ?? 1); });
  return child;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
launch(python, ['-X', 'utf8', '-m', 'uvicorn', 'app.main:app', '--app-dir', 'backend', '--host', '127.0.0.1', '--port', String(backendPort), '--workers', '1'], root, 'backend');
let ready = false;
for (let attempt = 0; attempt < 30 && !shuttingDown; attempt++) {
  try {
    const response = await fetch(`http://127.0.0.1:${backendPort}/api/health`, { signal: AbortSignal.timeout(500) });
    const health = await response.json();
    if (health.status === 'ok' && health.environment === 'demo') { ready = true; break; }
  } catch { /* Wait for our backend startup; unrelated ports are never terminated. */ }
  await new Promise((done) => setTimeout(done, 500));
}
if (!ready || shuttingDown) {
  console.error('Backend hazır olmadı; başka bir uygulamanın portunu değiştirmeden önce kontrol edin.');
  stop(1);
} else if (!backendOnly) {
  launch(process.execPath, [vite, '--host', '127.0.0.1', '--port', String(frontendPort), '--strictPort'], resolve(root, 'frontend'), 'frontend');
  console.log(`Kovan preview: http://127.0.0.1:${frontendPort} | API: http://127.0.0.1:${backendPort}/docs`);
} else {
  console.log(`Kovan API: http://127.0.0.1:${backendPort}/docs`);
}
