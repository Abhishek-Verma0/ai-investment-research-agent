import { logger } from '../../../lib/logger.js';
import type { CompanyIdentity } from '../../schema/index.js';
import type { DataResult, NewsItem, NewsProvider } from './types.js';

/**
 * Wraps two news providers: try `primary`, and if it fails (error, quota/429, or
 * no results) automatically fall back to `secondary`. This turns the optional
 * Tavily provider into a resilient one — a Tavily hiccup mid-run degrades to
 * Yahoo headlines instead of leaving a news data-gap.
 */
export class FallbackNewsProvider implements NewsProvider {
  readonly id: string;

  constructor(
    private readonly primary: NewsProvider,
    private readonly secondary: NewsProvider,
  ) {
    this.id = `${primary.id}->${secondary.id}`;
  }

  async getNews(company: CompanyIdentity, limit?: number): Promise<DataResult<NewsItem[]>> {
    try {
      const res = await this.primary.getNews(company, limit);
      if (res.ok) return res;
      logger.warn('news primary failed — falling back', {
        primary: this.primary.id,
        fallback: this.secondary.id,
        reason: res.error,
      });
    } catch (err) {
      logger.warn('news primary threw — falling back', {
        primary: this.primary.id,
        fallback: this.secondary.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return this.secondary.getNews(company, limit);
  }
}
