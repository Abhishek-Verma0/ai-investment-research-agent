# VerdictAI — AI Investment Research Agent

> Enter a company name → an AI agent autonomously researches it (fundamentals,
> market data, news) and returns a clear, **cited** **INVEST / WATCH / PASS**
> verdict with a conviction score and full reasoning. Works for **US and Indian
> (NSE/BSE)** companies, supports an investor **persona**, and can **compare** two
> companies side-by-side.

Built for the InsideIIM × Altuni AI Labs *AI Product Development Engineer*
take-home. Stack: **React + Vite · Node + Express · LangGraph.js · Google Gemini**.

---

## 1. Overview

VerdictAI turns a single company name into an auditable investment view:

- **Autonomous research** — resolves the company to a ticker, pulls fundamentals,
  a live market snapshot and recent news in parallel.
- **Structured reasoning** — scores six dimensions (financial health, growth,
  valuation, profitability, sentiment, risk), then issues a verdict.
- **A decision you can trust** — **INVEST / WATCH / PASS** + a 0–100 conviction,
  a thesis, the strongest **bull** and **bear** points (each citing sources), key
  metrics, "what would change my mind", and a clickable source list.
- **Live "watch it think" UX** — the agent streams its progress (Identify →
  Gather → Analyze → Decide) to the browser in real time over SSE.
- **Personas** — Growth / Value / Balanced re-weight the decision rubric.
- **Compare mode** — research two companies at once and get a head-to-head call.

> ⚠️ Educational research only — **not financial advice**.

---

## 2. How to run it

### Prerequisites
- **Node.js ≥ 20**
- A **Google Gemini API key** — https://aistudio.google.com/apikey (free tier works)

### Setup
```bash
# 1. install everything (npm workspaces: root + client + server)
npm install

# 2. configure environment
cp .env.example .env        # then edit .env and set GEMINI_API_KEY
```

Minimum `.env`:
```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.1-flash-lite
```
The data layer (Yahoo Finance) needs **no key**. `TAVILY_API_KEY` is optional (richer
news). See [.env.example](.env.example) for all options (timeouts, rate limits, etc.).

### Develop (two processes, hot-reload)
```bash
npm run dev        # runs server (:8787) + client (:5173) together
# open http://localhost:5173
```
The Vite dev server proxies `/api` to the Node server, so the browser sees one
origin. (You can also run them separately: `npm run dev:server`, `npm run dev:client`.)

### Production build + run (single unified service)
```bash
npm run build      # builds client → client/dist, compiles server → server/dist
npm start          # Node serves the built client + the API on PORT (default 8787)
# open http://localhost:8787
```

### CLI (no UI, handy for testing)
```bash
npm run research --workspace server -- "Apple"
npm run research --workspace server -- "Reliance Industries" growth
```

---

## 3. How it works

### Architecture
A **monorepo** with two packages deployed as **one unified service**:

```
client/  Vite + React + TS + Tailwind  → the UI (SPA, consumes an SSE stream)
server/  Node + Express + TS           → thin API + the agent "brain" in core/
```
In production the Node server serves the built client **and** the API from one
process/port — so it deploys as a single web service.

```
Browser ──POST /api/research (SSE)──▶ Express route ──▶ core/agent (LangGraph)
                                                          │
                          resolve → gather → analyze → decide
                             │         │         │         │
                       LLM (Gemini)   Data providers (Yahoo: US + NSE/BSE)
```

### The agent (LangGraph.js)
The core is a **state machine** over a shared state object:

1. **resolve** — company name → `{ ticker, exchange, market(US|IN), confidence }`.
   For dual-listed Indian firms it prefers the **home NSE/BSE** listing.
2. **gather** — fundamentals + market snapshot + news, fetched **in parallel**.
   Each tool is fault-tolerant: a failure becomes a recorded *data gap*, never a
   crash. Every datum is registered as a citable **source**.
3. **analyze** — Gemini scores the six dimensions as **schema-validated** JSON.
4. **decide** — Gemini applies the **persona-weighted rubric** and returns the
   verdict draft; the server assembles the final `Verdict` (attaching company,
   sources, disclaimer, timestamp in code — not trusting the model with facts it
   already has).

Progress is streamed as typed events (`step` / `verdict` / `error`) over **SSE**,
which is what powers the live timeline.

### Key technical choices
- **Structured output via Zod** — both LLM calls return JSON validated against a
  Zod schema (with one repair-retry), so the UI never parses free text.
- **Provider abstractions** — `LLMProvider` and `DataProvider` interfaces mean the
  model (Gemini → others) and data sources swap via config, not code edits.
- **Framework-agnostic `core/`** — no Express imports in the agent, so it's
  portable (CLI, queue worker, or a different HTTP layer) and unit-testable.
- **Hardening** — per-IP rate limiting, an overall run timeout (`AbortSignal`),
  a short-TTL cache on data calls, and a typed error taxonomy surfaced to the UI.

