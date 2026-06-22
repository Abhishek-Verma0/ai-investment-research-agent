import { useCallback, useRef, useState } from 'react';
import { streamCompare } from '../lib/compareApi';
import { applyStepEvent, freshSteps, type StepState } from '../lib/steps';
import type { Persona, Verdict } from '../types';

export type CompareStatus = 'idle' | 'running' | 'done' | 'error';

export interface SideState {
  name: string;
  steps: StepState[];
  verdict: Verdict | null;
  error: { code: string; message: string } | null;
}

export interface CompareSummary {
  winner: 'a' | 'b' | 'tie';
  rationale: string;
  aName: string;
  bName: string;
}

const freshSide = (name: string): SideState => ({
  name,
  steps: freshSteps(),
  verdict: null,
  error: null,
});

/**
 * Drives a two-company comparison. It demultiplexes the side-tagged stream into
 * two independent `SideState`s (each with its own timeline + verdict) and a final
 * head-to-head summary.
 */
export function useCompare() {
  const [status, setStatus] = useState<CompareStatus>('idle');
  const [a, setA] = useState<SideState>(() => freshSide(''));
  const [b, setB] = useState<SideState>(() => freshSide(''));
  const [summary, setSummary] = useState<CompareSummary | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (aName: string, bName: string, persona: Persona) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setStatus('running');
    setA(freshSide(aName));
    setB(freshSide(bName));
    setSummary(null);
    setError(null);

    const setSide = (side: 'a' | 'b') => (side === 'a' ? setA : setB);

    try {
      await streamCompare({ a: aName, b: bName, persona }, (evt) => {
        if (evt.type === 'side') {
          const setter = setSide(evt.side);
          const e = evt.event;
          if (e.type === 'step') {
            setter((prev) => ({ ...prev, steps: applyStepEvent(prev.steps, e) }));
          } else if (e.type === 'verdict') {
            setter((prev) => ({ ...prev, verdict: e.data }));
          } else if (e.type === 'error') {
            setter((prev) => ({ ...prev, error: { code: e.code, message: e.message } }));
          }
        } else if (evt.type === 'summary') {
          setSummary({ winner: evt.winner, rationale: evt.rationale, aName: evt.aName, bName: evt.bName });
        } else if (evt.type === 'error') {
          setError({ code: evt.code, message: evt.message });
        }
      }, ac.signal);

      setStatus((s) => (s === 'running' ? 'done' : s));
    } catch (err) {
      if (!ac.signal.aborted) {
        setError({ code: 'Internal', message: err instanceof Error ? err.message : String(err) });
        setStatus('error');
      }
    }
  }, []);

  return { status, a, b, summary, error, run };
}
