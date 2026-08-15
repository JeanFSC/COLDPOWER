import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionPublication, validateDuplicateDecision } from "@/lib/catalog-admin-contract";

test("CP-031 publication only allows governed transitions", () => {
  assert.equal(canTransitionPublication("draft", "published"), false);
  assert.equal(canTransitionPublication("draft", "review"), true);
  assert.equal(canTransitionPublication("review", "published"), true);
  assert.equal(canTransitionPublication("review", "draft"), true);
  assert.equal(canTransitionPublication("published", "hidden"), true);
  assert.equal(canTransitionPublication("hidden", "published"), true);
});

test("CP-031 duplicate review rejects self-canonical references", () => {
  assert.throws(
    () => validateDuplicateDecision({ productId: "p1", decision: "confirmed", canonicalProductId: "p1" }),
    /CATALOG_DUPLICATE_INVALID/,
  );
});
