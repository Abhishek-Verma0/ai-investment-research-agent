import type { ResearchRun, RunRepository } from './repository.js';

/**
 * Default repository used when persistence is disabled (the MVP). Saving is a
 * no-op that returns a synthetic run; reads return empty. Keeps call sites
 * identical whether or not history is enabled.
 */
export class NoopRunRepository implements RunRepository {
  async save(run: Omit<ResearchRun, 'id' | 'createdAt'>): Promise<ResearchRun> {
    return { ...run, id: 'noop', createdAt: new Date().toISOString() };
  }

  async getById(): Promise<ResearchRun | null> {
    return null;
  }

  async list(): Promise<ResearchRun[]> {
    return [];
  }
}
