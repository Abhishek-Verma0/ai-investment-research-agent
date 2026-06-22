import { getConfig } from '../../config/index.js';
import { YahooDataProvider } from './yahoo.js';
import { TavilyNewsProvider } from './tavily.js';
import { FallbackNewsProvider } from './fallback.js';
import type {
  CompanyResolver,
  FundamentalsProvider,
  MarketProvider,
  NewsProvider,
} from './types.js';

export type {
  CompanyResolver,
  FundamentalsProvider,
  MarketProvider,
  NewsProvider,
  DataResult,
  Fundamentals,
  MarketSnapshot,
  NewsItem,
} from './types.js';

/**
 * The data tools the `gather` node uses. Yahoo (keyless, US+India) backs
 * resolution, fundamentals and market data; news prefers Tavily when a key is
 * configured and falls back to Yahoo otherwise. A single Yahoo instance is
 * shared across the providers.
 */
export interface DataProviders {
  resolver: CompanyResolver;
  fundamentals: FundamentalsProvider;
  market: MarketProvider;
  news: NewsProvider;
}

export function createDataProviders(): DataProviders {
  const cfg = getConfig();
  const yahoo = new YahooDataProvider();
  // With a Tavily key: use Tavily but fall back to Yahoo on any failure
  // (quota/429, bad key, timeout, or empty results). Without a key: Yahoo only.
  const news: NewsProvider = cfg.TAVILY_API_KEY
    ? new FallbackNewsProvider(new TavilyNewsProvider(cfg.TAVILY_API_KEY), yahoo)
    : yahoo;

  return { resolver: yahoo, fundamentals: yahoo, market: yahoo, news };
}
