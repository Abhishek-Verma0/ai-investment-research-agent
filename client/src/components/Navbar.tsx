import { useState } from 'react';
import { Logo, Wordmark } from './Logo';
import { GITHUB_URL } from '../lib/site';

const LINKS = [
  { href: '#agent', label: 'Research' },
  { href: '#how', label: 'How it works' },
  { href: '#faq', label: 'FAQ' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#060814]/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a href="#top" className="flex items-center gap-2.5">
          <Logo />
          <Wordmark />
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-7 text-sm text-slate-400 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition hover:text-slate-100">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 sm:inline-block"
          >
            GitHub
          </a>
          <a
            href="#agent"
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-400 hover:to-violet-400"
          >
            Try it
          </a>
          {/* Mobile menu toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="ml-1 rounded-lg border border-white/10 p-2 text-slate-300 md:hidden"
            aria-label="Toggle menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div className="border-t border-white/5 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-3 text-sm text-slate-300">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="hover:text-white">
                {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
