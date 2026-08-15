import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("server catalog search covers source model and dimension fields", async () => {
  const repository = await readFile(path.join(root, "src/lib/catalog-repository.ts"), "utf8");

  assert.match(repository, /ilike\(products\.modelCode, pattern\)/);
  assert.match(repository, /ilike\(products\.dimensions, pattern\)/);
  assert.match(repository, /ilike\(products\.length, pattern\)/);
  assert.match(repository, /ilike\(products\.connectionSize, pattern\)/);
});
