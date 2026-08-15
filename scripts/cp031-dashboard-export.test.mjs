import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("dashboard export reuses filters and emits CSV", () => {
  const source = fs.readFileSync("src/app/api/admin/dashboard/export/route.ts", "utf8");
  assert.match(source, /searchParams/);
  assert.match(source, /getOperationsDashboard/);
  assert.match(source, /text\/csv/);
  assert.match(source, /DASHBOARD_EMPTY/);
});
