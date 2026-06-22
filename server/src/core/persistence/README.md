# core/persistence (seam — optional, off by default)

Repository interface for persisting research runs (history feature). Gated by the
`PERSISTENCE_ENABLED` flag.

- `repository.ts` — `RunRepository` interface.
- `noop.ts` — default no-op implementation (MVP).
- `prisma.ts` — Prisma/Postgres implementation (enabled later).

MVP ships the no-op; the interface keeps history additive with no rewrite.
