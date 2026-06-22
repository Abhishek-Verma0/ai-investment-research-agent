import YahooFinance from 'yahoo-finance2';
import { AppError } from '../../../lib/errors.js';
import { TTLCache } from '../../../lib/cache.js';
import type { CompanyIdentity, Market, Source } from '../../schema/index.js';
import type {
  CompanyResolver,
  DataResult,
  FundamentalsProvider,
  Fundamentals,
  MarketProvider,
  MarketSnapshot,
  NewsProvider,
  NewsItem,
} from './types.js';

/**
 * Yahoo Finance data provider — keyless and covers both US and Indian (NSE/BSE)
 * equities, so it backs resolution, fundamentals, market snapshot, and news in
 * one place (see DECISIONS.md D8). Each method returns a `DataResult`; failures
 * are reported, never thrown, so one flaky call can't crash a research run.
 */

// Exchange-code → market, with a preference weight so the resolver picks the
// PRIMARY listing rather than a higher-scored foreign GDR cross-listing.
//
// Indian exchanges (NSE/BSE) are ranked ABOVE US ones on purpose: for a company
// dual-listed in India and the US (e.g. Infosys → INFY on NYSE + INFY.NS on NSE,
// or Tata Motors → TTM ADR + TATAMOTORS.NS), we prefer the HOME Indian listing
// in INR. US-only companies are unaffected (they have no Indian listing to win).
const EXCHANGE_INFO: Record<string, { market: Market; pref: number }> = {
  NSI: { market: 'IN', pref: 120 }, // NSE (home listing — highest preference)
  BSE: { market: 'IN', pref: 115 }, // BSE
  NMS: { market: 'US', pref: 100 }, // Nasdaq
  NYQ: { market: 'US', pref: 100 }, // NYSE
  NGM: { market: 'US', pref: 90 },
  NCM: { market: 'US', pref: 90 },
  ASE: { market: 'US', pref: 85 }, // NYSE American
  PCX: { market: 'US', pref: 80 },
  BTS: { market: 'US', pref: 70 },
};

type SearchQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  exchDisp?: string;
  quoteType?: string;
  score?: number;
};

function classify(exchange?: string): { market: Market; pref: number } {
  if (exchange && EXCHANGE_INFO[exchange]) return EXCHANGE_INFO[exchange];
  return { market: 'OTHER', pref: 0 };
}

function source(title: string, url?: string): Source {
  return { title, url, accessedAt: new Date().toISOString() };
}

// Caches are MODULE-LEVEL (not per-instance) so they survive across requests —
// `createDataProviders()` makes a fresh provider per run, but they share these.
// Short TTL keeps data reasonably fresh while absorbing repeat lookups.
const CACHE_TTL_MS = 5 * 60_000;
const resolveCache = new TTLCache<CompanyIdentity>(CACHE_TTL_MS);
const fundamentalsCache = new TTLCache<DataResult<Fundamentals>>(CACHE_TTL_MS);
const marketCache = new TTLCache<DataResult<MarketSnapshot>>(CACHE_TTL_MS);
const newsCache = new TTLCache<DataResult<NewsItem[]>>(CACHE_TTL_MS);

