import type { CompareEvent, Persona } from '../types';

/**
 * Calls POST /api/compare and reads the SSE stream of `CompareEvent`s. Same SSE
 * framing as streamResearch — see lib/api.ts for the rationale on why we use
 * fetch streaming instead of EventSource.
 */
export async function streamCompare(
  body: { a: string; b: string; persona: Persona },
  onEvent: (event: CompareEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let message = `Request failed (HTTP ${res.status})`;
    let code = 'BadRequest';
    try {
      const err = await res.json();
      message = Array.isArray(err.issues) ? err.issues.join(', ') : err.error ?? message;
      code = err.error ?? code;
    } catch {
      /* ignore */
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
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith('data:')) continue;
      const json = line.slice('data:'.length).trim();
      if (!json) continue;
      try {
        onEvent(JSON.parse(json) as CompareEvent);
      } catch {
        /* skip malformed frame */
      }
    }
  }
}
