# core/providers (M1 interfaces, M2 impls)

Abstraction boundary for all external effects, so models and data sources swap
via config, never code edits.

- `llm/` — `LLMProvider` interface + `gemini` implementation (model
  `gemini-3.1-flash-lite`).
- `data/` — `DataProvider` interface + implementations per data type:
  - `fundamentals` (US + Indian BSE/NSE)
  - `market` (price/market snapshot)
  - `news` (news / web search with citations)

Each data tool is independently fault-tolerant: a failure becomes a recorded
data-gap, never a crash.
