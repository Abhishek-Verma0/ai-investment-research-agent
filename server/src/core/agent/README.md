# The Agent — a LangGraph primer (read this if LangChain/LangGraph is new)

This folder is the "brain". It uses **LangGraph.js** to run the research as a
small, explicit pipeline. If you've never seen LangChain/LangGraph, read this
once and the code will make sense.

## Why a graph at all?

Our task has natural *steps* that depend on each other:

```
resolve  →  gather  →  analyze  →  decide
(name→ticker) (fetch data) (score it) (INVEST/PASS/WATCH)
```

We *could* write this as one big function. We use LangGraph instead because it
gives us three things almost for free:

1. **A shared state** that flows through every step (no prop-drilling).
2. **Observability** — we know exactly which step is running, so we can stream
   "Resolving… / Gathering… / Analyzing…" to the UI live.
3. **Branching** — e.g. "if no data was found, stop early" — expressed cleanly.

## The 4 building blocks

### 1. State (`state.ts`)
LangGraph nodes don't call each other; they all read/write **one shared object**,
the *state*. We declare its shape with `Annotation.Root({...})`. Each field is a
"channel" with a merge rule:
- plain `Annotation<T>` → new value **replaces** old ("last write wins").
- `Annotation<T>({ reducer, default })` → new value is **combined** with old
  (we use this to *append* to `dataGaps`).

`type ResearchState = typeof StateAnnotation.State` derives the TS type from that
declaration, so the type can never drift from the channels.

### 2. Nodes (`nodes/*.ts`)
A node is just `async (state, config) => partialState`. It reads what it needs
from `state`, does work, and **returns only the fields it changed**. LangGraph
merges that return value back into the shared state using the channel rules.

Example (`resolve.ts`): it reads `state.companyName`, calls the resolver, and
returns `{ company }`. Now every later node can read `state.company`.

### 3. Dependencies via `config` (`context.ts`)
Nodes have a fixed signature, so how do they get the LLM, the data providers, and
a way to emit progress? LangGraph lets you pass arbitrary values through
`config.configurable`. We put an `AgentContext` there and each node calls
`getContext(config)` to retrieve it. Bonus: tests can pass a *fake* LLM the same
way (that's exactly how the M3 smoke test ran without an API key).

### 4. The graph (`graph.ts`)
`graph.ts` connects the nodes:
- `new StateGraph(StateAnnotation)` — a graph over our state.
- `.addNode('resolve', resolveNode)` — register a node.
- `.addEdge(START, 'resolve')` — unconditional hop.
- `.addConditionalEdges('gather', routeAfterGather, { analyze: 'analyze', end: END })`
  — a **branch**: run `routeAfterGather(state)`, which returns `'analyze'` or
  `'end'`; the map turns that key into the next node.
- `.compile()` — freezes it into something with `.invoke(input, config)` that
  executes the nodes in order, threading the state through.

## How a request flows (`run.ts`)
`runResearch(input, onEvent)` is the one entry point used by both the CLI and the
HTTP route. It builds the LLM + providers, compiles the graph, and calls
`graph.invoke(...)`. As nodes run they `emit(...)` events; `runResearch` forwards
them to `onEvent` and guarantees the stream ends in exactly one terminal event:
`verdict` (success) or `error` (any failure).

## The LLM calls (`nodes/analyze.ts`, `nodes/decide.ts`)
We never parse model text by hand. We call
`llm.generateStructured(prompt, ZodSchema)`, which asks Gemini to return JSON
matching the schema and validates it (with one repair-retry). So `analyze` always
yields a typed `Signals`, and `decide` a typed decision draft — which we then
assemble into the final `Verdict` (attaching company, sources, disclaimer,
timestamp in code rather than trusting the model with them).

## Try it
```bash
npm run research --workspace server -- "Apple"
npm run research --workspace server -- "Reliance Industries" growth
```
(Requires `GEMINI_API_KEY` in the root `.env`.)
