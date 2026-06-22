// Provider abstraction barrel.
//   LLM:  createLLMProvider()      → configured LLMProvider (Gemini)
//   Data: createDataProviders()    → resolver + fundamentals + market + news
export { createLLMProvider } from './llm/index.js';
export { createDataProviders, type DataProviders } from './data/index.js';

export type { LLMProvider, LLMGenerateOptions } from './llm/types.js';
export type {
  DataResult,
  Fundamentals,
  MarketSnapshot,
  NewsItem,
  CompanyResolver,
  FundamentalsProvider,
  MarketProvider,
  NewsProvider,
} from './data/types.js';
