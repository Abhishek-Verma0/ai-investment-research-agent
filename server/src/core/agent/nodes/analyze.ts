import type { RunnableConfig } from '@langchain/core/runnables';
import type { ResearchState } from '../state.js';
import { getContext } from '../context.js';
import { SignalsSchema } from '../../schema/index.js';

/**
 * NODE 3 — analyze
 * ----------------
 * Turn the raw numbers + headlines into structured, scored SIGNALS across six
 * dimensions (financial health, growth, valuation, profitability, sentiment,
 * risk). This is the first LLM call.
 *
 * We use `llm.generateStructured(prompt, SignalsSchema)`. Under the hood that
 * asks Gemini to return JSON matching the Zod schema and validates it — so this
 * node always returns a well-typed `Signals` object (or throws SchemaValidation
 * after a repair-retry). No brittle string parsing.
 */
export async function analyzeNode(
  state: ResearchState,
  config: RunnableConfig,
): Promise<Partial<ResearchState>> {
  const { llm, emit } = getContext(config);

  emit({ type: 'step', node: 'analyze', status: 'start', detail: 'Scoring financial & qualitative signals' });

  const prompt = buildAnalyzePrompt(state);

  const signals = await llm.generateStructured(prompt, SignalsSchema, {
    system:
      'You are a rigorous equity research analyst. Score each dimension from -100 ' +
      '(strongly bearish) to +100 (strongly bullish). Base every judgment ONLY on ' +
      'the evidence provided. Never invent numbers. When you reference a fact, cite ' +
      'the source by its numeric id in `evidenceSourceIds`. If data is missing, say ' +
      'so in the summary and reflect the uncertainty in the score.',
    temperature: 0.2,
  });

  emit({
    type: 'step',
    node: 'analyze',
    status: 'done',
    detail: `${signals.dimensions.length} dimensions scored`,
  });

  return { signals };
}

/**
 * Build the analyze prompt. We hand the model a compact, explicit view of the
 * evidence — including the numbered source list — so it can cite by id.
 */
function buildAnalyzePrompt(state: ResearchState): string {
  const { company, fundamentals, market, news, sources, dataGaps } = state;

  const sourceList = sources
    .map((s, i) => `  [${i}] ${s.title}${s.url ? ` — ${s.url}` : ''}`)
    .join('\n');

  return [
    `COMPANY: ${company?.name} (${company?.ticker ?? 'n/a'}, ${company?.market} market)`,
    '',
    'FUNDAMENTALS:',
    fundamentals ? JSON.stringify(fundamentals, null, 2) : '  (unavailable)',
    '',
    'MARKET SNAPSHOT:',
    market ? JSON.stringify(market, null, 2) : '  (unavailable)',
    '',
    'RECENT NEWS HEADLINES:',
    news && news.length
      ? news.map((n) => `  - ${n.title}${n.publishedAt ? ` (${n.publishedAt})` : ''}`).join('\n')
      : '  (unavailable)',
    '',
    'SOURCES (cite these by numeric id):',
    sourceList || '  (none)',
    '',
    dataGaps.length ? `KNOWN DATA GAPS:\n${dataGaps.map((g) => `  - ${g}`).join('\n')}` : '',
    '',
    'TASK: Produce a `dimensions` array scoring the six required dimensions, plus a ' +
      '`dataGaps` array noting anything that limited your analysis.',
  ].join('\n');
}
