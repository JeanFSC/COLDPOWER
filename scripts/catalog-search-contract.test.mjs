import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("server catalog search covers source model and dimension fields", async () => {
  const repository = await readFile(path.join(root, "src/lib/catalog-repository.ts"), "utf8");

  assert.match(repository, /const fields = \[products\.sku,[\s\S]*products\.modelCode,[\s\S]*products\.dimensions,[\s\S]*products\.length,[\s\S]*products\.connectionSize,/);
  assert.match(repository, /const termConditions = terms\.map/);
  assert.match(repository, /fields\.map\(\(field\) => ilike\(field, `%\$\{variant\}%`\)\)/);
});
