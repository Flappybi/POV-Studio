import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { input, plan } from './fixtures.mjs';

const site = 'https://povstudioapp.netlify.app';
const environment = { AMD_BASE_URL: 'https://amd.example/v1', AMD_API_KEY: 'test-key-only', AMD_MODEL: 'test-model' };
const request = (pathname, body, options = {}) => new Request(site + pathname, {
  method: body === undefined ? 'GET' : 'POST',
  headers: { origin: site, 'content-type': 'application/json', ...options.headers },
  ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  ...options,
});
const load = () => import('../netlify/functions/api.mjs');

test('Netlify deploy registers a real function for /api, with no secret in the status response', async () => {
  const manifest = await readFile(new URL('../netlify.toml', import.meta.url), 'utf8').catch(() => '');
  assert.match(manifest, /directory\s*=\s*"netlify\/functions"/, 'Netlify must bundle the API function');
  const { default: handler, config, createHandler } = await load();
  assert.equal(typeof handler, 'function');
  assert.equal(config.path, '/api/*');
  const response = await createHandler({ env: environment })(request('/api/status'));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const status = await response.json();
  assert.equal(status.configured, true);
  assert.equal(status.model, 'test-model');
  assert.ok(status.requestTimeoutMs < 60000);
  assert.ok(!JSON.stringify(status).includes(environment.AMD_API_KEY));
});

test('deployed /api/generate reaches AMD and returns a validated ad, including repair', async () => {
  const { createHandler } = await load();
  const value = input('I carry my sketchbook to design class every morning.');
  let calls = 0;
  const handler = createHandler({ env: environment, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://amd.example/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer test-key-only');
    const creative = plan(value);
    if (++calls === 1) creative.scenes = [];
    return Response.json({ choices: [{ message: { content: JSON.stringify(creative) } }], usage: { prompt_tokens: 10, completion_tokens: 20 } });
  } });
  const response = await handler(request('/api/generate', value));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.mode, 'amd');
  assert.equal(result.plan.scenes.length, 3);
  assert.equal(result.plan.storyAnchor, value.story);
  assert.equal(result.attempts, 2);
  assert.equal(calls, 2);
  assert.ok(Number.isFinite(result.generationMs));
  assert.ok(!JSON.stringify(result).includes(environment.AMD_API_KEY));
});

test('Netlify rejects bad origins, missing input and invalid JSON before calling AMD', async () => {
  const { createHandler } = await load();
  let calls = 0;
  const handler = createHandler({ env: environment, fetchImpl: async () => { calls++; throw new Error('Unexpected AMD call'); } });
  assert.equal((await handler(request('/api/generate', input(), { headers: { origin: 'https://untrusted.example' } }))).status, 403);
  assert.equal((await handler(request('/api/generate', {}))).status, 400);
  assert.equal((await handler(request('/api/generate', '{broken'))).status, 400);
  assert.equal((await handler(request('/api/generate', ' '.repeat(2 * 1024 * 1024 + 1)))).status, 413);
  assert.equal((await handler(request('/api/generate'))).status, 405);
  const missing = await handler(request('/api/unknown'));
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get('content-type'), /application\/json/);
  assert.equal(calls, 0);
});

test('Netlify accepts the configured public origin and reports absent AMD configuration', async () => {
  const { createHandler } = await load();
  const handler = createHandler({ env: { APP_ORIGIN: 'https://custom.example' } });
  const response = await handler(request('/api/generate', input(), { headers: { origin: 'https://custom.example' } }));
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /Netlify.*environment variables/i);
});

test('Netlify preserves quota errors and caps slow AMD requests below the platform limit', async () => {
  const { createHandler, providerSettings } = await load();
  assert.equal(providerSettings(environment).timeoutMs, 25000);
  assert.equal(providerSettings({ ...environment, AMD_TIMEOUT_MS: '180000' }).timeoutMs, 25000);
  assert.equal(providerSettings({ ...environment, AMD_TIMEOUT_MS: '15000' }).timeoutMs, 15000);
  const quiet = { error() {} };
  const limited = createHandler({ env: environment, logger: quiet, fetchImpl: async () => new Response('', { status: 429 }) });
  assert.equal((await limited(request('/api/generate', input()))).status, 429);
  const timeout = createHandler({ env: environment, logger: quiet, fetchImpl: async () => { throw new DOMException('Timed out', 'TimeoutError'); } });
  const failed = await timeout(request('/api/generate', input()));
  assert.equal(failed.status, 504);
  assert.match((await failed.json()).error, /25 seconds/);
  const reset = createHandler({ env: environment, logger: quiet, fetchImpl: async () => { throw new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } }); } });
  const disconnected = await reset(request('/api/generate', input()));
  assert.equal(disconnected.status, 502);
  assert.match((await disconnected.json()).error, /connection.*reset/i);
});

test('Netlify prevents excess parallel requests within one function instance', async () => {
  const { createHandler } = await load();
  const value = input('I walk to class with my sketchbook every morning.');
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  let entered = 0;
  const handler = createHandler({ env: environment, fetchImpl: async () => { entered++; await pending; return Response.json({ choices: [{ message: { content: JSON.stringify(plan(value)) } }] }); } });
  const first = handler(request('/api/generate', value));
  const second = handler(request('/api/generate', value));
  while (entered < 2) await new Promise(resolve => setImmediate(resolve));
  assert.equal((await handler(request('/api/generate', value))).status, 429);
  release();
  assert.deepEqual((await Promise.all([first, second])).map(response => response.status), [200, 200]);
  assert.equal((await handler(request('/api/generate', value))).status, 200);
});
