/**
 * Minimal fixed-window rate limiter, keyed by an arbitrary string (user id,
 * email, client IP, …). State is in-memory: the app deploys as a single
 * Node process (output: "standalone" on Railway), so a Map is sufficient —
 * if that ever changes (multi-instance), swap this for a shared store.
 */

type Bucket = { count: number; resetAt: number };

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the window resets; 0 when the request is allowed. */
  retryAfterSeconds: number;
};

const buckets = new Map<string, Bucket>();

/** Beyond this, expired buckets are swept so the Map can't grow unbounded. */
const MAX_BUCKETS = 10_000;

function sweepExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Counts one attempt against `key`. Returns whether it's allowed within
 * `limit` requests per `windowMs` sliding by fixed windows.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) sweepExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
