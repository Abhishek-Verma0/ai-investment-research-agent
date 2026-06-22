import { StateGraph, START, END } from '@langchain/langgraph';
import { StateAnnotation, type ResearchState } from './state.js';
import { resolveNode } from './nodes/resolve.js';
import { gatherNode } from './nodes/gather.js';
import { analyzeNode } from './nodes/analyze.js';
import { decideNode } from './nodes/decide.js';

/**
 * ── Building the graph ───────────────────────────────────────────────────────
 * `StateGraph` is the LangGraph object that ties nodes together. The flow:
 *
 *     START → resolve → gather ─▶ analyze → decide → END
 *                          │
 *                          └─▶ END   (if no usable data was gathered)
 *
 * Pieces of the API used below:
 *  • `new StateGraph(StateAnnotation)` — create a graph over our state shape.
 *  • `.addNode(name, fn)`             — register a node function under a name.
 *  • `.addEdge(from, to)`             — an UNCONDITIONAL hop: after `from`, go to `to`.
 *  • `.addConditionalEdges(from, fn, map)` — a BRANCH: run `fn(state)` after
 *       `from`; it returns a key, and `map` says which node that key leads to.
 *  • `START` / `END`                  — the built-in entry and exit points.
 *  • `.compile()`                     — freeze it into a runnable you can `.invoke()`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Did `gather` collect anything worth analyzing? */
function hasUsableData(state: ResearchState): boolean {
  return Boolean(state.fundamentals || state.market || (state.news && state.news.length > 0));
}

/**
 * The branch function. It inspects the state AFTER `gather` and returns a key
 * ('analyze' or 'end'). The map below translates that key into a real node.
 * This is how LangGraph expresses "if/else" between steps.
 */
function routeAfterGather(state: ResearchState): 'analyze' | 'end' {
  return hasUsableData(state) ? 'analyze' : 'end';
}

export function buildGraph() {
  const workflow = new StateGraph(StateAnnotation)
    .addNode('resolve', resolveNode)
    .addNode('gather', gatherNode)
    .addNode('analyze', analyzeNode)
    .addNode('decide', decideNode)
    .addEdge(START, 'resolve') // entry → first node
    .addEdge('resolve', 'gather') // always gather after resolving
    .addConditionalEdges('gather', routeAfterGather, {
      analyze: 'analyze', // key 'analyze' → run the analyze node
      end: END, // key 'end'     → stop early (run.ts turns this into a clear error)
    })
    .addEdge('analyze', 'decide')
    .addEdge('decide', END);

  // `.compile()` returns an object with `.invoke()` / `.stream()` that executes
  // the nodes in dependency order, threading the state through each.
  return workflow.compile();
}
