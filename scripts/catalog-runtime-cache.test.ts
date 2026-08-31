import assert from "node:assert/strict";
import test from "node:test";
import { invalidateRuntimeCache, withRuntimeCache } from "../src/lib/runtime-cache";

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
