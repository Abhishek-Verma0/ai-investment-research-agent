import { Logo, Wordmark } from './Logo';
import { GITHUB_URL } from '../lib/site';

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Research', href: '#agent' },
      { label: 'Compare', href: '#agent' },
      { label: 'How it works', href: '#how' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'FAQ', href: '#faq' },
      { label: 'GitHub', href: GITHUB_URL },
      { label: 'Gemini', href: 'https://ai.google.dev' },
    ],
  },
  {
    title: 'Data',
    links: [
      { label: 'Yahoo Finance', href: 'https://finance.yahoo.com' },
      { label: 'US markets', href: '#agent' },
      { label: 'NSE / BSE', href: '#agent' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-white/5">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <Logo />
              <Wordmark />
            </div>
            <p className="mt-3 max-w-xs text-sm text-slate-400">
              An AI agent that researches a company and gives a clear, cited
              INVEST / WATCH / PASS verdict — for US and Indian markets.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {col.title}
              </h4>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-slate-400 transition hover:text-slate-100"
                      {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/5 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} VerdictAI · Built with React, LangGraph & Gemini.</span>
          <span className="text-slate-600">
            Educational research only — not financial advice.
          </span>
        </div>
      </div>
    </footer>
  );
}
