import type { CompanyIdentity, Source } from '../../schema/index.js';
import type { DataResult, NewsProvider, NewsItem } from './types.js';

/**
 * Tavily web/news search — richer qualitative research with citations than the
 * keyless Yahoo news feed. Used only when TAVILY_API_KEY is set; otherwise the
 * factory falls back to Yahoo. Called via REST (no SDK dependency).
 */
export class TavilyNewsProvider implements NewsProvider {
  readonly id = 'tavily';
  constructor(private readonly apiKey: string) {}

  async getNews(company: CompanyIdentity, limit = 6): Promise<DataResult<NewsItem[]>> {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          query: `${company.name} stock investment news outlook risks`,
          topic: 'news',
          search_depth: 'basic',
          max_results: limit,
        }),
      });

      if (!res.ok) {
        return { ok: false, error: `Tavily HTTP ${res.status}` };
      }

      const json = (await res.json()) as {
        results?: { title: string; url: string; content?: string; published_date?: string }[];
      };
      const items: NewsItem[] = (json.results ?? []).map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content,
        publishedAt: r.published_date,
      }));

      if (items.length === 0) return { ok: false, error: 'No web results found.' };
      const source: Source = { title: 'Tavily web search', accessedAt: new Date().toISOString() };
      return { ok: true, data: items, source };
    } catch (err) {
      return { ok: false, error: `Tavily unavailable: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
}
