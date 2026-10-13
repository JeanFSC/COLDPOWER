import assert from "node:assert/strict";
import test from "node:test";
import { invalidateRuntimeCache, withRuntimeCache } from "../src/lib/runtime-cache";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

test("a read invalidated while loading cannot repopulate the cache", async () => {
  const key = `test:cache-invalidated:${crypto.randomUUID()}`;
  const old = deferred<string>();
  try {
    const pending = withRuntimeCache(key, () => old.promise, { enabled: true });
    invalidateRuntimeCache(key);
    old.resolve("old");
    assert.equal(await pending, "old");
    assert.equal(await withRuntimeCache(key, async () => "fresh", { enabled: true }), "fresh");
  } finally { invalidateRuntimeCache(key); }
});

test("an older read cannot replace a value loaded after invalidation", async () => {
  const key = `test:cache-replaced:${crypto.randomUUID()}`;
  const old = deferred<string>();
  try {
    const pending = withRuntimeCache(key, () => old.promise, { enabled: true });
    invalidateRuntimeCache(key);
    assert.equal(await withRuntimeCache(key, async () => "fresh", { enabled: true }), "fresh");
    old.resolve("old");
    await pending;
    assert.equal(await withRuntimeCache(key, async () => "unexpected", { enabled: true }), "fresh");
  } finally { invalidateRuntimeCache(key); }
});

test("an expired pending read cannot overwrite its replacement", async () => {
  const key = `test:cache-expired:${crypto.randomUUID()}`;
  const old = deferred<string>();
  try {
    const pending = withRuntimeCache(key, () => old.promise, { enabled: true, ttlMs: 0 });
    await withRuntimeCache(key, async () => "fresh", { enabled: true });
    old.resolve("old");
    await pending;
    assert.equal(await withRuntimeCache(key, async () => "unexpected", { enabled: true }), "fresh");
  } finally { invalidateRuntimeCache(key); }
});

test("failure of an invalidated read preserves the newer cache entry", async () => {
  const key = `test:cache-rejected:${crypto.randomUUID()}`;
  const old = deferred<string>();
  try {
    const pending = withRuntimeCache(key, () => old.promise, { enabled: true });
    const rejected = assert.rejects(pending, /QA old failure/);
    invalidateRuntimeCache(key);
    await withRuntimeCache(key, async () => "fresh", { enabled: true });
    old.reject(new Error("QA old failure"));
    await rejected;
    assert.equal(await withRuntimeCache(key, async () => "unexpected", { enabled: true }), "fresh");
  } finally { invalidateRuntimeCache(key); }
});

test("coalesces concurrent reads and reuses the production value", async () => {
  const key = `test:catalog-cache:${Date.now()}`;
  let calls = 0;
  const loader = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { value: calls };
  };

  const [first, second] = await Promise.all([
    withRuntimeCache(key, loader, { enabled: true, ttlMs: 1_000 }),
    withRuntimeCache(key, loader, { enabled: true, ttlMs: 1_000 }),
  ]);

  assert.equal(calls, 1);
  assert.deepEqual(first, { value: 1 });
  assert.deepEqual(second, { value: 1 });
  invalidateRuntimeCache(key);
});

test("invalidates all catalog cache entries by prefix", async () => {
  const prefix = `test:catalog-prefix:${Date.now()}`;
  let calls = 0;
  const loader = async () => ++calls;

  await withRuntimeCache(`${prefix}:one`, loader, { enabled: true });
  await withRuntimeCache(`${prefix}:two`, loader, { enabled: true });
  invalidateRuntimeCache(prefix);
  await withRuntimeCache(`${prefix}:one`, loader, { enabled: true });

  assert.equal(calls, 3);
});
