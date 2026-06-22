import { Router } from 'express';
import { CompareRequestSchema } from '../core/schema/index.js';
import { compareResearch } from '../core/agent/index.js';
import { getConfig } from '../core/config/index.js';
import { initSSE, sendData } from '../lib/sse.js';
import { rateLimit } from '../lib/rateLimit.js';
import { logger } from '../lib/logger.js';
import { clientMessage, toAppError } from '../lib/errors.js';

export const compareRouter = Router();

const cfg = getConfig();
// Compare does two runs, so it's twice the cost — give it a tighter limit.
const limiter = rateLimit({
  windowMs: cfg.RATE_LIMIT_WINDOW_MS,
  max: Math.max(1, Math.floor(cfg.RATE_LIMIT_MAX / 2)),
});

/**
 * POST /api/compare  { a, b, persona? }  →  text/event-stream of CompareEvent
 *
 * Streams side-tagged research events for both companies in parallel, then a
 * head-to-head summary.
 */
compareRouter.post('/compare', limiter, async (req, res) => {
  const parsed = CompareRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'BadRequest',
      issues: parsed.error.issues.map((i) => i.message),
    });
    return;
  }

  const { a, b, persona } = parsed.data;
  const trace = logger.child({ traceId: Math.random().toString(36).slice(2, 10), a, b });

  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  initSSE(res);
  trace.info('compare stream started', { persona });

  try {
    await compareResearch({ a, b, persona, signal: controller.signal }, (event) =>
      sendData(res, event),
    );
    trace.info('compare stream completed');
  } catch (err) {
    const e = toAppError(err);
    sendData(res, { type: 'error', code: e.code, message: clientMessage(e, cfg.isProd) });
    trace.warn('compare stream ended with error', { error: e.message });
  } finally {
    res.end();
  }
});
