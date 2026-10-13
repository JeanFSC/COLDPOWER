import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("category menu type links retain their parent family filter", async () => {
  const source = await readFile(new URL("../src/components/layout/CategoryMegaMenu.tsx", import.meta.url), "utf8");
  assert.match(source, /familia=\$\{encodeURIComponent\(family\.slug\)\}&tipo=\$\{encodeURIComponent\(productType\.name\)\}/);
  assert.doesNotMatch(source, /href=\{`\/catalogo\?tipo=/);
});

test("public navigation uses active families with active parent categories", async () => {
  const source = await readFile(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  const loader = source.slice(source.indexOf("async function loadNavigationFamilies"), source.indexOf("async function loadNavigationProductTypes"));
  assert.match(loader, /await getCatalogFamilies\(\)/);
  assert.doesNotMatch(loader, /getCatalogFamilies\([^)]*false/);
});
