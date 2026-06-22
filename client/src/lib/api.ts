import type { Persona, ResearchEvent } from '../types';

/**
 * Calls POST /api/research and reads the Server-Sent-Events stream, invoking
 * `onEvent` for each parsed `ResearchEvent`.
 *
 * We can't use the browser's `EventSource` because that only does GET and we need
 * to POST a JSON body. Instead we read the response body as a stream and split it
 * on the SSE frame delimiter (`\n\n`), parsing each `data: <json>` line.
 */
export async function streamResearch(
  body: { companyName: string; persona: Persona },
  onEvent: (event: ResearchEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  // Validation errors come back as plain JSON (not a stream).
  if (!res.ok) {
    let message = `Request failed (HTTP ${res.status})`;
    let code = 'BadRequest';
    try {
      const err = await res.json();
      message = Array.isArray(err.issues) ? err.issues.join(', ') : err.error ?? message;
      code = err.error ?? code;
    } catch {
      /* ignore parse error */
    }
    onEvent({ type: 'error', code, message });
    return;
  }

  if (!res.body) throw new Error('No response body to stream.');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Frames are separated by a blank line. Keep the trailing partial in buffer.
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith('data:')) continue;
      const json = line.slice('data:'.length).trim();
      if (!json) continue;
      try {
        onEvent(JSON.parse(json) as ResearchEvent);
      } catch {
        /* skip malformed frame */
      }
    }
  }
}
