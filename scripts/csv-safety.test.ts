import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { csvCell, csvText } from "../src/lib/csv";

test("CSV neutralizes expressions, whitespace prefixes and control prefixes", () => {
  for (const text of ["=1+1", "+SUM(1,2)", "-1+1", "@SUM(1,2)", "  =1+1", "\t=1+1", "\r=1+1", "\n=1+1", "\uFEFF=1+1"]) {
    assert.equal(csvText(text), `'${text}`);
    assert.ok(csvCell(text).startsWith('"\''));
  }
});

test("CSV preserves decimal money, identifiers, quotes, nulls and ISO dates", () => {
  for (const value of [-11, "-11.00", "0.00", "+11.00", "-1e3", "000123", "CP-REF-001"]) {
    assert.equal(csvText(value), String(value));
  }
  assert.equal(csvCell('Lima, "Centro"'), '"Lima, ""Centro"""');
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(new Date("2026-10-07T05:00:00Z")), '"2026-10-07T05:00:00.000Z"');
  assert.equal(csvText("-Infinity"), "'-Infinity");
});

test("All administrative CSV exports use the common guard directly or through a guarded helper", () => {
  const routes = fs.readdirSync("src/app/api/admin", { recursive: true }).map(String)
    .filter((file) => file.endsWith(path.join("export", "route.ts")));
  assert.equal(routes.length, 17);
  for (const route of routes) {
    const source = fs.readFileSync(path.join("src/app/api/admin", route), "utf8");
    assert.match(source, /@\/lib\/csv|toDashboardCsv|toPricingCsv/, route);
    assert.doesNotMatch(source, /function csv(?:Cell)?\(/, route);
  }
  for (const helper of ["dashboard-export", "pricing-export"]) {
    const source = fs.readFileSync(`src/lib/${helper}.ts`, "utf8");
    assert.match(source, /const text = csvText\(value\)/);
  }
});
