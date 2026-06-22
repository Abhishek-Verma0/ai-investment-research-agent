import { createLLMProvider } from '../providers/llm/index.js';
import { createDataProviders } from '../providers/data/index.js';
import { getConfig } from '../config/index.js';
import { AppError, clientMessage, toAppError } from '../../lib/errors.js';
import type { Persona, ResearchEvent, Verdict } from '../schema/index.js';
import { buildGraph } from './graph.js';
import { withContext } from './context.js';

export interface RunInput {
  companyName: string;
  persona?: Persona;
  /** Cancel the run if the client disconnects. */
  signal?: AbortSignal;
}

/**
 * ── The orchestrator ─────────────────────────────────────────────────────────
 * This is the single entry point the rest of the app calls. It:
 *   1. builds the concrete dependencies (LLM + data providers) from config,
 *   2. compiles the graph,
 *   3. runs it, passing those deps + an `emit` callback through the config,
 *   4. forwards every event to `onEvent` (the SSE route will pipe these to the
 *      browser),
 *   5. guarantees the stream ends in exactly ONE terminal event — `verdict` on
 *      success or `error` on any failure — so the UI never hangs.
 *
 * It's framework-agnostic on purpose: no Express here. The HTTP route (M4) and
 * the CLI both call this same function.
 */
export async function runResearch(
  input: RunInput,
  onEvent: (event: ResearchEvent) => void,
): Promise<Verdict> {
  // Swallow listener errors so a buggy consumer can't break the agent run.
  const emit = (event: ResearchEvent) => {
    try {
      onEvent(event);
    } catch {
      /* ignore */
    }
  };

  // A run that hangs (slow LLM/API) must not stream forever. We combine an
  // overall timeout with the caller's signal (client disconnect) into one signal
  // that cancels in-flight LLM/HTTP work either way.
  const timeoutMs = getConfig().RUN_TIMEOUT_MS;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = input.signal
    ? AbortSignal.any([input.signal, timeoutSignal])
    : timeoutSignal;

  try {
    const llm = createLLMProvider(); // throws ProviderError if GEMINI_API_KEY missing
    const providers = createDataProviders();
    const persona: Persona = input.persona ?? 'balanced';

    const graph = buildGraph();

    // `invoke(input, config)` runs the whole graph and returns the FINAL state.
    // We stash our dependencies + emit on `config.configurable.ctx` (see context.ts),
    // and pass the combined abort signal down to cancel work on timeout/disconnect.
    const finalState = await graph.invoke(
      { companyName: input.companyName, persona },
      { ...withContext({ llm, providers, persona, emit, signal }), signal },
    );

    if (!finalState.verdict) {
      // The early-exit branch (no usable data) ends here with no verdict.
      throw new AppError(
        'DataUnavailable',
        `Couldn't gather enough data to analyze "${input.companyName}".`,
      );
    }

    emit({ type: 'verdict', data: finalState.verdict });
    return finalState.verdict;
  } catch (err) {
    // Distinguish an overall-timeout abort from other failures for a clear message.
    const e = timeoutSignal.aborted
      ? new AppError('Timeout', `Research timed out after ${Math.round(timeoutMs / 1000)}s.`)
      : toAppError(err);
    emit({ type: 'error', code: e.code, message: clientMessage(e, getConfig().isProd) });
    throw e;
  }
}
