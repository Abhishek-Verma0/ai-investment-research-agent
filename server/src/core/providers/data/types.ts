import type { CompanyIdentity, Source } from '../../schema/index.js';
import type { Fundamentals, MarketSnapshot } from '../../schema/snapshot.js';

// Fundamentals & MarketSnapshot are defined as Zod schemas in schema/snapshot.ts
// (so they can live on the Verdict and be shared with the client). Re-exported
// here as the provider-facing types.
export type { Fundamentals, MarketSnapshot } from '../../schema/snapshot.js';

/**
 * Uniform result wrapper for every data tool. Tools NEVER throw to the agent: a
 * failure is returned as `{ ok: false, error }` and recorded as a data-gap, so a
 * single flaky API can't crash a research run (see ARCHITECTURE.md §5).
 */
export type DataResult<T> =
  | { ok: true; data: T; source: Source }
  | { ok: false; error: string };

/** A single news/web-research item with a citable URL. */
export interface NewsItem {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
}

/** Resolves a free-text company name to a structured identity. */
export interface CompanyResolver {
  readonly id: string;
  resolve(name: string): Promise<CompanyIdentity>;
}

export interface FundamentalsProvider {
  readonly id: string;
  getFundamentals(company: CompanyIdentity): Promise<DataResult<Fundamentals>>;
}

export interface MarketProvider {
  readonly id: string;
  getMarketSnapshot(company: CompanyIdentity): Promise<DataResult<MarketSnapshot>>;
}

export interface NewsProvider {
  readonly id: string;
  getNews(company: CompanyIdentity, limit?: number): Promise<DataResult<NewsItem[]>>;
}
