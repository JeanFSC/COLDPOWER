export type PublicRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type Bucket = { startedAt: number; count: number };
type Options = { max: number; windowMs: number };

export function createPublicRateLimiter(options: Options) {
  const buckets = new Map<string, Bucket>();

  return {
    check(key: string, now = Date.now()): PublicRateLimitResult {
      const current = buckets.get(key);
      const expired = !current || now - current.startedAt >= options.windowMs;
      const bucket = expired ? { startedAt: now, count: 0 } : current;
      if (bucket.count >= options.max) {
        return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((options.windowMs - (now - bucket.startedAt)) / 1000)) };
      }
      bucket.count += 1;
      buckets.set(key, bucket);
      return { allowed: true, remaining: Math.max(0, options.max - bucket.count), retryAfterSeconds: 0 };
    },
  };
}

const globalKey = "__coldpower_public_rate_limiter__";
const globalStore = globalThis as typeof globalThis & { [globalKey]?: ReturnType<typeof createPublicRateLimiter> };

export function checkPublicRateLimit(key: string, options: Options): PublicRateLimitResult {
  const limiter = globalStore[globalKey] ?? (globalStore[globalKey] = createPublicRateLimiter(options));
  return limiter.check(key);
}
