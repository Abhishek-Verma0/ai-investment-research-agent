import { z } from 'zod';
import { CompanyIdentitySchema } from './company.js';
import { FundamentalsSchema, MarketSnapshotSchema } from './snapshot.js';

/** Final recommendation. WATCH = "not now, but track" (see DECISIONS.md §1.5). */
export const DecisionSchema = z.enum(['INVEST', 'PASS', 'WATCH']);
export type Decision = z.infer<typeof DecisionSchema>;

/**
 * A claim backed by source references (indices into `sources`).
 *
 * NOTE: this is a FACTORY, not a single shared schema instance. Gemini's
 * structured-output `response_schema` does not accept JSON-Schema `$ref`, and the
 * zod→JSON-Schema converter emits a `$ref` whenever the SAME schema object is
 * reused (e.g. in both `bull` and `bear`). Calling the factory gives each field a
 * distinct instance, so everything inlines and no `$ref` is produced.
 */
export const makeEvidencePoint = () =>
  z.object({
    claim: z.string(),
    sourceIds: z.array(z.number().int().nonnegative()).default([]),
  });

export const EvidencePointSchema = makeEvidencePoint();
export type EvidencePoint = z.infer<typeof EvidencePointSchema>;

/** A single quantitative metric the agent relied on, with provenance. */
export const MetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  asOf: z.string().optional(),
  sourceId: z.number().int().nonnegative().optional(),
});
export type Metric = z.infer<typeof MetricSchema>;

/** A cited source. Index/position in the array is its referenceable id. */
export const SourceSchema = z.object({
  title: z.string(),
  url: z.string().url().optional(),
  accessedAt: z.string(),
});
export type Source = z.infer<typeof SourceSchema>;

/**
 * The canonical agent output. This is the wire contract the client renders;
 * the `decide` node must produce a value that validates against this schema
 * (one repair-retry on failure — see CONVENTIONS.md).
 */
/**
 * The subset of a Verdict the LLM actually generates in the `decide` node. We
 * deliberately DON'T ask the model to echo back `company`, `sources`, or
 * `generatedAt` — those are deterministic facts we already hold, so we attach
 * them in code. Smaller ask = fewer ways for the model to get it wrong.
 */
export const DecisionDraftSchema = z.object({
  decision: DecisionSchema,
  conviction: z.number().min(0).max(100),
  thesis: z.string(),
  // Distinct instances (see makeEvidencePoint) so no `$ref` reaches Gemini.
  bull: z.array(makeEvidencePoint()).default([]),
  bear: z.array(makeEvidencePoint()).default([]),
  keyMetrics: z.array(MetricSchema).default([]),
  whatWouldChangeMyMind: z.array(z.string()).default([]),
});
export type DecisionDraft = z.infer<typeof DecisionDraftSchema>;

export const VerdictSchema = z.object({
  company: CompanyIdentitySchema,
  decision: DecisionSchema,
  conviction: z.number().min(0).max(100),
  thesis: z.string(),
  bull: z.array(EvidencePointSchema).default([]),
  bear: z.array(EvidencePointSchema).default([]),
  keyMetrics: z.array(MetricSchema).default([]),
  whatWouldChangeMyMind: z.array(z.string()).default([]),
  sources: z.array(SourceSchema).default([]),
  disclaimers: z.array(z.string()).default([]),
  // Live snapshot the gather node collected — attached in code so the UI can
  // show real company data (price, valuation, …), not just cited metrics.
  market: MarketSnapshotSchema.optional(),
  fundamentals: FundamentalsSchema.optional(),
  generatedAt: z.string(),
});
export type Verdict = z.infer<typeof VerdictSchema>;
