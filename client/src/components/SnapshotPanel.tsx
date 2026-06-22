import { motion } from 'framer-motion';
import type { Fundamentals, MarketSnapshot } from '../types';
import { compact, money, num, pct } from '../lib/format';

/**
 * A live company snapshot: current price + day move, a 52-week range bar, and a
 * grid of valuation/quality stats. Renders only the fields that are available.
 */
export function SnapshotPanel({
  market,
  fundamentals,
}: {
  market?: MarketSnapshot;
  fundamentals?: Fundamentals;
}) {
  if (!market && !fundamentals) return null;
  const cur = market?.currency ?? fundamentals?.currency ?? 'USD';
  const up = (market?.change ?? 0) >= 0;

  const stats: { label: string; value: string | null }[] = [
    { label: 'Market cap', value: compact(market?.marketCap ?? fundamentals?.marketCap) },
    { label: 'P/E (TTM)', value: num(fundamentals?.peRatio) },
    { label: 'Fwd P/E', value: num(fundamentals?.forwardPE) },
    { label: 'EPS', value: num(fundamentals?.eps) },
    { label: 'Div yield', value: pct(fundamentals?.dividendYield, true) },
    { label: 'Beta', value: num(fundamentals?.beta) },
    { label: 'Analyst target', value: money(fundamentals?.targetMeanPrice, cur) },
    { label: 'Volume', value: compact(market?.volume) },
  ].filter((s) => s.value != null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Live snapshot
            {fundamentals?.sector && <span className="ml-2 text-slate-500">· {fundamentals.sector}</span>}
          </div>
          {market?.price != null && (
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-100">
                {money(market.price, cur)}
              </span>
              {(market.change != null || market.changePercent != null) && (
                <span className={`text-sm font-medium ${up ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {up ? '▲' : '▼'} {market.change != null ? money(Math.abs(market.change), cur) : ''}
                  {market.changePercent != null && ` (${pct(Math.abs(market.changePercent))})`}
                </span>
              )}
            </div>
          )}
        </div>
        {fundamentals?.recommendation && (
          <span
            title="Wall Street analyst consensus from Yahoo Finance — a third-party data point, not the agent's verdict"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs capitalize text-slate-300"
          >
            Wall St: {fundamentals.recommendation.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* 52-week range bar */}
      {market?.low52w != null && market?.high52w != null && market?.price != null && (
        <Range low={market.low52w} high={market.high52w} price={market.price} cur={cur} />
      )}

      {/* Stat grid */}
      {stats.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-white/[0.03] p-3">
              <div className="text-xs text-slate-400">{s.label}</div>
              <div className="mt-1 text-base font-semibold text-slate-100">{s.value}</div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function Range({ low, high, price, cur }: { low: number; high: number; price: number; cur: string }) {
  const span = high - low;
  const pos = span > 0 ? Math.min(100, Math.max(0, ((price - low) / span) * 100)) : 50;
  return (
    <div className="mt-4">
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>52w low {money(low, cur)}</span>
        <span>52w high {money(high, cur)}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500/60 to-violet-500/60"
          style={{ width: `${pos}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#060814] bg-white shadow"
          style={{ left: `${pos}%` }}
        />
      </div>
    </div>
  );
}
