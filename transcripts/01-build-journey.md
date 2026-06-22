# Build journey

A milestone-by-milestone account of how VerdictAI was designed and built in
conversation with an AI assistant. This captures the *thought process* — the
decisions, trade-offs, and bugs — not just the final code.

## Phase 0 — Analysis & design (before any code)
Started by extracting the assignment's explicit requirements, constraints, and the
**hidden** evaluation criteria (agentic depth, reasoning transparency, product
judgment, engineering maturity, honest limits). Produced a senior-style design doc:
product MVP vs enhancements, system architecture, folder structure, data/API
contracts, error handling, and milestones in dependency order. Decided to **stop and
get approval before coding**.

Key early decisions, each with alternatives weighed:
- **Vite + React + a separate Express server** (not Next.js) — the user wanted a
  clear client/server split and Vite; a long-lived Node process also suits SSE.
- **LangGraph.js** for the agent (named in the brief; maps to a multi-step pipeline).
- **Google Gemini** (`gemini-3.1-flash-lite`) behind an `LLMProvider` interface.
- **Yahoo Finance** for data — keyless, covers **US + Indian (NSE/BSE)** markets.
- **3-state verdict** (INVEST / WATCH / PASS) — more honest than a naked binary.
- Deploy as **one unified service on Render**.

## M0 — Scaffold
npm-workspaces monorepo; Vite client + Express server skeletons; Zod-validated env
config (fail-fast at boot); structured logger; typed error taxonomy; `/api/health`.
Verified the unified prod server serves the built client + API. Gotcha fixed: the
root `.env` must be resolved explicitly because workspace scripts run with
`cwd=server/`.

## M1 — Contracts
Zod schemas as the single source of truth (`Verdict`, `Signals`, `Company`,
`ResearchEvent`), provider interfaces (`LLMProvider`, `DataProvider`), the agent
`ResearchState`, and the persistence seam (`RunRepository` + noop). Design rule:
evidence/metrics reference sources by **index**, and data tools **return** results
rather than throw.

## M2 — Providers
Gemini `LLMProvider` (`generateText` / `generateStructured` with repair-retry) and
the Yahoo data provider (resolution + fundamentals + market + news). Discovered the
search API returns foreign GDR cross-listings that *outscore* the real home listing
— so resolution ranks by a **primary-exchange preference**, not raw score.

## M3 — The LangGraph agent
Wired `resolve → gather → analyze → decide` as a `StateGraph` with a conditional
edge (early-exit if no data). Heavy inline comments + a LangGraph primer, since the
framework was new to the user. **Bug found:** Gemini's structured-output
`response_schema` rejects JSON-Schema `$ref`, which Zod emits when the same schema
instance is reused (our `bull` and `bear` shared one `EvidencePointSchema`). **Fix:**
a factory so each field gets a distinct instance. After that, a real run on Apple
produced a clean, fully-cited `WATCH · 65` verdict.

## M4 — SSE API + UI
`POST /api/research` streams the agent's events. **Bug found:** listening on
`req.on('close')` aborted the run instantly, because on a POST that fires when the
*request body* finishes reading — not on disconnect. **Fix:** listen on
`res.on('close')` guarded by `res.writableEnded`. Then built the UI: dark theme,
glassmorphism panels, Framer-Motion animations, a live progress timeline and an
animated verdict card with bull/bear, metrics, and clickable sources.

## M5 — Hardening
Indian-market resolver bias (NSE/BSE win ties for dual-listed firms — Infosys now
resolves to `INFY.NS`); clearer not-found/private messaging; an in-memory TTL cache;
a per-IP rate limiter; and an overall run timeout via `AbortSignal.any`.

## M6 — Persona + Compare
Formalized a **persona-weighted rubric** (per-dimension weights + a transparent
weighted score fed to the model). Added `POST /api/compare`, which reuses the same
agent to run two companies in parallel (side-tagged SSE events) and then produces a
head-to-head summary. UI gained a Single/Compare toggle with side-by-side verdicts.

## Site polish
Turned the tool into a real-looking product site: sticky glass **navbar**,
substantial **footer**, hero, and "How it works" + FAQ sections.

## M7 — Packaging
Full 7-section README, example runs, Render deploy readiness (trust-proxy for
correct client IPs), and these transcripts.
