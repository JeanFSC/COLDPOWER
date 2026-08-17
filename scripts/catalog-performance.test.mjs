import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repository = await readFile(new URL("../src/lib/catalog-repository.ts", import.meta.url), "utf8");

test("catalog product rows and count stay parallelized", () => {
  assert.match(repository, /const \[rows, totalRows\] = await Promise\.all\(/);
});

test("public taxonomy reads keep a shared runtime cache", () => {
  assert.match(repository, /withRuntimeCache\("catalog:categories:public"/);
  assert.match(repository, /withRuntimeCache\("catalog:brands:public"/);
  assert.match(repository, /withRuntimeCache\(`catalog:families:public:/);
  assert.match(repository, /clearPublicCatalogRuntimeCache/);
});
