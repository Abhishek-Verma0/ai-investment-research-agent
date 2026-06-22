import type { RunnableConfig } from '@langchain/core/runnables';
import type { ResearchState } from '../state.js';
import { getContext } from '../context.js';
import { AppError } from '../../../lib/errors.js';
import type { Source } from '../../schema/index.js';
import type { Fundamentals, MarketSnapshot, NewsItem } from '../../providers/data/types.js';

/**
 * NODE 2 — gather
 * ---------------
 * Fetch the raw evidence: fundamentals, a market snapshot, and recent news.
 *
 * Key ideas demonstrated here:
 *  1. PARALLELISM. The three calls are independent, so we fire them together
 *     with `Promise.all` instead of awaiting one-by-one — roughly 3x faster.
 *  2. FAULT TOLERANCE. The data tools return a `DataResult` ({ ok, data | error })
 *     and never throw. A failed source becomes a recorded `dataGap`, and the run
 *     continues with whatever it got. One flaky API can't kill the analysis.
 *  3. CITATIONS. Every successful source is pushed into a `sources[]` array; its
 *     position (index) becomes the id that evidence will cite later.
 */
export async function gatherNode(
  state: ResearchState,
  config: RunnableConfig,
): Promise<Partial<ResearchState>> {
  const { providers, emit } = getContext(config);
  const company = state.company;
  if (!company) {
    // Should never happen (resolve runs first), but be explicit.
    throw new AppError('Internal', 'gather ran before a company was resolved.');
  }

  emit({ type: 'step', node: 'gather', status: 'start', detail: 'Fetching fundamentals, market & news' });

  // Run all three tools at once. `Promise.all` waits for every one to settle;
  // because the tools never throw, none of them can reject the whole batch.
  const [fRes, mRes, nRes] = await Promise.all([
    providers.fundamentals.getFundamentals(company),
    providers.market.getMarketSnapshot(company),
    providers.news.getNews(company),
  ]);

  const sources: Source[] = [];
  const dataGaps: string[] = [];

  let fundamentals: Fundamentals | undefined;
  if (fRes.ok) {
    fundamentals = fRes.data;
    sources.push(fRes.source); // becomes source id = current length-1
  } else {
    dataGaps.push(`Fundamentals: ${fRes.error}`);
  }

  let market: MarketSnapshot | undefined;
  if (mRes.ok) {
    market = mRes.data;
    sources.push(mRes.source);
  } else {
    dataGaps.push(`Market data: ${mRes.error}`);
  }

  // Each news item is registered as its own citable source so the model can
  // attribute a specific claim to a specific article.
  let news: NewsItem[] | undefined;
  if (nRes.ok) {
    news = nRes.data;
    for (const item of nRes.data) {
      sources.push({ title: item.title, url: item.url, accessedAt: new Date().toISOString() });
    }
  } else {
    dataGaps.push(`News: ${nRes.error}`);
  }

  emit({
    type: 'step',
    node: 'gather',
    status: 'done',
    detail: `${sources.length} sources collected${dataGaps.length ? `, ${dataGaps.length} gap(s)` : ''}`,
  });

  // `sources` replaces (last-write-wins); `dataGaps` appends (reducer). See state.ts.
  return { fundamentals, market, news, sources, dataGaps };
}
