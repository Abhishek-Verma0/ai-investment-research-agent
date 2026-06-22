import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Persona } from '../types';

const PERSONAS: { id: Persona; label: string }[] = [
  { id: 'growth', label: 'Growth' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'value', label: 'Value' },
];

interface Props {
  disabled: boolean;
  onSubmit: (a: string, b: string, persona: Persona) => void;
}

export function CompareForm({ disabled, onSubmit }: Props) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [persona, setPersona] = useState<Persona>('balanced');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const an = a.trim();
    const bn = b.trim();
    if (an && bn && !disabled) onSubmit(an, bn, persona);
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-strong rounded-2xl p-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={a}
          onChange={(e) => setA(e.target.value)}
          placeholder="Company A — e.g. Infosys"
          disabled={disabled}
          className="flex-1 rounded-xl bg-white/[0.03] px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none focus:bg-white/[0.06] disabled:opacity-50"
        />
        <span className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
          vs
        </span>
        <input
          value={b}
          onChange={(e) => setB(e.target.value)}
          placeholder="Company B — e.g. TCS"
          disabled={disabled}
          className="flex-1 rounded-xl bg-white/[0.03] px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none focus:bg-white/[0.06] disabled:opacity-50"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-slate-500">Lens</span>
          {PERSONAS.map((p) => {
            const active = persona === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => setPersona(p.id)}
                className={`rounded-full px-3 py-1 text-sm transition border ${
                  active
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <button
          type="submit"
          disabled={disabled || !a.trim() || !b.trim()}
          className="rounded-xl px-6 py-2.5 font-medium text-white transition
                     bg-gradient-to-r from-indigo-500 to-violet-500
                     hover:from-indigo-400 hover:to-violet-400
                     disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
        >
          {disabled ? 'Comparing…' : 'Compare'}
        </button>
      </div>
    </motion.form>
  );
}
