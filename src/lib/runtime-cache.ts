type RuntimeCacheEntry<T> = {
  expiresAt: number;
  value?: T;
  pending?: Promise<T>;
};

const entries = new Map<string, RuntimeCacheEntry<unknown>>();

type RuntimeCacheOptions = {
  enabled?: boolean;
  ttlMs?: number;
};

/**
 * Small process-local cache for production reads that are shared by requests.
 * Development and tests stay uncached unless explicitly enabled.
 */
export async function withRuntimeCache<T>(
  key: string,
  loader: () => Promise<T>,
  options: RuntimeCacheOptions = {},
): Promise<T> {
  const enabled = options.enabled ?? process.env.NODE_ENV === "production";
  if (!enabled) return loader();

  const now = Date.now();
  const current = entries.get(key) as RuntimeCacheEntry<T> | undefined;
  if (current && current.expiresAt > now) {
    return current.pending ?? current.value as T;
  }

  const pending = loader();
  const entry: RuntimeCacheEntry<T> = {
    expiresAt: now + (options.ttlMs ?? 60_000),
    pending,
  };
  entries.set(key, entry);

  try {
    const value = await pending;
    if (entries.get(key) === entry) {
      entries.set(key, {
        expiresAt: entry.expiresAt,
        value,
      });
    }
    return value;
  } catch (error) {
    if (entries.get(key) === entry) entries.delete(key);
    throw error;
  }
}

export function invalidateRuntimeCache(keyOrPrefix: string) {
  for (const key of entries.keys()) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) entries.delete(key);
  }
}
