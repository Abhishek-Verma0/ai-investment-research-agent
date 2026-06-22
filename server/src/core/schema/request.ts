import { z } from 'zod';
import { PersonaSchema } from './company.js';

/** Validated body for POST /api/research. */
export const ResearchRequestSchema = z.object({
  companyName: z
    .string({ required_error: 'companyName is required', invalid_type_error: 'companyName must be a string' })
    .trim()
    .min(1, 'companyName cannot be empty')
    .max(120),
  persona: PersonaSchema.default('balanced'),
});
export type ResearchRequest = z.infer<typeof ResearchRequestSchema>;

/** Validated body for POST /api/compare — two companies, one persona. */
export const CompareRequestSchema = z.object({
  a: z.string().trim().min(1).max(120),
  b: z.string().trim().min(1).max(120),
  persona: PersonaSchema.default('balanced'),
});
export type CompareRequest = z.infer<typeof CompareRequestSchema>;
