import type { Response } from 'express';
import type { ResearchEvent } from '../core/schema/index.js';

/**
 * Server-Sent-Events helpers. We stream the agent's `ResearchEvent`s to the
 * browser as `data: <json>\n\n` frames over a long-lived HTTP response. The
 * client reads them with a fetch ReadableStream (we POST a body, so we can't use
 * the GET-only EventSource API — but the wire format is the same SSE framing).
 */
export function initSSE(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  // Disable proxy buffering (e.g. on Render/nginx) so frames flush immediately.
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
}

export function sendEvent(res: Response, event: ResearchEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

/** Generic SSE frame for any serializable payload (e.g. compare events). */
export function sendData(res: Response, data: unknown): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}
