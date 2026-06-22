import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useResearch } from './hooks/useResearch';
import { useCompare } from './hooks/useCompare';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HowItWorks } from './components/HowItWorks';
import { ResearchForm } from './components/ResearchForm';
import { CompareForm } from './components/CompareForm';
import { ProgressTimeline } from './components/ProgressTimeline';
import { VerdictCard } from './components/VerdictCard';
import { CompareView } from './components/CompareView';

type Mode = 'single' | 'compare';

export default function App() {
  const [mode, setMode] = useState<Mode>('single');
  const single = useResearch();
  const compare = useCompare();

  const busy = mode === 'single' ? single.status === 'running' : compare.status === 'running';
  const wide = mode === 'compare';
  const topError = mode === 'single' ? single.error : compare.error;

  return (
    <div id="top" className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-4 pt-14 text-center sm:pt-20">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live data · US & Indian markets · Powered by Gemini
            </div>
            <h1 className="bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-4xl font-bold leading-tight text-transparent sm:text-5xl">
              Should you invest?
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-400">
              An AI agent researches fundamentals, market data and news — then gives a clear,
              cited <span className="text-emerald-300">INVEST</span> /{' '}
              <span className="text-amber-300">WATCH</span> /{' '}
              <span className="text-rose-300">PASS</span> verdict you can actually audit.
            </p>
          </motion.div>
        </section>

        {/* Agent tool */}
        <section id="agent" className={`mx-auto px-4 pt-8 ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>
          {/* Mode toggle */}
          <div className="mb-4 flex justify-center">
            <div className="glass inline-flex rounded-full p-1">
              {(['single', 'compare'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => !busy && setMode(m)}
                  disabled={busy}
                  className={`relative rounded-full px-5 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
                    mode === m ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode === m && (
                    <motion.span
                      layoutId="mode-pill"
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500/80 to-violet-500/80"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative">{m === 'single' ? 'Single' : 'Compare'}</span>
                </button>
              ))}
            </div>
          </div>

          {mode === 'single' ? (
            <ResearchForm disabled={busy} onSubmit={single.run} />
          ) : (
            <CompareForm disabled={busy} onSubmit={compare.run} />
          )}

          {/* Top-level error */}
          <AnimatePresence>
            {topError && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200"
              >
                <span className="font-medium">{topError.code}:</span> {topError.message}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <div className="mt-6 space-y-6">
            {mode === 'single' ? (
              <>
                <AnimatePresence>
                  {single.status === 'running' && !single.verdict && (
                    <ProgressTimeline steps={single.steps} />
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {single.verdict && <VerdictCard verdict={single.verdict} />}
                </AnimatePresence>
                {single.status === 'idle' && <EmptyState />}
              </>
            ) : compare.status === 'idle' ? (
              <EmptyState compare />
            ) : (
              <CompareView
                a={compare.a}
                b={compare.b}
                summary={compare.summary}
                running={compare.status === 'running'}
              />
            )}
          </div>
        </section>

        <HowItWorks />
      </main>

      <Footer />
    </div>
  );
}

function EmptyState({ compare }: { compare?: boolean }) {
  const examples = compare
    ? ['Infosys vs TCS', 'Apple vs Microsoft', 'Tata Motors vs Maruti Suzuki']
    : ['Apple', 'Reliance Industries', 'Infosys', 'NVIDIA', 'Tata Motors'];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass rounded-2xl p-6 text-center text-sm text-slate-400"
    >
      <p>{compare ? 'Try comparing:' : 'Try one of these:'}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {examples.map((e) => (
          <span key={e} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">
            {e}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
