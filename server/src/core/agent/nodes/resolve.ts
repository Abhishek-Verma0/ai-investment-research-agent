import type { RunnableConfig } from '@langchain/core/runnables';
import type { ResearchState } from '../state.js';
import { getContext } from '../context.js';

/**
 * NODE 1 — resolve
 * ----------------
 * Turn the free-text company name into a concrete, tradeable identity
 * (ticker + exchange + market). Everything downstream needs a ticker, so this
 * runs first.
 *
 * A LangGraph node is just an async function `(state, config) => partialState`.
 * Whatever object it RETURNS is merged back into the shared state using the
 * channel rules from state.ts. Here we return `{ company }`, so the `company`
 * channel gets filled in for later nodes to read.
 *
 * If the company can't be found, `resolver.resolve` throws an AppError. We let
 * it propagate — the run orchestrator (run.ts) catches it and emits one `error`
 * event, so the stream always ends cleanly.
 */
export async function resolveNode(
  state: ResearchState,
  config: RunnableConfig,
): Promise<Partial<ResearchState>> {
  const { providers, emit } = getContext(config);

  // Tell the UI this step has started (drives the live progress timeline).
  emit({ type: 'step', node: 'resolve', status: 'start', detail: `Identifying "${state.companyName}"` });

  const company = await providers.resolver.resolve(state.companyName);

  emit({
    type: 'step',
    node: 'resolve',
    status: 'done',
    detail: `${company.name} · ${company.ticker ?? '—'} · ${company.exchange ?? company.market}`,
  });

  // Returning a partial state: only the fields we changed.
  return { company };
}
