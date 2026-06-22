import type { Persona, Verdict } from '../schema/index.js';

/** A persisted research run (history feature). */
export interface ResearchRun {
  id: string;
  companyName: string;
  persona: Persona;
  verdict: Verdict;
  createdAt: string;
}

/**
 * Persistence boundary. MVP ships the no-op impl (history disabled); a Prisma
 * impl drops in behind the `PERSISTENCE_ENABLED` flag with no changes to callers.
 */
export interface RunRepository {
  save(run: Omit<ResearchRun, 'id' | 'createdAt'>): Promise<ResearchRun>;
  getById(id: string): Promise<ResearchRun | null>;
  list(limit?: number): Promise<ResearchRun[]>;
}
