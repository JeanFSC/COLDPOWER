import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionTransfer } from "../src/lib/inventory-workflow";

test("CP-030 limita transferencias a DRAFT, REQUESTED, IN_TRANSIT, RECEIVED y CANCELLED", () => {
  assert.equal(canTransitionTransfer("DRAFT", "REQUESTED"), true);
  assert.equal(canTransitionTransfer("REQUESTED", "IN_TRANSIT"), true);
  assert.equal(canTransitionTransfer("IN_TRANSIT", "RECEIVED"), true);
  assert.equal(canTransitionTransfer("REQUESTED", "CANCELLED"), true);
  assert.equal(canTransitionTransfer("IN_TRANSIT", "CANCELLED"), true);
  assert.equal(canTransitionTransfer("DRAFT", "RECEIVED"), false);
  assert.equal(canTransitionTransfer("RECEIVED", "IN_TRANSIT"), false);
  assert.equal(canTransitionTransfer("REQUESTED", "APPROVED"), false);
});
