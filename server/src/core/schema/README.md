# core/schema (M1)

Canonical Zod schemas + inferred types — the single source of truth for the wire
contracts shared with the client.

- `verdict.ts` — `Verdict` (decision, conviction, thesis, bull/bear, keyMetrics,
  whatWouldChangeMyMind, sources, disclaimers).
- `signals.ts` — intermediate `Signals` produced by the analyze node.
- `company.ts` — resolved company identity (ticker, exchange, market, confidence).
- `events.ts` — `ResearchEvent` SSE wire type (step | token | verdict | error).
