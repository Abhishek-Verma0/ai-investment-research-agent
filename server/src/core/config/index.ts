import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// The single .env lives at the REPO ROOT (next to .env.example). Workspace
// scripts run with cwd=server/, so we resolve the root explicitly rather than
// relying on cwd. This file sits at server/{src|dist}/core/config — four levels
// below the root. A local server/.env (if present) is also loaded as a fallback.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
loadDotenv({ path: path.join(repoRoot, '.env') });
loadDotenv(); // also pick up cwd/.env if one exists (does not override existing vars)

/**
 * Single source of truth for all runtime configuration.
 *
 * Every value is validated here at boot. If a required value is missing or
 * malformed the process fails fast with a clear, actionable message instead of
 * blowing up deep inside a request. Read config ONLY through `getConfig()` —
 * never `process.env` directly elsewhere in the codebase.
 */
const booleanish = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(8787),

  // LLM
  LLM_PROVIDER: z.enum(['gemini']).default('gemini'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.1-flash-lite'),

  // Data providers (optional until the tools that need them run)
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),

  // Feature flags
  PERSISTENCE_ENABLED: booleanish.default('false'),
  DATABASE_URL: z.string().optional(),

  // Hardening (M5)
  RUN_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
});

export type AppConfig = z.infer<typeof EnvSchema> & {
  isProd: boolean;
  isDev: boolean;
};

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cached) return cached;

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    // Fail fast — a misconfigured server should never start.
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const env = parsed.data;
  cached = {
    ...env,
    isProd: env.NODE_ENV === 'production',
    isDev: env.NODE_ENV === 'development',
  };
  return cached;
}
