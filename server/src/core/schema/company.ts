import { z } from 'zod';

/**
 * Market the company is listed on. Drives which data providers + ticker
 * conventions apply (e.g. Indian listings use `.NS` / `.BSE` suffixes).
 */
export const MarketSchema = z.enum(['US', 'IN', 'OTHER']);
export type Market = z.infer<typeof MarketSchema>;

/** Investor lens that re-weights the decision rubric (see core/rubric, M6). */
export const PersonaSchema = z.enum(['growth', 'value', 'balanced']);
export type Persona = z.infer<typeof PersonaSchema>;

/**
 * Resolved company identity — the output of the `resolve` node. `confidence`
 * (0–1) reflects how sure resolution is; ambiguous/low-confidence resolutions
 * are surfaced to the user rather than silently trusted.
 */
export const CompanyIdentitySchema = z.object({
  name: z.string().min(1),
  ticker: z.string().optional(),
  exchange: z.string().optional(),
  market: MarketSchema,
  isPublic: z.boolean(),
  confidence: z.number().min(0).max(1),
});
export type CompanyIdentity = z.infer<typeof CompanyIdentitySchema>;
