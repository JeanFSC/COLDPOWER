import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("catalog renders an honest unavailable state when persistent storage is absent", async () => {
  const pagePath = path.join(root, "src/app/catalogo/page.tsx");
  const statePath = path.join(root, "src/components/catalog/CatalogUnavailable.tsx");
  const page = await readFile(pagePath, "utf8");

  assert.equal(existsSync(statePath), true);
  assert.match(page, /CatalogUnavailable/);
  assert.match(page, /catch/);
});
