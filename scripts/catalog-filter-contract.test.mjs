import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("catalog filters expose dynamic categories and families backed by server queries", async () => {
  const [page, filters, repository] = await Promise.all([
    readFile(path.join(root, "src/app/catalogo/page.tsx"), "utf8"),
    readFile(path.join(root, "src/components/catalog/CatalogFilters.tsx"), "utf8"),
    readFile(path.join(root, "src/lib/catalog-repository.ts"), "utf8"),
  ]);
  assert.match(page, /getCatalogFamilies/);
  assert.match(filters, /name="familia"/);
  assert.match(repository, /familySlug/);
});
