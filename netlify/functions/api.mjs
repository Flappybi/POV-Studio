import { generateAMD, providerConfig } from '../../server/provider.mjs';
import { validateInput } from '../../src/lib/core.mjs';

// Two AMD attempts must finish inside Netlify's 60-second execution limit.
const MAX_ATTEMPT_MS = 25000;
const BODY_LIMIT = 2 * 1024 * 1024;
export const config = { path: '/api/*' };

export function providerSettings(env) {
  const settings = providerConfig(env);
  return { ...settings, timeoutMs: Math.min(settings.timeoutMs, MAX_ATTEMPT_MS) };
}

function json(value, status = 200, headers = {}) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

export function createHandler({ env = process.env, fetchImpl = fetch, logger = console } = {}) {
  // This cap is per warm instance, not a global quota across Netlify instances.
  let inFlight = 0;
  return async function handler(request) {
    const url = new URL(request.url);
    const origin = request.headers.get('origin');
    if (origin && ![url.origin, env.APP_ORIGIN].filter(Boolean).includes(origin)) {
      return json({ error: 'Origin is not allowed.' }, 403);
    }
    const pathname = url.pathname.replace(/^\/\.netlify\/functions\/api(?=\/|$)/, '/api');
    if (!['/api/status', '/api/generate'].includes(pathname)) return json({ error: 'Endpoint not found.' }, 404);
    const method = pathname === '/api/status' ? 'GET' : 'POST';
    if (request.method !== method) return json({ error: `Use ${method} for this endpoint.` }, 405, { Allow: method });
    const settings = providerSettings(env);
    if (pathname === '/api/status') {
      return json({ requestTimeoutMs: settings.timeoutMs * 2 + 5000, configured: settings.configured,
        partial: settings.partial, mode: settings.configured ? 'amd' : 'unconfigured', model: settings.configured ? settings.model : null });
    }

    let input;
    try {
      if (Number(request.headers.get('content-length')) > BODY_LIMIT) return json({ error: 'Request data is too large.' }, 413);
      const body = await request.text();
      if (Buffer.byteLength(body, 'utf8') > BODY_LIMIT) return json({ error: 'Request data is too large.' }, 413);
      try { input = JSON.parse(body); } catch { return json({ error: 'Invalid JSON request.' }, 400); }
      input = validateInput(input);
    } catch (error) {
      return json({ error: error.message || 'Invalid request.' }, 400);
    }
    if (!settings.configured) return json({ error: 'Connect AMD first. Set AMD_BASE_URL, AMD_API_KEY and AMD_MODEL in Netlify environment variables with Functions scope, then redeploy.' }, 503);
    if (inFlight >= 2) return json({ error: 'Two ads are being created. Please try again shortly.' }, 429);
    inFlight++;
    const start = performance.now();
    try {
      const result = await generateAMD(input, settings, fetchImpl);
      return json({ ...result, generationMs: Math.round(performance.now() - start) });
    } catch (error) {
      logger.error('AMD request failure', { name: error.name, cause: error.code || error.cause?.code });
      const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
      return json({ error: timedOut
        ? `AMD did not respond within ${settings.timeoutMs / 1000} seconds. Please try again.`
        : error.message === 'fetch failed'
          ? 'The AMD endpoint is unreachable. Check the endpoint URL and network access.'
          : error.message }, timedOut ? 504 : error.status === 429 ? 429 : 502);
    } finally { inFlight--; }
  };
}

export default createHandler();
