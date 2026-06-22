import { createLLMProvider } from '../providers/llm/index.js';
import { describeRubric } from '../rubric/index.js';
import { CompareSummarySchema, type CompareEvent, type Persona, type Verdict } from '../schema/index.js';
import { runResearch } from './run.js';

export interface CompareInput {
  a: string;
  b: string;
  persona?: Persona;
  signal?: AbortSignal;
}

/**
 * Compare two companies. Runs the SAME single-company agent for each side IN
 * PARALLEL, forwarding every event tagged with its side ('a' | 'b') so the UI can
 * drive two live timelines at once. Once both verdicts are in, one extra LLM call
 * produces a head-to-head summary.
 *
 * Reuses `runResearch` entirely — compare adds no new agent logic, just
 * orchestration. A failure on one side doesn't abort the other (its error is
 * emitted as that side's event); the summary is only attempted if BOTH succeed.
 */
export async function compareResearch(
  input: CompareInput,
  onEvent: (event: CompareEvent) => void,
): Promise<void> {
  const persona: Persona = input.persona ?? 'balanced';

  const runSide = async (side: 'a' | 'b', name: string): Promise<Verdict | null> => {
    try {
      return await runResearch(
        { companyName: name, persona, signal: input.signal },
        (event) => onEvent({ type: 'side', side, event }),
      );
    } catch {
      // The error was already emitted as a side event by runResearch.
      return null;
    }
  };

  const [a, b] = await Promise.all([runSide('a', input.a), runSide('b', input.b)]);

  // Only summarize when we have two verdicts to actually compare.
  if (a && b) {
    try {
      const llm = createLLMProvider();
      const summary = await llm.generateStructured(
        buildComparePrompt(a, b, persona),
        CompareSummarySchema,
        {
          system:
            `You are comparing two potential investments for a specific investor persona.\n` +
            `${describeRubric(persona)}\n` +
            `Pick the relatively MORE attractive opportunity for this persona (or 'tie' if ` +
            `genuinely close). Be concise and reference the key differentiators.`,
          temperature: 0.3,
        },
      );
      onEvent({
        type: 'summary',
        winner: summary.winner,
        rationale: summary.rationale,
        aName: a.company.name,
        bName: b.company.name,
      });
    } catch {
      // Summary is best-effort; the two verdicts already stand on their own.
    }
  }
}

function buildComparePrompt(a: Verdict, b: Verdict, persona: Persona): string {
  const brief = (v: Verdict, label: string) =>
    [
      `--- ${label}: ${v.company.name} (${v.company.ticker ?? 'n/a'}) ---`,
      `Decision: ${v.decision} | Conviction: ${v.conviction}/100`,
      `Thesis: ${v.thesis}`,
      `Bull: ${v.bull.map((p) => p.claim).join('; ') || '—'}`,
      `Bear: ${v.bear.map((p) => p.claim).join('; ') || '—'}`,
      `Key metrics: ${v.keyMetrics.map((m) => `${m.label} ${m.value}`).join(', ') || '—'}`,
    ].join('\n');

  return [
    `Persona: ${persona}`,
    '',
    brief(a, 'A'),
    '',
    brief(b, 'B'),
    '',
    'TASK: Decide whether A or B (or tie) is the more attractive opportunity for this ' +
      'persona, with a short rationale citing the decisive differences.',
  ].join('\n');
}
