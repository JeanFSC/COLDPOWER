import assert from "node:assert/strict";
import test from "node:test";
import { formatSalesAxisValue } from "../src/lib/chart-axis-label";

test("empty chart axis has five distinct monetary labels", () => {
  assert.deepEqual([1, 0.75, 0.5, 0.25, 0].map(value => formatSalesAxisValue(value, "PEN")),
    ["S/ 1", "S/ 0.75", "S/ 0.5", "S/ 0.25", "S/ 0"]);
});

test("axis retains small amounts and compact large amounts without fabricating missing data", () => {
  assert.equal(formatSalesAxisValue(0.29, "USD"), "US$ 0.29");
  assert.equal(formatSalesAxisValue(-0.25, "PEN"), "S/ -0.25");
  assert.equal(formatSalesAxisValue(13000, "PEN"), "S/ 13k");
  assert.equal(formatSalesAxisValue(1200000, "USD"), "US$ 1.2M");
  assert.equal(formatSalesAxisValue(NaN, "PEN"), "N/D");
  assert.equal(formatSalesAxisValue(0, null), "N/D");
});
