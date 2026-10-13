import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("admin header Enter opens entity search instead of navigating only to catalog", async () => {
  const source = await readFile(new URL("../src/components/admin/AdminShell.tsx", import.meta.url), "utf8");
  const handler = source.slice(source.indexOf('if (event.key === "Enter" && query)'), source.indexOf('</label>', source.indexOf('if (event.key === "Enter" && query)')));
  assert.match(handler, /event\.preventDefault\(\)/);
  assert.match(handler, /setIsCommandOpen\(true\)/);
  assert.doesNotMatch(handler, /router\.push/);
});
