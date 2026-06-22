import { Router } from 'express';
import { getConfig } from '../core/config/index.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  const cfg = getConfig();
  res.json({
    status: 'ok',
    env: cfg.NODE_ENV,
    llmProvider: cfg.LLM_PROVIDER,
    model: cfg.GEMINI_MODEL,
    persistence: cfg.PERSISTENCE_ENABLED,
    time: new Date().toISOString(),
  });
});
