import type { RunnableConfig } from '@langchain/core/runnables';
import type { Persona, ResearchEvent } from '../schema/index.js';
import type { LLMProvider } from '../providers/llm/types.js';
import type { DataProviders } from '../providers/data/index.js';
import { AppError } from '../../lib/errors.js';

/**
 * ── Why this file exists ─────────────────────────────────────────────────────
 * A LangGraph node function has a FIXED signature: `(state, config) => update`.
 * It only receives the shared `state` and a `config` object — there's no other
 * way to inject dependencies. But our nodes need things that don't belong in the
 * state: the LLM client, the data providers, and a way to EMIT progress events
 * to the UI.
 *
 * LangGraph lets you pass arbitrary runtime values through `config.configurable`.
 * So at run time we stash an `AgentContext` there, and each node pulls it back
 * out with `getContext(config)`. This keeps nodes pure-ish and testable: swap
 * the providers/LLM/emit in `config`, and the same node code runs against fakes.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface AgentContext {
  /** The LLM used by the analyze/decide nodes. */
  llm: LLMProvider;
  /** Resolver + fundamentals + market + news tools used by the gather node. */
  providers: DataProviders;
  /** Investor lens; influences the decide rubric. */
  persona: Persona;
  /** Push a progress/result/error event to the caller (drives the SSE stream). */
  emit: (event: ResearchEvent) => void;
  /** Optional cancellation signal (e.g. client disconnected). */
  signal?: AbortSignal;
}

/** Stash the context under a single key inside `config.configurable`. */
export function withContext(ctx: AgentContext): RunnableConfig {
  return { configurable: { ctx } };
}

/** Retrieve the context inside a node; fail loudly if the graph was misconfigured. */
export function getContext(config: RunnableConfig): AgentContext {
  const ctx = config.configurable?.ctx as AgentContext | undefined;
  if (!ctx) {
    throw new AppError('Internal', 'Agent context missing from graph config.');
  }
  return ctx;
}
