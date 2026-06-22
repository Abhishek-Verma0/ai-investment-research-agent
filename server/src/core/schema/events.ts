import { z } from 'zod';
import { VerdictSchema } from './verdict.js';
import { AppErrorCode } from '../../lib/errors.js';

/**
 * Names of the agent's graph nodes — used in `step` events so the UI can render
 * a live progress timeline ("Resolving company…", "Gathering data…", etc.).
 */
export const NodeNameSchema = z.enum(['resolve', 'gather', 'analyze', 'decide']);
export type NodeName = z.infer<typeof NodeNameSchema>;

/**
 * The SSE wire contract: a discriminated union streamed from server → client.
 * Every research run terminates in exactly one `verdict` OR one `error` event,
 * so the UI never hangs.
 *
 * - `step`    — a node started/finished (drives the progress timeline)
 * - `token`   — incremental LLM text (optional live "thinking" stream)
 * - `verdict` — the final result
 * - `error`   — a typed failure
 */
const errorCodes: [AppErrorCode, ...AppErrorCode[]] = [
  'CompanyNotFound',
  'Ambiguous',
  'DataUnavailable',
  'ProviderError',
  'RateLimited',
  'SchemaValidation',
  'Timeout',
  'BadRequest',
  'Internal',
];

export const ResearchEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('step'),
    node: NodeNameSchema,
    status: z.enum(['start', 'done']),
    detail: z.string().optional(),
  }),
  z.object({
    type: z.literal('token'),
    text: z.string(),
  }),
  z.object({
    type: z.literal('verdict'),
    data: VerdictSchema,
  }),
  z.object({
    type: z.literal('error'),
    code: z.enum(errorCodes),
    message: z.string(),
  }),
]);
export type ResearchEvent = z.infer<typeof ResearchEventSchema>;