export class YahooDataProvider
  implements CompanyResolver, FundamentalsProvider, MarketProvider, NewsProvider
{
  readonly id = 'yahoo';
  private readonly yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

  /** Cache only SUCCESSFUL data results — transient failures must not stick. */
  private async cachedData<T>(
    cache: TTLCache<DataResult<T>>,
    key: string,
    compute: () => Promise<DataResult<T>>,
  ): Promise<DataResult<T>> {
    const hit = cache.get(key);
    if (hit) return hit;
    const result = await compute();
    if (result.ok) cache.set(key, result);
    return result;
  }

  async resolve(name: string): Promise<CompanyIdentity> {
    // Only successes are cached (getOrSet doesn't cache rejected promises).
    return resolveCache.getOrSet(name.trim().toLowerCase(), () => this.resolveUncached(name));
  }

  private async resolveUncached(name: string): Promise<CompanyIdentity> {
    let quotes: SearchQuote[];
    try {
      const res = await this.yf.search(name);
      quotes = (res.quotes as SearchQuote[]).filter((q) => q.quoteType === 'EQUITY' && q.symbol);
    } catch (err) {
      throw new AppError('ProviderError', `Company resolution failed: ${msg(err)}`, {
        cause: err,
      });
    }

    if (quotes.length === 0) {
      throw new AppError(
        'CompanyNotFound',
        `Couldn't find a publicly listed company matching "${name}". It may be private, ` +
          `unlisted, or misspelled — try the full legal name or a ticker.`,
      );
    }

    // Rank by primary-exchange preference first (Indian listings win ties — see
    // EXCHANGE_INFO), then Yahoo's relevance score.
    const ranked = quotes
      .map((q) => ({ q, ...classify(q.exchange) }))
      .sort((a, b) => b.pref - a.pref || (b.q.score ?? 0) - (a.q.score ?? 0));

    const best = ranked[0]!;
    const q = best.q;

    // Confidence: a primary US/IN listing is high-confidence; an obscure/foreign
    // cross-listing is flagged lower so the UI can caveat it.
    const confidence = best.pref >= 95 ? 0.95 : best.pref >= 70 ? 0.8 : 0.5;

    return {
      name: q.longname ?? q.shortname ?? name,
      ticker: q.symbol,
      exchange: q.exchDisp ?? q.exchange,
      market: best.market,
      isPublic: true,
      confidence,
    };
  }

  async getFundamentals(company: CompanyIdentity): Promise<DataResult<Fundamentals>> {
    if (!company.ticker) return { ok: false, error: 'No ticker to look up fundamentals.' };
    const ticker = company.ticker;
    return this.cachedData(fundamentalsCache, ticker, async () => {
      try {
        const s = await this.yf.quoteSummary(ticker, {
          modules: ['summaryDetail', 'financialData', 'defaultKeyStatistics', 'summaryProfile'],
        });
        const fd = s.financialData;
        const sd = s.summaryDetail;
        const ks = s.defaultKeyStatistics;
        const profile = s.summaryProfile;
        const data: Fundamentals = {
          marketCap: num(sd?.marketCap),
          peRatio: num(sd?.trailingPE),
          forwardPE: num(sd?.forwardPE),
          pbRatio: num(ks?.priceToBook),
          eps: num(ks?.trailingEps),
          revenue: num(fd?.totalRevenue),
          revenueGrowthYoY: num(fd?.revenueGrowth),
          netIncome: num(ks?.netIncomeToCommon),
          profitMargin: num(fd?.profitMargins),
          debtToEquity: num(fd?.debtToEquity),
          freeCashFlow: num(fd?.freeCashflow),
          dividendYield: num(sd?.dividendYield),
          beta: num(sd?.beta),
          targetMeanPrice: num(fd?.targetMeanPrice),
          recommendation: fd?.recommendationKey ?? undefined,
          sector: profile?.sector ?? undefined,
          industry: profile?.industry ?? undefined,
          currency: fd?.financialCurrency ?? undefined,
          asOf: new Date().toISOString(),
        };
        return {
          ok: true,
          data,
          source: source(`Yahoo Finance — fundamentals (${ticker})`, financeUrl(ticker)),
        };
      } catch (err) {
        return { ok: false, error: `Fundamentals unavailable: ${msg(err)}` };
      }
    });
  }

  async getMarketSnapshot(company: CompanyIdentity): Promise<DataResult<MarketSnapshot>> {
    if (!company.ticker) return { ok: false, error: 'No ticker to look up market data.' };
    const ticker = company.ticker;
    return this.cachedData(marketCache, ticker, async () => {
      try {
        const q = await this.yf.quote(ticker);
        const data: MarketSnapshot = {
          price: num(q.regularMarketPrice),
          currency: q.currency ?? undefined,
          change: num(q.regularMarketChange),
          changePercent: num(q.regularMarketChangePercent),
          dayHigh: num(q.regularMarketDayHigh),
          dayLow: num(q.regularMarketDayLow),
          previousClose: num(q.regularMarketPreviousClose),
          volume: num(q.regularMarketVolume),
          marketCap: num(q.marketCap),
          high52w: num(q.fiftyTwoWeekHigh),
          low52w: num(q.fiftyTwoWeekLow),
          asOf: new Date().toISOString(),
        };
        return {
          ok: true,
          data,
          source: source(`Yahoo Finance — quote (${ticker})`, financeUrl(ticker)),
        };
      } catch (err) {
        return { ok: false, error: `Market data unavailable: ${msg(err)}` };
      }
    });
  }

  async getNews(company: CompanyIdentity, limit = 6): Promise<DataResult<NewsItem[]>> {
    return this.cachedData(newsCache, company.name.toLowerCase(), async () => {
      try {
        const res = await this.yf.search(company.name);
        const items: NewsItem[] = (res.news ?? []).slice(0, limit).map((n) => ({
          title: n.title,
          url: n.link,
          snippet: n.publisher,
          publishedAt: n.providerPublishTime
            ? new Date(n.providerPublishTime).toISOString()
            : undefined,
        }));
        if (items.length === 0) return { ok: false, error: 'No recent news found.' };
        return { ok: true, data: items, source: source('Yahoo Finance — news') };
      } catch (err) {
        return { ok: false, error: `News unavailable: ${msg(err)}` };
      }
    });
  }
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function financeUrl(ticker: string): string {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`;
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
