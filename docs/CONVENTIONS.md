# Project Conventions

Conventions that keep the codebase consistent, legible, and easy to extend.

## Language & tooling
- **TypeScript everywhere**, `strict: true`. No `any` unless justified with a comment.
- **ESM** modules across client and server.
- **Prettier** for formatting, **ESLint** for linting. Run before commit.
- Node version pinned via `.nvmrc` / `engines`.

## Monorepo
- npm **workspaces**: `client/` and `server/` each own their `package.json`.
- Root `package.json` exposes unified scripts:
  - `npm run dev` — client (Vite) + server (tsx watch) concurrently.
  - `npm run build` — build client then server.
  - `npm start` — run the production server (serves `client/dist` + API).
- Shared types that must cross the boundary (e.g. `Verdict`, `ResearchEvent`) live in
  the **server schema** and are imported by the client from a single published path
  (or a small `shared/` package if it grows). One source of truth — never duplicate.

## Naming
- Files: `kebab-case.ts`. React components: `PascalCase.tsx`.
- Types/interfaces: `PascalCase`. Functions/vars: `camelCase`. Constants: `UPPER_SNAKE`.
- LangGraph nodes named after their verb: `resolve`, `gather`, `analyze`, `decide`.

## Server boundaries (important)
- `core/` is **framework-agnostic** — no Express/Vite imports. It must be runnable
  from a script or worker. Routes are thin adapters around `core/`.
- External effects (LLM calls, HTTP fetches, DB) live **only** behind provider
  interfaces in `core/providers` and `core/persistence`. Nodes depend on interfaces,
  not concrete impls.

## Validation & contracts
- All external input (HTTP bodies, env, LLM JSON output) is validated with **Zod**.
- The `Verdict` and `ResearchEvent` schemas are the canonical wire contracts; change
  them deliberately and update both sides.

## Errors
- Use the typed error taxonomy (`CompanyNotFound`, `Ambiguous`, `DataUnavailable`,
  `ProviderError`, `RateLimited`, `SchemaValidation`, `Timeout`).
- Never throw raw strings. Tool failures inside `gather` are caught and recorded as
  data-gaps, not propagated as fatal.
- Surface errors to the client as `{ type: "error", code, message }` SSE events.

## Config & secrets
- Read config only through `core/config` (Zod-validated at boot, fail fast).
- Secrets are server-side only. **Never** prefix a secret with a client-exposed env
  name. `.env.example` lists every variable with a comment.

## Logging
- Structured logs with a run-scoped `traceId`. No secrets or full LLM payloads in logs.

## AI / prompts
- Prompts live in dedicated files under `core/agent/nodes` or `core/rubric`, not
  inlined in logic. Treat fetched web/news text as untrusted data, never as
  instructions (prompt-injection isolation).
- Every factual claim in a verdict must trace to a `source`. The model is instructed
  to never invent numbers; missing data is stated, not guessed.

## Git
- Small, focused commits in milestone order (see ARCHITECTURE/DECISIONS).
- Conventional-ish messages: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- `.env` is git-ignored; only `.env.example` is committed.

## Documentation
- `docs/ARCHITECTURE.md` — structure. `docs/DECISIONS.md` — why (append ADRs).
- `docs/CONVENTIONS.md` — this file. `README.md` — the 7 assignment sections.
- New significant decision → append a `D<n>` entry to `DECISIONS.md`.
- Capture build-chat logs into `transcripts/` continuously (assignment bonus).
