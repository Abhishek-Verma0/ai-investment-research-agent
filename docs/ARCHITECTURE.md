# Architecture — AI Investment Research Agent

> Status: design (pre-implementation). Source of truth for how the system is structured.

## 1. What it is

An AI agent that takes a **company name**, autonomously researches it (fundamentals,
market data, news/web), and returns an **INVEST / PASS / WATCH** verdict with a
conviction score and fully-cited reasoning. Supports **US and Indian** (NSE/BSE)
companies, an investor **persona** (growth / value / balanced), and **side-by-side
comparison** of two companies.

## 2. Shape of the system

A **monorepo with two independently-buildable packages** deployed as **one unified
service**:

```
ai-investment-research-agent/
├─ client/                 # Vite + React + TypeScript (the UI)
├─ server/                 # Node.js + Express + LangGraph.js (the brain + API)
├─ prisma/                 # optional persistence schema (history — seam only)
├─ docs/                   # this folder
├─ transcripts/            # LLM build-chat logs (assignment bonus)
├─ render.yaml             # Render blueprint (primary deploy target)
└─ package.json            # workspace root: unified install/build/dev scripts
```

The **client** and **server** are separate apps with their own `package.json`,
wired together by npm workspaces at the root. In development they run as two
processes (Vite dev server proxies `/api` to the Node server). In **production the
Node server serves the built client (`client/dist`) as static files AND the API** —
one process, one port, one URL. That is the "unified" deployment.

```
┌──────────────────────────────────────────────────────────────────┐
│  Single Node service (Render Web Service / Vercel)                 │
│                                                                    │
│   GET /            → static client/dist (Vite build)               │
│   POST /api/research (SSE)  ┐                                       │
│   GET  /api/health         │                                       │
│                            ▼                                        │
│                    server/src/core  (framework-agnostic)           │
│                    LangGraph: resolve → gather → analyze → decide   │
│                       │            │             │                  │
│              LLMProvider     DataProvider   Persistence (opt.)      │
│              (Gemini)        (fundamentals,                         │
│                              market, news)                         │
└──────────────────────────────────────────────────────────────────┘
        external: Gemini API · financial APIs · news/web search API
```

## 3. Client architecture (`client/`)

- **Vite + React + TypeScript** SPA. Tailwind CSS + shadcn/ui for fast, clean,
  accessible UI.
- State is intentionally minimal — no Redux. A single `useResearchStream` hook
  consumes the Server-Sent-Events (SSE) stream from the server.
- Core components: `ResearchForm`, `ProgressTimeline` (live agent steps),
  `VerdictCard`, `EvidencePanel` (metrics + bull/bear), `SourceList`,
  `PersonaSelector`, `CompareView`, `Disclaimer`.
- The client knows **nothing** about LangGraph or providers; it only speaks the
  `ResearchEvent` wire contract (see §6).

## 4. Server architecture (`server/`)

- **Node.js + Express + TypeScript.** Express is the thin transport layer:
  parse → validate → invoke core → stream.
- **All real logic lives in `server/src/core/` and is framework-agnostic** (no
  Express imports). This keeps the agent portable (callable from a CLI, a queue
  worker, or a different HTTP framework later) and unit-testable in isolation.
- Streaming over **SSE**: the graph emits typed events (`step`, `token`,
  `verdict`, `error`) that the route relays to the client.
- Provider **abstraction layer** (`core/providers`) means the LLM and every data
  source swap via config, never code edits.

### Server folder layout
```
server/src/
  index.ts                 # entry: mounts API + (in prod) static client
  routes/
    research.ts            # POST /api/research  (SSE)
    compare.ts             # POST /api/compare
    health.ts              # GET  /api/health
  core/
    agent/
      graph.ts             # LangGraph wiring
      nodes/               # resolve, gather, analyze, decide
      state.ts             # ResearchState type
    providers/
      llm/                 # LLMProvider interface + gemini impl
      data/                # DataProvider interface + fundamentals/market/news impls
    schema/                # Zod: Verdict, Signals, Company, ResearchEvent
    config/                # env loading + zod validation, feature flags
    persistence/           # repository interface; noop + prisma impls (optional)
    rubric/                # persona-weighted decision rubric
  lib/                     # logger, errors, sse helpers
```

## 5. Agent architecture (LangGraph.js)

