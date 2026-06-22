import type { NextFunction, Request, Response } from 'express';

/**
 * A tiny in-memory, per-IP sliding-window rate limiter. Enough to stop casual
 * abuse of the (LLM-cost-bearing) research endpoint without pulling in a
 * dependency. For multi-instance deployments this would move to Redis.
 */
export function rateLimit(opts: { windowMs: number; max: number }) {
  const hits = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();

    // Keep only timestamps inside the current window.
    const recent = (hits.get(key) ?? []).filter((t) => now - t < opts.windowMs);

    if (recent.length >= opts.max) {
      const retryAfter = Math.ceil((recent[0]! + opts.windowMs - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        error: 'RateLimited',
        message: `Too many requests. Try again in ${retryAfter}s.`,
      });
      return;
    }

    recent.push(now);
    hits.set(key, recent);
    next();
  };
}
