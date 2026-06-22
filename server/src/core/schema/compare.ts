import { z } from 'zod';
import type { AppErrorCode } from '../../lib/errors.js';
import type { ResearchEvent } from './events.js';

/** Which side of the comparison an event/verdict belongs to. */
export type Side = 'a' | 'b';

/**
 * The head-to-head summary the LLM produces after both verdicts are in.
 * `winner` is the relatively more attractive opportunity for the chosen persona
 * (or 'tie'). This is the only LLM-generated part of compare beyond the two runs.
 */
export const CompareSummarySchema = z.object({
  winner: z.enum(['a', 'b', 'tie']),
  rationale: z.string(),
});
export type CompareSummary = z.infer<typeof CompareSummarySchema>;

/**
 * The compare SSE wire protocol. We WRAP the single-company `ResearchEvent`s with
 * a `side` tag (so the UI can route them into two timelines) rather than changing
 * the core event type. Both sides stream in parallel; a final `summary` event
 * arrives once both verdicts exist.
 */
export type CompareEvent =
  | { type: 'side'; side: Side; event: ResearchEvent }
  | { type: 'summary'; winner: 'a' | 'b' | 'tie'; rationale: string; aName: string; bName: string }
  | { type: 'error'; code: AppErrorCode; message: string };
