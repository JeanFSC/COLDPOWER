import assert from "node:assert/strict";
import test from "node:test";
import { createPublicRateLimiter } from "../src/lib/public-rate-limit";

test("el rate limit público bloquea el exceso y expone reintento", () => {
  const limiter = createPublicRateLimiter({ max: 2, windowMs: 1_000 });
  assert.equal(limiter.check("ip:unique", 10).allowed, true);
  assert.equal(limiter.check("ip:unique", 20).allowed, true);
  const blocked = limiter.check("ip:unique", 30);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.retryAfterSeconds, 1);
  assert.equal(limiter.check("ip:unique", 1_010).allowed, true);
});