A state machine over a shared typed `ResearchState`:

```
        ┌─────────┐   ┌──────────────────────────┐   ┌─────────┐   ┌────────┐
 name ▶ │ resolve │ ▶ │ gather (parallel tools)  │ ▶ │ analyze │ ▶ │ decide │ ▶ verdict
        └────┬────┘   └──────────────────────────┘   └─────────┘   └────────┘
             │ not found / ambiguous → clarify-or-abort
```

- **resolve** — name → `{ ticker, exchange, market(US|IN), isPublic, confidence }`.
  Must handle Indian listings (e.g. `RELIANCE.NS`, `500325.BSE`) as well as US.
- **gather** — parallel fan-out across data tools (fundamentals, market snapshot,
  news/web). Each tool is independently fault-tolerant: a failure becomes a
  recorded data-gap, never a crash; the agent reasons with partial data and lowers
  conviction.
- **analyze** — LLM synthesizes raw data into structured **signals** (financial
  health, growth, valuation, profitability, sentiment, risks), each with evidence
  and a directional score.
- **decide** — LLM applies a transparent, **persona-weighted rubric** →
  `{ verdict, conviction, thesis, bull[], bear[], whatWouldChangeMyMind[] }`,
  validated against a Zod schema (one repair-retry on failure).

LLM default: **Google Gemini** behind the `LLMProvider` interface.

## 6. Wire contracts

```ts
// POST /api/research   { companyName: string, persona?: "growth"|"value"|"balanced" }
//   → text/event-stream of ResearchEvent
// POST /api/compare    { a: string, b: string, persona?: ... }  → two streams / merged result

type Verdict = {
  company: { name; ticker?; exchange?; market: "US" | "IN" | "OTHER"; isPublic; confidence };
  decision: "INVEST" | "PASS" | "WATCH";
  conviction: number;                 // 0–100
  thesis: string;                     // 3–5 sentences
  bull: { claim: string; sources: number[] }[];
  bear: { claim: string; sources: number[] }[];
  keyMetrics: { label: string; value: string; asOf?: string; source?: number }[];
  whatWouldChangeMyMind: string[];
  sources: { title: string; url: string; accessedAt: string }[];
  disclaimers: string[];
  generatedAt: string;
};

type ResearchEvent =
  | { type: "step";    node: string; status: "start" | "done"; detail?: string }
  | { type: "token";   text: string }
  | { type: "verdict"; data: Verdict }
  | { type: "error";   code: string; message: string };
```

## 7. Cross-cutting concerns

- **Error handling** — typed taxonomy (`CompanyNotFound`, `Ambiguous`,
  `DataUnavailable`, `ProviderError`, `RateLimited`, `SchemaValidation`, `Timeout`).
  Errors are streamed as `error` events so the UI never hangs. Run-scoped `traceId`
  in logs.
- **Config** — every env var validated with Zod at boot; fail fast with a clear
  message. `.env.example` documents all. Feature flags (`LLM_PROVIDER`,
  `PERSISTENCE_ENABLED`, `DATA_PROVIDER_*`) keep optional subsystems off by default.
- **Security** — API keys server-side only; fetched web/news content treated as
  untrusted data, not instructions (prompt-injection isolation); input validation +
  length caps; rate-limit hook on routes; persistent "not financial advice"
  disclaimer.

## 8. Extensibility map (designed-for, not built-now)

| Future feature        | Seam                                                            |
|-----------------------|-----------------------------------------------------------------|
| More agents/tools     | Add a LangGraph node + register a `DataProvider`.               |
| New data providers    | `DataProvider` interface + config selection.                    |
| Authentication        | Express middleware at the route layer; `core/` untouched.       |
| Persistence / history | `persistence/` repository (noop ↔ prisma) behind a flag.        |
| Background jobs       | `core/agent` is invocation-agnostic → callable from a worker.   |
| Analytics             | Tee the existing typed event stream to a sink.                  |
| Multiple AI providers | `LLMProvider` interface, env-selected.                          |

Anti-overengineering guardrail: MVP ships **no DB, no auth, no queue** — only the
*interfaces* that make them additive. Every abstraction removes a future rewrite;
nothing speculative beyond this table.

See `DECISIONS.md` for *why* each choice was made (and why not the alternatives),
and `CONVENTIONS.md` for code conventions.
