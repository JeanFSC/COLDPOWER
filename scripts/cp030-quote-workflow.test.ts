import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionQuote, legacyQuoteStatus, quoteWorkflowStatuses } from "../src/lib/quote-workflow";

test("CP-030 expone estados canónicos de cotización y transiciones válidas", () => {
  assert.deepEqual(quoteWorkflowStatuses, ["DRAFT", "SENT", "FOLLOW_UP", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED", "CANCELLED"]);
  assert.equal(canTransitionQuote("DRAFT", "SENT"), true);
  assert.equal(canTransitionQuote("SENT", "FOLLOW_UP"), true);
  assert.equal(canTransitionQuote("FOLLOW_UP", "ACCEPTED"), true);
  assert.equal(canTransitionQuote("ACCEPTED", "CONVERTED"), true);
  assert.equal(canTransitionQuote("CONVERTED", "SENT"), false);
  assert.equal(legacyQuoteStatus("estado-inventado"), null);
});
