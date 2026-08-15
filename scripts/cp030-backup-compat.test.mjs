import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("backup previo a migración no depende de columnas CP-030 aún no aplicadas", async () => {
  const source = await readFile(new URL("../scripts/backup-database.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /db\.select\(\)\.from\(quotes\)/);
  assert.match(source, /trackingCode: quotes\.trackingCode/);
});
