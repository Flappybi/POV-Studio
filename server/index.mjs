import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { providerConfig, generateAMD } from './provider.mjs';
import { validateInput } from '../src/lib/core.mjs';

if (existsSync('.env')) process.loadEnvFile('.env');
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const origin = req.get('origin');
  const allowedOrigins=['http://localhost:5173','http://127.0.0.1:5173',`http://localhost:${process.env.PORT||4173}`,`http://127.0.0.1:${process.env.PORT||4173}`,process.env.APP_ORIGIN].filter(Boolean);
  if(origin&&!allowedOrigins.includes(origin))return res.status(403).json({error:'Origin is not allowed.'});
  next();
});
app.get('/api/status', (_req, res) => {
  const config = providerConfig();
  res.json({ requestTimeoutMs: config.timeoutMs * 2 + 10000, configured: config.configured, partial: config.partial, mode: config.configured ? 'amd' : 'unconfigured', model: config.configured ? config.model : null });
});
let inFlight = 0;
app.post('/api/generate', async (req, res) => {
  try { validateInput(req.body); } catch (e) { return res.status(400).json({ error: e.message }); }
  if (inFlight >= 2) return res.status(429).json({ error: 'Two ads are being created. Please try again shortly.' });
  inFlight++;
  const start = performance.now();
  try {
    const config = providerConfig();
    if (!config.configured) return res.status(503).json({error:'Connect AMD first. Set the configuration in .env.'});
    const result = await generateAMD(req.body, config);
    res.json({ ...result, generationMs: Math.round(performance.now() - start) });
  } catch (e) {
    console.error('AMD request failure', { name: e.name, cause: e.code || e.cause?.code });
    res.status(e.status===429?429:502).json({ error: e.name === 'TimeoutError' ? `AMD did not respond within ${providerConfig().timeoutMs / 1000} seconds. Please try again.` : e.message === 'fetch failed' ? 'The AMD endpoint is unreachable. Check your connection and endpoint URL.' : e.message });
  } finally { inFlight--; }
});
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(path.join(root, 'dist/index.html'))) {
  app.use(express.static(path.join(root, 'dist')));
  app.get('/{*path}', (req, res) => req.path.startsWith('/api/') ? res.status(404).json({ error: 'Endpoint not found.' }) : res.sendFile(path.join(root, 'dist/index.html')));
}
app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.type === 'entity.too.large' ? 'Request data is too large.' : 'Invalid request.' }));
app.listen(Number(process.env.PORT||4173),process.env.HOST||'127.0.0.1',error=>{if(error){console.error('Unable to start POV Studio API:',error.code);process.exitCode=1;return;}console.log(`POV Studio API listening on port ${process.env.PORT||4173}`);});
