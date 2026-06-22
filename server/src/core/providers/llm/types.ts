import type { z } from 'zod';

/**
 * Provider-neutral LLM interface. The agent depends on THIS, never on a concrete
 * SDK, so swapping Gemini → OpenAI/Anthropic is a config + one-impl change with
 * no edits to agent logic (see DECISIONS.md D5).
 */
export interface LLMGenerateOptions {
  /** System / instruction preamble. */
  system?: string;
  temperature?: number;
  maxTokens?: number;
  /** Abort signal for timeouts/cancellation. */
  signal?: AbortSignal;
}

export interface LLMProvider {
  /** Stable provider id, e.g. "gemini". */
  readonly id: string;
  /** Concrete model id, e.g. "gemini-3.1-flash-lite". */
  readonly model: string;

  /** Free-text completion. */
  generateText(prompt: string, opts?: LLMGenerateOptions): Promise<string>;

  /**
   * Structured completion validated against a Zod schema. Implementations should
   * use the provider's structured-output / function-calling support and perform
   * one repair-retry on validation failure before throwing SchemaValidation.
   *
   * Generic over the schema (`S`) so the return type is the schema's OUTPUT type
   * (`z.infer<S>`) — i.e. fields with `.default()` come back required, not optional.
   */
  generateStructured<S extends z.ZodTypeAny>(
    prompt: string,
    schema: S,
    opts?: LLMGenerateOptions,
  ): Promise<z.infer<S>>;

  /** Optional token stream, for live "thinking" UX. */
  streamText?(prompt: string, opts?: LLMGenerateOptions): AsyncIterable<string>;
}
