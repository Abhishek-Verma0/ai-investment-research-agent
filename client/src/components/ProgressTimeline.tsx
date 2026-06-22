import { motion } from 'framer-motion';
import type { StepState } from '../hooks/useResearch';

interface Props {
  steps: StepState[];
}

/** The live "watch it think" timeline — one row per agent stage. */
export function ProgressTimeline({ steps }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5"
    >
      <ul className="space-y-1">
        {steps.map((step, i) => (
          <li key={step.node} className="flex items-start gap-3 py-2">
            <Indicator status={step.status} isLast={i === steps.length - 1} />
            <div className="min-w-0 flex-1">
              <div
                className={`text-sm font-medium transition-colors ${
                  step.status === 'pending' ? 'text-slate-500' : 'text-slate-100'
                }`}
              >
                {step.label}
                {step.status === 'active' && <PulsingDots />}
              </div>
              {step.detail && (
                <div className="truncate text-xs text-slate-400">{step.detail}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function Indicator({ status, isLast }: { status: StepState['status']; isLast: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-6 w-6 items-center justify-center">
        {status === 'done' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300"
          >
            <CheckIcon />
          </motion.div>
        )}
        {status === 'active' && (
          <span className="relative flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-indigo-400" />
          </span>
        )}
        {status === 'pending' && <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />}
      </div>
      {!isLast && <span className="my-1 w-px flex-1 bg-white/10" style={{ minHeight: 14 }} />}
    </div>
  );
}

function PulsingDots() {
  return (
    <motion.span
      className="ml-1 inline-block text-indigo-300"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ repeat: Infinity, duration: 1.2 }}
    >
      …
    </motion.span>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
