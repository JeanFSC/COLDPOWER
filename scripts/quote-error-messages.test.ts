import test from "node:test";
import assert from "node:assert/strict";

import { validateQuotePayload } from "../src/lib/quote";

test("quote validation returns readable Spanish error messages", () => {
  const result = validateQuotePayload({ customerType: "natural", documentNumber: "1", phone: "1", message: "corto" });

  assert.equal(result.ok, false);
  if (result.ok) return;

  const messages = Object.values(result.errors).join(" ");
  assert.doesNotMatch(messages, /Ã|Â|ƒ/);
  assert.match(messages, /dígitos/);
  assert.match(messages, /teléfono/);
  assert.match(messages, /código/);
  assert.match(messages, /país/);
});
