import { getConfig } from '../config/index.js';
import { NoopRunRepository } from './noop.js';
import type { RunRepository } from './repository.js';

export type { ResearchRun, RunRepository } from './repository.js';

/**
 * Selects the repository implementation from config. MVP returns the no-op; the
 * Prisma impl is wired here when `PERSISTENCE_ENABLED=true` (M7).
 */
export function createRunRepository(): RunRepository {
  const cfg = getConfig();
  if (cfg.PERSISTENCE_ENABLED) {
    throw new Error(
      'PERSISTENCE_ENABLED=true but the Prisma repository is not wired yet (planned M7).',
    );
  }
  return new NoopRunRepository();
}
