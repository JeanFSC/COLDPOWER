import assert from "node:assert/strict";
import test from "node:test";
import { deltaPct, formatPeriodDelta } from "../src/lib/period-metrics";

test("period deltas use safe comparison states", () => {
  assert.equal(formatPeriodDelta(5, 0).label, "Nuevo");
  assert.equal(formatPeriodDelta(140, 1).label, "Sin base comparable");
  assert.equal(formatPeriodDelta(143, 100).label, "↗ 43.0% vs. período anterior");
  assert.equal(formatPeriodDelta(3, 3).label, "Sin base comparable");
  assert.equal(deltaPct(143, 100), 43);
  assert.equal(deltaPct(140, 1), null);
});

test("extreme changes never render four-digit percentages", () => {
  const delta = formatPeriodDelta(110, 10);
  assert.match(delta.label, /×11\.0/);
  assert.doesNotMatch(delta.label, /\d{4,}%/);
  assert.equal(deltaPct(110, 10), 999);
});
