import { getConfig } from '../../config/index.js';
import { AppError } from '../../../lib/errors.js';
import { GeminiLLMProvider } from './gemini.js';
import type { LLMProvider } from './types.js';

export type { LLMProvider, LLMGenerateOptions } from './types.js';

/**
 * Builds the configured LLM provider. Adding a provider = one `case` + one impl
 * file; callers depend only on the `LLMProvider` interface.
 */
export function createLLMProvider(): LLMProvider {
  const cfg = getConfig();
  switch (cfg.LLM_PROVIDER) {
    case 'gemini': {
      if (!cfg.GEMINI_API_KEY) {
        throw new AppError(
          'ProviderError',
          'GEMINI_API_KEY is not set. Add it to your .env (see .env.example).',
        );
      }
      return new GeminiLLMProvider({
        apiKey: cfg.GEMINI_API_KEY,
        model: cfg.GEMINI_MODEL,
      });
    }
    default:
      throw new AppError('ProviderError', `Unsupported LLM_PROVIDER: ${cfg.LLM_PROVIDER}`);
  }
}
