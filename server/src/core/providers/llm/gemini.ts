import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { z } from 'zod';
import { AppError } from '../../../lib/errors.js';
import type { LLMGenerateOptions, LLMProvider } from './types.js';

/**
 * Gemini implementation of the provider-neutral LLMProvider, built on LangChain's
 * ChatGoogleGenerativeAI (so it slots straight into LangGraph). Default model is
 * `gemini-3.1-flash-lite`. Swapping to another provider means writing one more
 * file like this — agent logic never changes (see DECISIONS.md D5).
 */
export class GeminiLLMProvider implements LLMProvider {
  readonly id = 'gemini';
  readonly model: string;
  private readonly apiKey: string;

  constructor(opts: { apiKey: string; model: string }) {
    this.apiKey = opts.apiKey;
    this.model = opts.model;
  }

  private client(opts?: LLMGenerateOptions) {
    return new ChatGoogleGenerativeAI({
      apiKey: this.apiKey,
      model: this.model,
      temperature: opts?.temperature ?? 0.2,
      maxOutputTokens: opts?.maxTokens,
    });
  }

  private messages(prompt: string, opts?: LLMGenerateOptions): BaseMessage[] {
    const msgs: BaseMessage[] = [];
    if (opts?.system) msgs.push(new SystemMessage(opts.system));
    msgs.push(new HumanMessage(prompt));
    return msgs;
  }

  async generateText(prompt: string, opts?: LLMGenerateOptions): Promise<string> {
    try {
      const res = await this.client(opts).invoke(this.messages(prompt, opts), {
        signal: opts?.signal,
      });
      return typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
    } catch (err) {
      throw new AppError('ProviderError', `Gemini generateText failed: ${asMessage(err)}`, {
        cause: err,
      });
    }
  }

  async generateStructured<S extends z.ZodTypeAny>(
    prompt: string,
    schema: S,
    opts?: LLMGenerateOptions,
  ): Promise<z.infer<S>> {
    // Cast around LangChain's Record-constrained generic; the Zod schema is the
    // real contract and guarantees the returned shape.
    const structured = this.client(opts).withStructuredOutput(schema as never);
    const messages = this.messages(prompt, opts);

    // One repair-retry: a single malformed structured response shouldn't fail a run.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return (await structured.invoke(messages, { signal: opts?.signal })) as z.infer<S>;
      } catch (err) {
        if (attempt === 1) {
          throw new AppError(
            'SchemaValidation',
            `Gemini structured output failed after retry: ${asMessage(err)}`,
            { cause: err },
          );
        }
      }
    }
    // Unreachable, but satisfies the type checker.
    throw new AppError('SchemaValidation', 'Gemini structured output failed.');
  }

  async *streamText(
    prompt: string,
    opts?: LLMGenerateOptions,
  ): AsyncIterable<string> {
    const stream = await this.client(opts).stream(this.messages(prompt, opts), {
      signal: opts?.signal,
    });
    for await (const chunk of stream) {
      const text =
        typeof chunk.content === 'string' ? chunk.content : JSON.stringify(chunk.content);
      if (text) yield text;
    }
  }
}

function asMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
