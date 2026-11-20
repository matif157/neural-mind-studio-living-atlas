import path from 'node:path';
import { existsSync } from 'node:fs';
import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import { APP_NAME, APP_SUBNAME, SCHEMA_VERSION } from '../shared/domain';
import { analysisRequestSchema } from '../shared/schemas';
import { EXERCISES, KNOWLEDGE_DOMAINS } from '../shared/taxonomy';
import { config } from './config';
import { runAnalysis } from './pipeline/analyze';
import { getProvider, isAllowed, providerCatalogue } from './providers/registry';
import { errorMiddleware, rateLimit, requireApiToken, safeErrorMessage } from './security';

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: [config.corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'] }));
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      app: `${APP_NAME} — ${APP_SUBNAME}`,
      schemaVersion: SCHEMA_VERSION,
      defaultProvider: config.defaultProvider,
      authRequired: Boolean(config.apiToken),
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  app.get('/api/providers', (_req, res) => res.json({ providers: providerCatalogue() }));

  app.get('/api/knowledge', (_req, res) => {
    res.json({ domains: KNOWLEDGE_DOMAINS, exercises: EXERCISES });
  });

  const guarded = express.Router();
  guarded.use(requireApiToken, rateLimit);

  guarded.post('/analyze', async (req: Request, res: Response) => {
    const parsed = analysisRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid analysis request.', details: parsed.error.issues.slice(0, 5).map((issue) => issue.path.join('.')) });
      return;
    }
    try {
      res.json(await runAnalysis(parsed.data));
    } catch (error) {
      const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number' ? error.status : 500;
      res.status(status).json({ error: safeErrorMessage(error) });
    }
  });

  guarded.post('/analyze/stream', async (req: Request, res: Response) => {
    const parsed = analysisRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid analysis request.' });
      return;
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const send = (event: string, payload: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    try {
      send('status', { message: 'Preparing structured analysis…' });
      const response = await runAnalysis(parsed.data, (chunk) => send('token', { chunk }));
      send('result', response);
      res.end();
    } catch (error) {
      const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number' ? error.status : 500;
      send('error', { error: safeErrorMessage(error), status });
      res.end();
    }
  });

  guarded.post('/test-connection', async (req: Request, res: Response) => {
    const id = String(req.body?.provider ?? config.defaultProvider);
    if (!(isAllowed(id as Parameters<typeof isAllowed>[0]))) {
      res.status(403).json({ ok: false, error: 'Provider disabled by server configuration.' });
      return;
    }
    const provider = getProvider(id as Parameters<typeof getProvider>[0], typeof req.body?.model === 'string' ? req.body.model : undefined);
    if (!provider.available) {
      res.status(503).json({ ok: false, error: 'No server-side credentials configured for this provider.' });
      return;
    }
    const started = Date.now();
    try {
      const result = await provider.generate({
        systemPrompt: 'Reply with only this JSON object: {"ok":true}',
        userPrompt: 'Connection test.',
        jsonSchema: { type: 'object', additionalProperties: false, required: ['ok'], properties: { ok: { type: 'boolean' } } },
        temperature: 0,
        maxOutputTokens: 32,
        timeoutMs: 12_000,
      });
      const ok = /"ok"\s*:\s*true/.test(result.text);
      res.json({ ok, provider: provider.id, model: provider.model, latencyMs: Date.now() - started, offline: result.offline });
    } catch (error) {
      res.status(502).json({ ok: false, provider: provider.id, error: safeErrorMessage(error) });
    }
  });

  app.use('/api', guarded);
  app.use((error: unknown, req: Request, res: Response, next: express.NextFunction) => errorMiddleware(error, req, res, next));

  const dist = path.resolve(process.cwd(), 'dist');
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  return app;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  createApp().listen(config.port, '0.0.0.0', () => {
    console.log(`${APP_NAME} API listening on http://localhost:${config.port} (provider: ${config.defaultProvider})`);
  });
}
