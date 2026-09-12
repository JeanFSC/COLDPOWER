import assert from "node:assert/strict";
import test from "node:test";
import {
  getOperationsComparisonPeriods,
  parseOperationsFilters,
} from "@/lib/operations-contract";

test("KPI operations comparisons use an immediately preceding equal window", () => {
  const filters = parseOperationsFilters(
    new URLSearchParams("range=custom&from=2026-08-08&to=2026-08-14"),
  );
  const periods = getOperationsComparisonPeriods(filters);

  assert.equal(periods.current.fromAt.toISOString(), "2026-08-08T05:00:00.000Z");
  assert.equal(periods.current.toAt.toISOString(), "2026-08-14T05:00:00.000Z");
  assert.equal(periods.previous.fromAt.toISOString(), "2026-08-01T05:00:00.000Z");
  assert.equal(periods.previous.toAt.toISOString(), "2026-08-07T05:00:00.000Z");
  assert.equal(periods.label, "vs. periodo anterior");
});

test("an unbounded queue view uses two adjacent 30-day KPI windows", () => {
  const periods = getOperationsComparisonPeriods(
    parseOperationsFilters(new URLSearchParams("range=all")),
  );
  const day = 24 * 60 * 60 * 1000;

  assert.equal((periods.current.toAt.getTime() - periods.current.fromAt.getTime()) / day, 29);
  assert.equal((periods.previous.toAt.getTime() - periods.previous.fromAt.getTime()) / day, 29);
  assert.equal(periods.current.fromAt.getTime() - periods.previous.toAt.getTime(), day);
  assert.equal(periods.label, "vs. 30 días anteriores");
});
