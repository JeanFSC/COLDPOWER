import assert from "node:assert/strict";
import test from "node:test";
import { parseQuoteValidity, quoteValidityDateInput } from "../src/lib/quote-validity";

test("date-only validity closes on the selected Lima day and round-trips in edit", () => {
  const date = parseQuoteValidity("2026-10-15")!;
  assert.equal(date.toISOString(), "2026-10-16T04:59:59.999Z");
  assert.equal(quoteValidityDateInput(date.toISOString()), "2026-10-15");
});
test("explicit instants are preserved and empty validity can be cleared", () => {
  assert.equal(parseQuoteValidity("2026-10-15T17:00:00Z")?.toISOString(), "2026-10-15T17:00:00.000Z");
  assert.equal(parseQuoteValidity(null), null);
  assert.equal(quoteValidityDateInput(null), "");
});
test("invalid dates and ambiguous datetimes are rejected", () => {
  for (const date of ["2026-02-30", "2026-10-15T12:00:00", "invalid", 15]) assert.throws(() => parseQuoteValidity(date));
  assert.equal(quoteValidityDateInput("invalid"), "");
});
