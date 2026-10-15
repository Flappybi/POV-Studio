import { buildPrompt, planStructure, validateInput, validateGeneratedPlan, tokenCost } from '../src/lib/core.mjs';
export function providerConfig(env = process.env) {
  const present = ['AMD_BASE_URL', 'AMD_API_KEY', 'AMD_MODEL'].filter(key => Boolean(env[key]?.trim()));
  const price = (key) => env[key]?.trim() ? Number(env[key]) : undefined;
  const timeoutValue = Number(env.AMD_TIMEOUT_MS || 120000);
  const timeoutMs = Number.isFinite(timeoutValue) ? Math.max(10000, Math.min(180000, timeoutValue)) : 120000;
  return { timeoutMs, configured: present.length === 3, partial: present.length > 0 && present.length < 3,
    baseURL: env.AMD_BASE_URL?.trim(), key: env.AMD_API_KEY?.trim(), model: env.AMD_MODEL?.trim(),
    prices: { input: price('AMD_INPUT_PRICE_PER_MILLION'), output: price('AMD_OUTPUT_PRICE_PER_MILLION') } };
}
export async function generateAMD(input, config, fetchImpl = fetch) {
  input=validateInput(input);
  if (!config.configured) throw new Error('AMD configuration is incomplete. Set AMD_BASE_URL, AMD_API_KEY, and AMD_MODEL in .env.');
  const url = new URL(config.baseURL);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('The AMD endpoint must use HTTPS (HTTP is allowed only for localhost).');
  const messages = buildPrompt(input);
  const cumulative = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let usageKnown = true;
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    let data;
    try {
    const response = await fetchImpl(`${config.baseURL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.model, messages, temperature: 0.3, max_tokens: 1600, response_format: { type: 'json_object' }, ...(config.model.startsWith('DeepSeek-') ? { reasoning_effort: 'none' } : {}) }),
      signal: AbortSignal.timeout(config.timeoutMs ?? 120000),
    });
    if(!response.ok){const error=new Error(response.status===429?'AMD is rate-limiting requests or its quota has been reached. Please wait and try again.':`AMD returned HTTP ${response.status}. Check the endpoint, model, quota, and API key.`);error.status=response.status;throw error;}
    data = await response.json();
    } catch (cause) {
      const code = cause.cause?.code || cause.code;
      if (code === 'ECONNRESET' || code === 'UND_ERR_SOCKET') {
        const error = new Error('The connection to AMD was reset before a complete response arrived. Try again later, or check access using another network or your VPN/proxy settings. This does not establish whether the API key is valid.', { cause });
        error.code = code;
        throw error;
      }
      throw cause;
    }
    if (Number.isFinite(data.usage?.prompt_tokens) && data.usage.prompt_tokens >= 0 && Number.isFinite(data.usage?.completion_tokens) && data.usage.completion_tokens >= 0) {
      cumulative.prompt_tokens += data.usage.prompt_tokens;
      cumulative.completion_tokens += data.usage.completion_tokens;
      cumulative.total_tokens = cumulative.prompt_tokens + cumulative.completion_tokens;
    } else usageKnown = false;
    const raw = data.choices?.[0]?.message?.content;
    try {
      if (typeof raw !== 'string') throw new Error('The AMD response did not contain an ad plan.');
      const parsed = JSON.parse(raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, ''));
      const plan = validateGeneratedPlan(parsed,input);
      const usage = usageKnown ? cumulative : null;
      return { plan, mode: 'amd', model: config.model, usage, cost: tokenCost(usage, config.prices), attempts: attempt + 1 };
    } catch (error) {
      lastError = error;
      if(typeof raw==='string')messages.push({role:'assistant',content:raw});
      messages.push({role:'user',content:`Return the corrected AD PLAN object only. Do not return the input object with brand, story, preferences or assets. Keep valid ad fields and fix the validation failure. Shorten every scene text to 8-12 words and at most 150 characters; do not paste the full story into a scene. Validation error: ${error.message}. scenes must be a top-level array of exactly THREE separate {title,text} objects, NOT a field of music. Never repeat title or text keys inside one object. Replace every REPLACE_WITH_ value with actual English copy. Keep the exact approved brandName, CTA, claims and a verbatim story quotation. Do not add facts or numbers. Required structure:\n${JSON.stringify(planStructure(input),null,2)}`});
    }
  }
  throw new Error(`The ad plan needs review: ${lastError.message}`);
}
