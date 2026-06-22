import type { Persona, SignalDimension, Signals } from '../schema/index.js';

/**
 * ── The persona rubric ───────────────────────────────────────────────────────
 * A persona is more than a sentence — it's a set of WEIGHTS over the six signal
 * dimensions. A "growth" investor weighs growth & momentum heavily and tolerates
 * rich valuation; a "value" investor does the opposite. We expose these weights
 * so the decision is transparent and consistent, and we feed them into the
 * decide prompt so the model actually applies them.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const PERSONA_GUIDANCE: Record<Persona, string> = {
  growth:
    'You favor revenue growth, market expansion and optionality; you tolerate rich ' +
    'valuations when growth justifies them.',
  value:
    'You favor cheap valuations, strong balance sheets and cash flows; you are wary ' +
    'of hype and overpaying.',
  balanced:
    'You weigh growth, valuation, quality and risk evenly, seeking a sensible ' +
    'risk/reward over a 12–36 month horizon.',
};

// Weights per persona across the six dimensions. Each row sums to 1.0.
const WEIGHTS: Record<Persona, Record<SignalDimension, number>> = {
  growth: {
    growth: 0.3,
    sentiment: 0.15,
    profitability: 0.15,
    financialHealth: 0.15,
    valuation: 0.1,
    risk: 0.15,
  },
  value: {
    valuation: 0.3,
    financialHealth: 0.2,
    profitability: 0.2,
    risk: 0.15,
    growth: 0.1,
    sentiment: 0.05,
  },
  balanced: {
    growth: 0.18,
    valuation: 0.18,
    financialHealth: 0.18,
    profitability: 0.18,
    risk: 0.14,
    sentiment: 0.14,
  },
};

export function getWeights(persona: Persona): Record<SignalDimension, number> {
  return WEIGHTS[persona] ?? WEIGHTS.balanced;
}

/**
 * A persona-weighted aggregate of the signal scores (-100..100). This is a
 * transparent GUIDE we hand the model (and could surface in the UI) — not a hard
 * rule, since qualitative judgment and data gaps still matter.
 */
export function weightedScore(signals: Signals, persona: Persona): number {
  const weights = getWeights(persona);
  let weighted = 0;
  let total = 0;
  for (const dim of signals.dimensions) {
    const w = weights[dim.dimension] ?? 0;
    weighted += dim.score * w;
    total += w;
  }
  return total > 0 ? Math.round(weighted / total) : 0;
}

/** Human-readable rubric description injected into the decide prompt. */
export function describeRubric(persona: Persona): string {
  const weights = getWeights(persona);
  const lines = Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .map(([dim, w]) => `  - ${dim}: ${Math.round(w * 100)}%`)
    .join('\n');
  return `${PERSONA_GUIDANCE[persona]}\nDimension weights for this persona:\n${lines}`;
}
