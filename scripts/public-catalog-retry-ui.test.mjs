import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("el estado publico de catalogo no deja al usuario sin recuperacion", async () => {
  const source = await readFile(path.join(root, "src/components/catalog/CatalogUnavailable.tsx"), "utf8");

  assert.match(source, /"use client"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /window\.location\.reload\(\)/);
  assert.match(source, />Reintentar<\/Button>/);
});
