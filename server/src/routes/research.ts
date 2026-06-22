import { Router } from 'express';
import { ResearchRequestSchema } from '../core/schema/index.js';
import { runResearch } from '../core/agent/index.js';
import { getConfig } from '../core/config/index.js';
import { initSSE, sendEvent } from '../lib/sse.js';
import { rateLimit } from '../lib/rateLimit.js';
import { logger } from '../lib/logger.js';

export const researchRouter = Router();

const cfg = getConfig();
const limiter = rateLimit({ windowMs: cfg.RATE_LIMIT_WINDOW_MS, max: cfg.RATE_LIMIT_MAX });

/**
 * POST /api/research  { companyName, persona? }  →  text/event-stream
 *
 * Validates the body, then streams the agent's progress + final verdict (or a
 * single error event) to the client. `runResearch` guarantees exactly one
 * terminal event, so the stream always closes cleanly.
 */
researchRouter.post('/research', limiter, async (req, res) => {
  const parsed = ResearchRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    // Validation fails BEFORE we switch to SSE, so respond as normal JSON.
    res.status(400).json({
      error: 'BadRequest',
      issues: parsed.error.issues.map((i) => i.message),
    });
    return;
  }

  const { companyName, persona } = parsed.data;
  const trace = logger.child({ traceId: cryptoRandomId(), company: companyName });

  // Cancel in-flight work (LLM / HTTP calls) if the client disconnects.
  //
  // NOTE: we listen on `res`, NOT `req`. On a POST, `req` ('close') fires the
  // moment the request BODY has been fully read (which express.json does almost
  // immediately) — that is not a disconnect and would abort the run instantly.
  // `res` ('close') fires when the response connection closes; we only treat it
  // as a cancel if the response hasn't already finished normally.
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  initSSE(res);
  trace.info('research stream started', { persona });

  try {
    await runResearch(
      { companyName, persona, signal: controller.signal },
      (event) => sendEvent(res, event),
    );
    trace.info('research stream completed');
  } catch (err) {
    // The terminal `error` event was already emitted by runResearch; just log.
    trace.warn('research stream ended with error', {
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    res.end();
  }
});

function cryptoRandomId(): string {
  return Math.random().toString(36).slice(2, 10);
}
