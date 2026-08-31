import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeAuditValue } from "../src/lib/operational-semantics";

test("CP-030 elimina secretos anidados de before/after/metadata", () => {
  const value = sanitizeAuditValue({
    email: "user@example.test",
    password: "hidden",
    nested: { token: "hidden", safe: 1 },
    list: [{ apiKey: "hidden", status: "ok" }],
  });

  assert.deepEqual(value, {
    email: "user@example.test",
    nested: { safe: 1 },
    list: [{ status: "ok" }],
  });
});
