import assert from "node:assert/strict";
import test from "node:test";
import { bulkPricingAttempt } from "../src/lib/bulk-pricing-attempt";

test("bulk pricing retry retains the same key for the same payload", () => {
  let count = 0;
  const key = () => `qa-${++count}`;
  const payload = { productIds: ["qa"], amount: "12", reason: "QA" };
  const first = bulkPricingAttempt(null, payload, key);
  assert.equal(bulkPricingAttempt(first, { ...payload }, key), first);
  assert.equal(count, 1);
  const changed = bulkPricingAttempt(first, { ...payload, amount: "13" }, key);
  assert.notEqual(changed.key, first.key);
  const completed = bulkPricingAttempt(null, payload, key);
  assert.notEqual(completed.key, first.key);
});
