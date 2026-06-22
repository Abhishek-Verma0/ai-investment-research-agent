import { Annotation } from '@langchain/langgraph';
import type {
  CompanyIdentity,
  Persona,
  Signals,
  Source,
  Verdict,
} from '../schema/index.js';
import type { Fundamentals, MarketSnapshot, NewsItem } from '../providers/data/types.js';

/**
 * ── What is this file? ───────────────────────────────────────────────────────
 * LangGraph runs a set of "nodes" (plain async functions). They don't talk to
 * each other directly — instead they all read from and write to ONE shared
 * object called the graph **state**. This file declares the SHAPE of that state.
 *
 * We declare it with `Annotation.Root({...})`. Each field is a "channel". For
 * every channel you can say HOW a new value coming from a node should be merged
 * into the existing state:
 *   • No options  → "last write wins" (the new value simply replaces the old).
 *   • { reducer } → a function that COMBINES old + new (e.g. append to a list).
 *   • { default } → the starting value before any node has written.
 *
 * Think of it like React state, but with explicit merge rules per field.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const StateAnnotation = Annotation.Root({
  // ── Inputs (set once when the run starts) ──
  companyName: Annotation<string>, // the raw text the user typed
  persona: Annotation<Persona>, // investor lens: growth | value | balanced

  // ── Produced by the `resolve` node ──
  company: Annotation<CompanyIdentity | undefined>, // name → ticker/exchange/market

  // ── Produced by the `gather` node (any may stay undefined on failure) ──
  fundamentals: Annotation<Fundamentals | undefined>,
  market: Annotation<MarketSnapshot | undefined>,
  news: Annotation<NewsItem[] | undefined>,

  // ── Citations. The INDEX of a source in this array is its referenceable id,
  //    so evidence can point at sources by number. `gather` builds the list in
  //    one shot, so "last write wins" (no reducer) is correct here. ──
  sources: Annotation<Source[]>({ default: () => [], reducer: (_old, next) => next ?? [] }),

  // ── Notes about anything that couldn't be fetched. Several nodes may add to
  //    this, so we use a reducer that APPENDS instead of replacing. ──
  dataGaps: Annotation<string[]>({
    default: () => [],
    reducer: (old, next) => old.concat(next ?? []),
  }),

  // ── Produced by the `analyze` node ──
  signals: Annotation<Signals | undefined>,

  // ── Produced by the `decide` node (the final answer) ──
  verdict: Annotation<Verdict | undefined>,
});

/**
 * The TypeScript type of the state object, DERIVED from the annotation above.
 * `typeof StateAnnotation.State` means we never hand-maintain a second type — it
 * always matches the channels declared above. Node functions receive a value of
 * this type as their first argument.
 */
export type ResearchState = typeof StateAnnotation.State;
