import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { getConfig } from './core/config/index.js';
import { logger } from './lib/logger.js';
import { healthRouter } from './routes/health.js';
import { researchRouter } from './routes/research.js';
import { compareRouter } from './routes/compare.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createApp() {
  const cfg = getConfig();
  const app = express();

  // Behind Render/any reverse proxy, trust the X-Forwarded-* headers so req.ip
  // (used by the rate limiter) reflects the real client, not the proxy.
  if (cfg.isProd) app.set('trust proxy', 1);

  // Security headers. CSP is disabled because the SPA + Framer Motion rely on
  // inline styles; a tailored CSP is a worthwhile follow-up. All other helmet
  // protections (X-Content-Type-Options, frameguard, HSTS in prod, etc.) apply.
  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(express.json({ limit: '64kb' }));

  // --- API ---
  app.use('/api', healthRouter);
  app.use('/api', researchRouter);
  app.use('/api', compareRouter);

  // --- Static client (unified production deploy) ---
  // In production the Node server serves the Vite build output so the whole app
  // runs as ONE service. In development the Vite dev server handles the UI and
  // proxies /api here, so we skip static serving.
  if (cfg.isProd) {
    // server/dist/index.js -> repo root is ../../.. ; client build is client/dist
    const clientDist = path.resolve(__dirname, '../../client/dist');
    app.use(express.static(clientDist));
    // SPA fallback: any non-API route returns index.html.
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return { app, cfg };
}

function main() {
  try {
    const { app, cfg } = createApp();
    app.listen(cfg.PORT, () => {
      logger.info('server started', {
        port: cfg.PORT,
        env: cfg.NODE_ENV,
        model: cfg.GEMINI_MODEL,
      });
    });
  } catch (err) {
    // Config validation or boot failure — fail loudly and exit non-zero.
    logger.error('server failed to start', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

main();
