import { z } from 'zod';

/**
 * The six analytical dimensions the `analyze` node scores. Kept deliberately
 * small and fixed so the rubric is consistent and explainable.
 */
export const SignalDimensionSchema = z.enum([
  'financialHealth',
  'growth',
  'valuation',
  'profitability',
  'sentiment',
  'risk',
]);
export type SignalDimension = z.infer<typeof SignalDimensionSchema>;

/** Directional read of a dimension, for at-a-glance UI coloring. */
export const DirectionSchema = z.enum(['positive', 'neutral', 'negative']);
export type Direction = z.infer<typeof DirectionSchema>;

/**
 * One scored dimension. `score` is -100..100 (negative = bearish). `evidence`
 * references sources by index into the run's `sources` array, so every claim is
 * traceable.
 */
export const SignalSchema = z.object({
  dimension: SignalDimensionSchema,
  direction: DirectionSchema,
  score: z.number().min(-100).max(100),
  summary: z.string(),
  evidenceSourceIds: z.array(z.number().int().nonnegative()).default([]),
});
export type Signal = z.infer<typeof SignalSchema>;

/** Full analyze-node output: the scored dimensions plus any recorded data gaps. */
export const SignalsSchema = z.object({
  dimensions: z.array(SignalSchema),
  dataGaps: z.array(z.string()).default([]),
});
export type Signals = z.infer<typeof SignalsSchema>;
