// Wire types — the client-side mirror of the server's Zod contracts
// (server/src/core/schema). Kept as plain TS types since the client only reads
// these shapes off the SSE stream. If the server contract changes, update here.

export type Persona = 'growth' | 'value' | 'balanced';
export type Decision = 'INVEST' | 'PASS' | 'WATCH';
export type Market = 'US' | 'IN' | 'OTHER';
export type NodeName = 'resolve' | 'gather' | 'analyze' | 'decide';

export interface EvidencePoint {
  claim: string;
  sourceIds: number[];
}

export interface Metric {
  label: string;
  value: string;
  asOf?: string;
  sourceId?: number;
}

export interface Source {
  title: string;
  url?: string;
  accessedAt: string;
}

export interface CompanyIdentity {
  name: string;
  ticker?: string;
  exchange?: string;
  market: Market;
  isPublic: boolean;
  confidence: number;
}

export interface MarketSnapshot {
  price?: number;
  currency?: string;
  change?: number;
  changePercent?: number;
  dayHigh?: number;
  dayLow?: number;
  previousClose?: number;
  volume?: number;
  marketCap?: number;
  high52w?: number;
  low52w?: number;
  asOf?: string;
}

export interface Fundamentals {
  marketCap?: number;
  peRatio?: number;
  forwardPE?: number;
  pbRatio?: number;
  eps?: number;
  revenue?: number;
  revenueGrowthYoY?: number;
  netIncome?: number;
  profitMargin?: number;
  debtToEquity?: number;
  freeCashFlow?: number;
  dividendYield?: number;
  beta?: number;
  targetMeanPrice?: number;
  recommendation?: string;
  sector?: string;
  industry?: string;
  currency?: string;
  asOf?: string;
}

export interface Verdict {
  company: CompanyIdentity;
  decision: Decision;
  conviction: number;
  thesis: string;
  bull: EvidencePoint[];
  bear: EvidencePoint[];
  keyMetrics: Metric[];
  whatWouldChangeMyMind: string[];
  sources: Source[];
  disclaimers: string[];
  market?: MarketSnapshot;
  fundamentals?: Fundamentals;
  generatedAt: string;
}

export type ResearchEvent =
  | { type: 'step'; node: NodeName; status: 'start' | 'done'; detail?: string }
  | { type: 'token'; text: string }
  | { type: 'verdict'; data: Verdict }
  | { type: 'error'; code: string; message: string };

// --- Compare ---
export type Side = 'a' | 'b';

export type CompareEvent =
  | { type: 'side'; side: Side; event: ResearchEvent }
  | { type: 'summary'; winner: 'a' | 'b' | 'tie'; rationale: string; aName: string; bName: string }
  | { type: 'error'; code: string; message: string };
