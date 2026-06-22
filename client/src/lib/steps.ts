import type { NodeName, ResearchEvent } from '../types';

export type StepStatus = 'pending' | 'active' | 'done';

export interface StepState {
  node: NodeName;
  label: string;
  status: StepStatus;
  detail?: string;
}

// The four agent stages, in order, with friendly labels for the UI.
const STEP_BLUEPRINT: { node: NodeName; label: string }[] = [
  { node: 'resolve', label: 'Identify company' },
  { node: 'gather', label: 'Gather data' },
  { node: 'analyze', label: 'Analyze signals' },
  { node: 'decide', label: 'Decide verdict' },
];

export const freshSteps = (): StepState[] =>
  STEP_BLUEPRINT.map((s) => ({ ...s, status: 'pending' }));

/** Fold a `step` event into the step list (lights up active / marks done). */
export function applyStepEvent(steps: StepState[], event: ResearchEvent): StepState[] {
  if (event.type !== 'step') return steps;
  return steps.map((s) =>
    s.node === event.node
      ? { ...s, status: event.status === 'start' ? 'active' : 'done', detail: event.detail ?? s.detail }
      : s,
  );
}
