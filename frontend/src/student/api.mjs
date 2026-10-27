export async function api(path, { method = 'GET', body, signal } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 12_000);
  try {
    const response = await fetch(path, { method, credentials: 'include', signal: controller.signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined });
    const envelope = await response.json();
    if (!response.ok) throw Object.assign(new Error(envelope.message), { status: response.status, code: envelope.code });
    return envelope;
  } catch (error) {
    if (error.code && typeof error.code === 'string') throw error;
    throw Object.assign(new Error('Bağlantı doğrulanamadı.'), { code: 'NETWORK_ERROR' });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
