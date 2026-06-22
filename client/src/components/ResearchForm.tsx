import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Persona } from '../types';

const PERSONAS: { id: Persona; label: string; hint: string }[] = [
  { id: 'growth', label: 'Growth', hint: 'Favors expansion & optionality' },
  { id: 'balanced', label: 'Balanced', hint: 'Weighs risk/reward evenly' },
  { id: 'value', label: 'Value', hint: 'Favors cheap, quality, cash flows' },
];

interface Props {
  disabled: boolean;
  onSubmit: (company: string, persona: Persona) => void;
}

export function ResearchForm({ disabled, onSubmit }: Props) {
  const [company, setCompany] = useState('');
  const [persona, setPersona] = useState<Persona>('balanced');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = company.trim();
    if (name && !disabled) onSubmit(name, persona);
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-strong rounded-2xl p-2 sm:p-2.5"
    >
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Enter a company — e.g. Apple, Reliance Industries, Infosys"
          disabled={disabled}
          className="flex-1 bg-transparent px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !company.trim()}
          className="rounded-xl px-6 py-3 font-medium text-white transition
                     bg-gradient-to-r from-indigo-500 to-violet-500
                     hover:from-indigo-400 hover:to-violet-400
                     disabled:opacity-40 disabled:cursor-not-allowed
                     shadow-lg shadow-indigo-500/20"
        >
          {disabled ? 'Researching…' : 'Research'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-2 pb-1 pt-2">
        <span className="text-xs uppercase tracking-wider text-slate-500">Lens</span>
        {PERSONAS.map((p) => {
          const active = persona === p.id;
          return (
            <button
              key={p.id}
              type="button"
              title={p.hint}
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
    </motion.form>
  );
}
