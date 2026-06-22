/**
 * A minimal in-memory TTL cache. Used to avoid re-hitting the data APIs for the
 * same ticker within a short window — cuts latency, cost, and rate-limit risk.
 *
 * In-process only (fine for a single server). The interface is deliberately tiny
 * so it could later be swapped for Redis without touching call sites.
 */
interface Entry<V> {
  value: V;
  expiresAt: number;
}

export class TTLCache<V> {
  private store = new Map<string, Entry<V>>();
  constructor(private readonly ttlMs: number) {}

  get(key: string): V | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expiresAt) {
      this.store.delete(key); // expired — drop it
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: V): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  /**
   * Get the cached value or compute + cache it. Concurrent callers for the same
   * key share one in-flight promise (so a burst doesn't fan out N identical API
   * calls).
   */
  async getOrSet(key: string, compute: () => Promise<V>): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const inflight = this.pending.get(key);
    if (inflight) return inflight;

    const promise = compute()
      .then((value) => {
        this.set(key, value);
        return value;
      })
      .finally(() => this.pending.delete(key));

    this.pending.set(key, promise);
    return promise;
  }

  private pending = new Map<string, Promise<V>>();
}
