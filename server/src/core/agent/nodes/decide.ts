import type { RunnableConfig } from '@langchain/core/runnables';
import type { ResearchState } from '../state.js';
import { getContext } from '../context.js';
import { DecisionDraftSchema, type Verdict } from '../../schema/index.js';
import { describeRubric, weightedScore } from '../../rubric/index.js';

const DISCLAIMER =
  'This is AI-generated research for educational purposes only, not financial advice. ' +
  'Data may be delayed or incomplete. Do your own due diligence.';

/**
 * NODE 4 — decide
 * ---------------
 * The final judgment. Takes the scored signals and produces the recommendation.
 *
 * Two important design choices:
 *  1. The LLM only fills the JUDGMENT fields (`DecisionDraftSchema`): decision,
 *     conviction, thesis, bull/bear, metrics, what-would-change-my-mind. We then
 *     assemble the full `Verdict` in code by attaching the company, the sources,
 *     a disclaimer and a timestamp — facts we already hold and shouldn't risk the
 *     model mangling.
 *  2. The persona reshapes the emphasis via a system instruction.
 */
export async function decideNode(
  state: ResearchState,
  config: RunnableConfig,
): Promise<Partial<ResearchState>> {
  const { llm, persona, emit } = getContext(config);

  emit({ type: 'step', node: 'decide', status: 'start', detail: 'Weighing bull vs bear → verdict' });

  const prompt = buildDecidePrompt(state, persona);

  const draft = await llm.generateStructured(prompt, DecisionDraftSchema, {
    system:
      `You are a disciplined portfolio manager making an INVEST / PASS / WATCH call.\n` +
      `Persona — apply these weights when judging:\n${describeRubric(persona)}\n` +
      `WATCH means "promising but not now — track it". Be decisive but honest about ` +
      `uncertainty: lower the conviction (0–100) when data is thin. Cite sources by id ` +
      `in bull/bear claims. Never invent figures.`,
    temperature: 0.3,
  });

  // Assemble the full, schema-complete Verdict from the model's draft + our facts.
  const verdict: Verdict = {
    company: state.company!,
    ...draft,
    sources: state.sources,
    disclaimers: [DISCLAIMER],
    market: state.market,
    fundamentals: state.fundamentals,
    generatedAt: new Date().toISOString(),
  };

  emit({
    type: 'step',
    node: 'decide',
    status: 'done',
    detail: `${verdict.decision} · conviction ${verdict.conviction}`,
  });

  return { verdict };
}

function buildDecidePrompt(state: ResearchState, persona: ResearchState['persona']): string {
  const { company, signals, sources, dataGaps } = state;

  const sourceList = sources
    .map((s, i) => `  [${i}] ${s.title}${s.url ? ` — ${s.url}` : ''}`)
    .join('\n');

  // A transparent persona-weighted aggregate of the signal scores — a guide for
  // the model, not a hard rule.
  const guideScore = signals ? weightedScore(signals, persona) : 0;

  return [
    `COMPANY: ${company?.name} (${company?.ticker ?? 'n/a'}, ${company?.market} market)`,
    `RESOLUTION CONFIDENCE: ${company?.confidence}`,
    '',
    `PERSONA-WEIGHTED SIGNAL SCORE (guide, -100..100): ${guideScore}`,
    '',
    'SCORED SIGNALS:',
    JSON.stringify(signals?.dimensions ?? [], null, 2),
    '',
    dataGaps.length ? `DATA GAPS (factor into conviction):\n${dataGaps.map((g) => `  - ${g}`).join('\n')}` : 'DATA GAPS: none',
    '',
    'SOURCES (cite by id in bull/bear):',
    sourceList || '  (none)',
    '',
    'TASK: Decide INVEST / PASS / WATCH with a 0–100 conviction, a 3–5 sentence thesis, ' +
      'the strongest bull and bear points (each citing sources), the key metrics you ' +
      'relied on, and what would change your mind.',
  ].join('\n');
}
