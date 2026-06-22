import { AnimatePresence, motion } from 'framer-motion';
import type { CompareSummary, SideState } from '../hooks/useCompare';
import { ProgressTimeline } from './ProgressTimeline';
import { VerdictCard } from './VerdictCard';

interface Props {
  a: SideState;
  b: SideState;
  summary: CompareSummary | null;
  running: boolean;
}

export function CompareView({ a, b, summary, running }: Props) {
  return (
    <div className="space-y-6">
      <AnimatePresence>
        {summary && <SummaryBanner summary={summary} />}
      </AnimatePresence>

      <div className="grid gap-5 md:grid-cols-2">
        <SideColumn side={a} highlight={summary?.winner === 'a'} running={running} />
        <SideColumn side={b} highlight={summary?.winner === 'b'} running={running} />
      </div>
    </div>
  );
}

function SideColumn({
  side,
  highlight,
  running,
}: {
  side: SideState;
  highlight?: boolean;
  running: boolean;
}) {
  return (
    <div
      className={`rounded-2xl transition ${
        highlight ? 'ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-[#060814]' : ''
      }`}
    >
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="truncate text-sm font-medium text-slate-300">
          {side.name || '—'}
        </span>
        {highlight && (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
            Preferred
          </span>
        )}
      </div>

      {side.error ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <span className="font-medium">{side.error.code}:</span> {side.error.message}
        </div>
      ) : side.verdict ? (
        <VerdictCard verdict={side.verdict} />
      ) : (
        // Still running this side — show its live timeline.
        running && <ProgressTimeline steps={side.steps} />
      )}
    </div>
  );
}

function SummaryBanner({ summary }: { summary: CompareSummary }) {
  const winnerName =
    summary.winner === 'a' ? summary.aName : summary.winner === 'b' ? summary.bName : 'Tie';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="glass-strong rounded-2xl p-5"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Head-to-head
        </span>
        <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-sm font-medium text-indigo-200">
          {summary.winner === 'tie' ? 'Too close to call' : `Edge: ${winnerName}`}
        </span>
      </div>
      <p className="mt-3 leading-relaxed text-slate-200">{summary.rationale}</p>
    </motion.div>
  );
}
