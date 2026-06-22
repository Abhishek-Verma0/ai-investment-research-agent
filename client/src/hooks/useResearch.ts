import { useCallback, useRef, useState } from 'react';
import { streamResearch } from '../lib/api';
import { applyStepEvent, freshSteps, type StepState } from '../lib/steps';
import type { Persona, Verdict } from '../types';

export type RunStatus = 'idle' | 'running' | 'done' | 'error';
export type { StepState } from '../lib/steps';

/**
 * Owns all state for one research run and exposes `run(company, persona)`.
 * It translates the raw SSE events into UI-friendly state: a list of steps that
 * light up as the agent progresses, the final verdict, and any error.
 */
export function useResearch() {
  const [status, setStatus] = useState<RunStatus>('idle');
  const [steps, setSteps] = useState<StepState[]>(freshSteps);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [company, setCompany] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (companyName: string, persona: Persona) => {
    // Cancel any in-flight run before starting a new one.
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setStatus('running');
    setSteps(freshSteps());
    setVerdict(null);
    setError(null);
    setCompany(companyName);

    try {
      await streamResearch({ companyName, persona }, (event) => {
        if (event.type === 'step') {
          setSteps((prev) => applyStepEvent(prev, event));
        } else if (event.type === 'verdict') {
          setVerdict(event.data);
          setStatus('done');
        } else if (event.type === 'error') {
          setError({ code: event.code, message: event.message });
          setStatus('error');
        }
      }, ac.signal);

      // If the stream ended without a terminal verdict/error, settle gracefully.
      setStatus((s) => (s === 'running' ? 'done' : s));
    } catch (err) {
      if (!ac.signal.aborted) {
        setError({ code: 'Internal', message: err instanceof Error ? err.message : String(err) });
        setStatus('error');
      }
    }
  }, []);

  return { status, steps, verdict, error, company, run };
}
