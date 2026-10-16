import test from 'node:test';
import assert from 'node:assert/strict';
import { testBrand as defaultBrand, plan as demoPlan } from './fixtures.mjs';
import { generateAMD, providerConfig } from '../server/provider.mjs';
const input = { story: 'I want to run 5 km', brand: defaultBrand, duration: 15, time: 'Morning', mood: 'Energetic' };
const config = { configured: true, baseURL: 'https://example.test/v1', key: 'test-only', model: 'test-model', prices: { input: 1, output: 2 } };
const answer = (plan, usage = { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }) => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(plan) } }], usage }) });
test('AMD adapter sends the real schema request and validates returned plan', async () => {
  let request;
  const result = await generateAMD(input, config, async (url, options) => { request = { url, options }; return answer(demoPlan(input)); });
  assert.equal(request.url, 'https://example.test/v1/chat/completions');
  assert.equal(JSON.parse(request.options.body).model, 'test-model');
  assert.equal(request.options.headers.Authorization, 'Bearer test-only');
  assert.equal(result.mode, 'amd');
  assert.equal(result.cost, 0.0002);
  assert.equal(result.attempts, 1);
});

test('approved constants omitted by AMD are supplied by the server without inventing creative copy',async()=>{
 const raw=demoPlan(input);delete raw.brandName;delete raw.cta;delete raw.claims;let calls=0;
 const result=await generateAMD(input,config,async()=>{calls++;return answer(raw);});
 assert.equal(calls,1);assert.equal(result.plan.brandName,input.brand.name);assert.equal(result.plan.cta,input.brand.cta);assert.deepEqual(result.plan.claims,input.brand.claims);assert.equal(result.plan.headline,raw.headline);
 await assert.rejects(generateAMD(input,config,async()=>answer({...raw,brandName:'Wrong brand'})),/brand name/);
 const missingCreative={...raw};delete missingCreative.headline;await assert.rejects(generateAMD(input,config,async()=>answer(missingCreative)),/headline/);
});
test('retry includes tokens and cost of rejected first response', async () => {
  let calls = 0;
  const valid = demoPlan(input);
  const result = await generateAMD(input, config, async () => answer(calls++ ? valid : { ...valid, cta: 'Wrong CTA' }));
  assert.equal(result.attempts, 2);
  assert.equal(result.usage.prompt_tokens, 200);
  assert.equal(result.usage.completion_tokens, 100);
  assert.equal(result.cost, 0.0004);
});
test('repair includes the bad response and an explicit root-level scene skeleton',async()=>{const valid=demoPlan(input);const bad={...valid,music:{...valid.music,scenes:valid.scenes}};delete bad.scenes;let calls=0;let repair;const result=await generateAMD(input,config,async(_url,options)=>{const body=JSON.parse(options.body);if(calls++)repair=body.messages;return answer(calls===1?bad:valid);});assert.equal(result.attempts,2);assert.equal(repair.at(-2).role,'assistant');assert.deepEqual(JSON.parse(repair.at(-2).content),bad);assert.match(repair.at(-1).content,/top-level|root-level/);const skeleton=JSON.parse(repair.at(-1).content.split('Required structure:\n')[1]);assert.equal(skeleton.scenes.length,3);assert.equal(skeleton.music.scenes,undefined);});
test('HTTP and persistent malformed responses never become demo output', async () => {
  await assert.rejects(generateAMD(input, config, async () => ({ ok:false, status:401 })), /HTTP 401/);
  let calls=0;
  await assert.rejects(generateAMD(input, config, async () => {calls++;return answer({});}), /review/);
  assert.equal(calls,2);
});
test('incomplete configuration and unknown prices remain explicit', () => {
  const result = providerConfig({ AMD_API_KEY: 'not-a-real-key' });
  assert.equal(result.configured,false);assert.equal(result.partial,true);
  assert.equal(result.prices.input,undefined);
});
test('rate limiting stays actionable and does not trigger a repair attempt',async()=>{let calls=0;await assert.rejects(generateAMD(input,config,async()=>{calls++;return {ok:false,status:429};}),error=>error.status===429&&/rate-limiting/.test(error.message));assert.equal(calls,1);});

test('AMD timeout can accommodate slow inference without unbounded waits', () => {
  assert.equal(providerConfig({}).timeoutMs,120000);
  assert.equal(providerConfig({ AMD_TIMEOUT_MS:'180000' }).timeoutMs,180000);
  assert.equal(providerConfig({ AMD_TIMEOUT_MS:'bad' }).timeoutMs,120000);
  assert.equal(providerConfig({ AMD_TIMEOUT_MS:'9999999' }).timeoutMs,180000);
});

test('connection reset reports the transport failure without retrying a potentially billed request', async () => {
  let calls = 0;
  const reset = () => new TypeError('fetch failed', { cause: Object.assign(new Error('socket reset'), { code: 'ECONNRESET' }) });
  for (const duringBody of [false, true]) {
    calls = 0;
    await assert.rejects(generateAMD(input, config, async () => {
      calls++;
      if (!duringBody) throw reset();
      return { ok: true, json: async () => { throw reset(); } };
    }), error => error.code === 'ECONNRESET' && /connection.*reset/i.test(error.message) && /VPN|network/i.test(error.message));
    assert.equal(calls, 1);
  }
});

test('repair explicitly prevents input echo and tells the model to shorten overlong scene copy', async () => {
  const valid = demoPlan(input);
  const invalid = structuredClone(valid);
  invalid.scenes[0].text = 'x'.repeat(155);
  let calls = 0;
  await generateAMD(input, config, async (_url, options) => {
    const request = JSON.parse(options.body);
    if (calls++) {
      assert.match(request.messages.at(-1).content, /invalid scene text/);
      assert.match(request.messages.at(-1).content, /8.?12 words/);
      assert.match(request.messages.at(-1).content, /Do not return.*input/i);
    } else {
      assert.match(request.messages[0].content, /Every scene text.*8.?12 words/);
    }
    return answer(calls === 1 ? invalid : valid);
  });
  assert.equal(calls, 2);
});
