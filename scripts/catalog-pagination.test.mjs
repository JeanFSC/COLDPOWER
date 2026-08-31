import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("catalog pages paginate while retaining active search filters", async () => {
  const [catalogPage, categoryPage, pagination] = await Promise.all([
    readFile(path.join(root, "src/app/catalogo/page.tsx"), "utf8"),
    readFile(path.join(root, "src/app/categoria/[slug]/page.tsx"), "utf8"),
    readFile(path.join(root, "src/components/catalog/CatalogPagination.tsx"), "utf8"),
  ]);

  assert.match(pagination, /key === "pagina"/);
  assert.match(pagination, /query\.append\(key, part\)/);
  assert.match(catalogPage, /CatalogPagination/);
  assert.match(catalogPage, /searchParams=\{params\}/);
  assert.match(categoryPage, /CatalogPagination/);
  assert.match(categoryPage, /searchParams=\{paramsQuery\}/);
});
