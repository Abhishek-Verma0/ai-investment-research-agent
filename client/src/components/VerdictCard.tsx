import { motion } from 'framer-motion';
import type { Decision, EvidencePoint, Verdict } from '../types';
import { SnapshotPanel } from './SnapshotPanel';

const DECISION_STYLE: Record<
  Decision,
  { ring: string; text: string; chip: string; label: string; meaning: string }
> = {
  INVEST: {
    ring: 'from-emerald-400 to-teal-400',
    text: 'text-emerald-300',
    chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    label: 'INVEST',
    meaning: 'Attractive to buy now — the case outweighs the risks.',
  },
  WATCH: {
    ring: 'from-amber-400 to-orange-400',
    text: 'text-amber-300',
    chip: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    label: 'WATCH',
    meaning: 'Promising, but not yet — worth tracking for a better entry.',
  },
  PASS: {
    ring: 'from-rose-400 to-pink-400',
    text: 'text-rose-300',
    chip: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
    label: 'PASS',
    meaning: 'Not attractive right now — better to avoid.',
  },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export function VerdictCard({ verdict }: { verdict: Verdict }) {
  const s = DECISION_STYLE[verdict.decision];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      {/* Header: decision + conviction + company */}
      <motion.div variants={item} className="glass-strong rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-sm font-semibold tracking-wide ${s.chip}`}>
                {s.label}
              </span>
              <h2 className="text-xl font-semibold text-slate-100">{verdict.company.name}</h2>
            </div>
            {/* Plain-English meaning of THIS decision */}
            <p className={`mt-2 text-sm font-medium ${s.text}`}>{s.meaning}</p>
            <p className="mt-1 text-sm text-slate-400">
              {verdict.company.ticker ?? '—'} · {verdict.company.exchange ?? verdict.company.market}
              {verdict.company.confidence < 0.8 && (
                <span className="ml-2 text-amber-400/80">(low resolution confidence)</span>
              )}
            </p>
          </div>
          <ConvictionRing value={verdict.conviction} gradient={s.ring} accent={s.text} />
        </div>

        {/* Legend: what each verdict means */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span><span className="text-emerald-300">INVEST</span> buy now</span>
          <span><span className="text-amber-300">WATCH</span> not yet, track it</span>
          <span><span className="text-rose-300">PASS</span> avoid for now</span>
        </div>

        <p className="mt-5 leading-relaxed text-slate-200">{verdict.thesis}</p>
        <p className="mt-3 text-xs text-slate-500">
          Conviction = how confident the agent is in this{' '}
          <span className="font-medium text-slate-400">{verdict.decision}</span> call (0–100) — not a
          “buy score”. Any Wall-Street analyst rating shown below is a separate, third-party data point.
        </p>
      </motion.div>

      {/* Live company snapshot */}
      {(verdict.market || verdict.fundamentals) && (
        <motion.div variants={item}>
          <SnapshotPanel market={verdict.market} fundamentals={verdict.fundamentals} />
        </motion.div>
      )}

      {/* Bull / Bear */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div variants={item}>
          <EvidenceColumn title="Bull case" tone="emerald" points={verdict.bull} />
        </motion.div>
        <motion.div variants={item}>
          <EvidenceColumn title="Bear case" tone="rose" points={verdict.bear} />
        </motion.div>
      </div>

      {/* Key metrics */}
      {verdict.keyMetrics.length > 0 && (
        <motion.div variants={item} className="glass rounded-2xl p-5">
          <SectionTitle>Key metrics</SectionTitle>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {verdict.keyMetrics.map((m, i) => (
              <div key={i} className="rounded-xl bg-white/[0.03] p-3">
                <div className="text-xs text-slate-400">{m.label}</div>
                <div className="mt-1 text-lg font-semibold text-slate-100">{m.value}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* What would change my mind */}
      {verdict.whatWouldChangeMyMind.length > 0 && (
        <motion.div variants={item} className="glass rounded-2xl p-5">
          <SectionTitle>What would change my mind</SectionTitle>
          <ul className="mt-3 space-y-2">
            {verdict.whatWouldChangeMyMind.map((w, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <span className="text-indigo-300">→</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Sources */}
      {verdict.sources.length > 0 && (
        <motion.div variants={item} className="glass rounded-2xl p-5">
          <SectionTitle>Sources</SectionTitle>
          <ol className="mt-3 space-y-1.5">
            {verdict.sources.map((src, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="shrink-0 text-slate-500">[{i}]</span>
                {src.url ? (
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-300 underline-offset-2 hover:text-indigo-300 hover:underline"
                  >
                    {src.title}
                  </a>
                ) : (
                  <span className="text-slate-400">{src.title}</span>
                )}
              </li>
            ))}
          </ol>
        </motion.div>
      )}

      <p className="px-1 text-xs text-slate-500">{verdict.disclaimers[0]}</p>
    </motion.div>
  );
}

function EvidenceColumn({
  title,
  tone,
  points,
}: {
  title: string;
  tone: 'emerald' | 'rose';
  points: EvidencePoint[];
}) {
  const dot = tone === 'emerald' ? 'text-emerald-400' : 'text-rose-400';
  return (
    <div className="glass h-full rounded-2xl p-5">
      <SectionTitle>{title}</SectionTitle>
      <ul className="mt-3 space-y-3">
        {points.length === 0 && <li className="text-sm text-slate-500">None noted.</li>}
        {points.map((p, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-200">
            <span className={`mt-0.5 ${dot}`}>{tone === 'emerald' ? '▲' : '▼'}</span>
            <span>
              {p.claim}{' '}
              {p.sourceIds.length > 0 && (
                <span className="text-slate-500">[{p.sourceIds.join(', ')}]</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConvictionRing({ value, accent }: { value: number; gradient: string; accent: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right" title="How confident the agent is in its decision (0–100) — not a buy score">
        <div className="text-xs uppercase tracking-wider text-slate-400">Confidence</div>
        <div className={`text-2xl font-bold ${accent}`}>
          {value}
          <span className="text-sm text-slate-500">/100</span>
        </div>
      </div>
      <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <motion.circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className={accent}
          strokeDasharray="100"
          initial={{ strokeDashoffset: 100 }}
          animate={{ strokeDashoffset: 100 - value }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          pathLength={100}
        />
      </svg>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{children}</h3>;
}