---

## 4. Key decisions & trade-offs

| Decision | Why | Trade-off / what I left out |
|---|---|---|
| **Vite + React + separate Express server** (not Next.js) | Clean client/server split; Vite's fast DX; a long-lived Node process suits **SSE streaming** | Two dev processes; share types manually across the boundary |
| **LangGraph.js** (not plain chains) | Multi-step pipeline maps to a graph; per-step streaming = the "watch it think" UX | More wiring than a single prompt |
| **Google Gemini** behind an `LLMProvider` interface | Strong free tier + native structured output | Provider-specific quirk handled (see below) |
| **Yahoo Finance** for data (keyless) | Covers **US + Indian** equities with no API key → zero-config deploy | Unofficial API; coverage gaps handled as data-gaps |
| **3-state verdict (INVEST/WATCH/PASS)** | A naked invest/pass binary is rarely how analysts think; WATCH is honest | Slightly beyond the literal "invest or pass" |
| **Render** (single web service) for deploy | Long-lived process is ideal for SSE; one service serves client + API | Not serverless; Vercel kept as an alternative |
| **No DB / auth in the core build** | Keeps the MVP zero-config and reviewer-friendly | History/accounts are a designed-for seam, not built (yet) |

**A bug worth noting (and how it was solved):** Gemini's structured-output schema
rejects JSON-Schema `$ref`, which the Zod→JSON converter emits when the *same*
schema instance is reused (our `bull`/`bear` shared one). Fix: a small factory so
each field gets a distinct instance → everything inlines, no `$ref`.

---

## 5. Example runs

### Apple (`AAPL`, US) — persona: balanced → **WATCH · 65/100**
> *Thesis:* "Apple remains a fortress of profitability and cash generation, but its
> current valuation is stretched to levels that leave little room for execution
> errors… I am moving to a WATCH stance to wait for a more attractive entry point or
> concrete evidence that AI-driven product cycles are translating into sustained
> revenue acceleration."

**Bull** — $101B free cash flow & 27.15% net margin [0]; upcoming AI AirPods /
foldable iPhone catalysts [4]; pricing power protects margins [3,6].
**Bear** — rich valuation, P/E 36.23 / P/B 41.17 [0]; memory-chip supply risk
[3,6]; investor impatience on tangible AI revenue [2].
**Key metrics** — P/E 36.23 · Net margin 27.15% · FCF $101B · Rev growth 16.6%.
**Sources** — Yahoo Finance fundamentals/quote + WSJ, LA Times, Seeking Alpha, CNBC
articles (all clickable in the UI).

*(Reproduce: `npm run research --workspace server -- "Apple"`.)*

### More to try
```bash
npm run research --workspace server -- "Reliance Industries" value   # NSE, INR
npm run research --workspace server -- "Infosys"                     # resolves to INFY.NS
npm run research --workspace server -- "Tata Motors" growth          # TATAMOTORS.NS
```
Compare mode (UI): **Infosys vs TCS**, **Apple vs Microsoft**.

> Output is live and may vary as market data and news change. The Apple run above
> is a verbatim capture from `gemini-3.1-flash-lite`.

---

## 6. What I would improve with more time

- **Accounts & saved history** (MongoDB) and shareable verdict permalinks — the
  `RunRepository` persistence seam is already in place for this.
- **Token-level streaming** of the thesis (currently step-level progress streams).
- **Deeper data** — multiple providers per market, sector peers, historical trends,
  and a valuation model rather than point-in-time ratios.
- **Evaluation harness** — golden-set prompts to catch reasoning/quality regressions.
- **Caching of full verdicts** + background refresh; observability/analytics.
- **Tests** — unit tests for nodes/providers and an e2e stream test.

---

## 7. Bonus — build transcripts

This project was built end-to-end in conversation with an AI assistant. The build
journey (design → milestones M0–M6 → this packaging) is captured in
[transcripts/](transcripts/)
---

## Project layout
```
client/   Vite + React UI (components, hooks, lib)
server/   Express API + core/ agent
  core/agent       LangGraph graph + nodes (resolve/gather/analyze/decide)
  core/providers   LLM (Gemini) + data (Yahoo, Tavily) behind interfaces
  core/schema      Zod contracts (Verdict, ResearchEvent, …)
  core/rubric      persona weighting
  routes/          /api/research, /api/compare, /api/health (SSE)
render.yaml        one-click Render blueprint
```

## Deploy (Render)
1. Push this repo to GitHub.
2. On Render → **New → Blueprint**, point at the repo (it reads [render.yaml](render.yaml)).
3. Set `GEMINI_API_KEY` in the dashboard (marked `sync: false`).
4. Deploy. The single web service builds both packages and serves the app at one URL.

Vercel is also possible (static client + serverless API), but Render is preferred
for the long-lived SSE stream.
