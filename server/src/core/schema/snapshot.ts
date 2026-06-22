import { z } from 'zod';

/**
 * Live market snapshot + fundamentals. These are the RAW numbers the gather node
 * collects from the data provider. We attach them to the Verdict so the UI can
 * show a real company snapshot (live price, day move, 52w range, valuation, …),
 * not just the handful of metrics the model chose to cite.
 *
 * Every field is optional — free data sources have gaps, and a missing field is
 * simply not rendered.
 */
export const MarketSnapshotSchema = z.object({
  price: z.number().optional(),
  currency: z.string().optional(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
  dayHigh: z.number().optional(),
  dayLow: z.number().optional(),
  previousClose: z.number().optional(),
  volume: z.number().optional(),
  marketCap: z.number().optional(),
  high52w: z.number().optional(),
  low52w: z.number().optional(),
  asOf: z.string().optional(),
});
export type MarketSnapshot = z.infer<typeof MarketSnapshotSchema>;

export const FundamentalsSchema = z.object({
  marketCap: z.number().optional(),
  peRatio: z.number().optional(),
  forwardPE: z.number().optional(),
  pbRatio: z.number().optional(),
  eps: z.number().optional(),
  revenue: z.number().optional(),
  revenueGrowthYoY: z.number().optional(),
  netIncome: z.number().optional(),
  profitMargin: z.number().optional(),
  debtToEquity: z.number().optional(),
  freeCashFlow: z.number().optional(),
  dividendYield: z.number().optional(),
  beta: z.number().optional(),
  targetMeanPrice: z.number().optional(),
  recommendation: z.string().optional(),
  sector: z.string().optional(),
  industry: z.string().optional(),
  currency: z.string().optional(),
  asOf: z.string().optional(),
});
export type Fundamentals = z.infer<typeof FundamentalsSchema>;
