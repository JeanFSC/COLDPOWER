import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("inventory operations expose reproducible migration, slug rebuild, and database QA commands", async () => {
  const [packageJson, readme] = await Promise.all([
    readFile(path.join(root, "package.json"), "utf8"),
    readFile(path.join(root, "README.md"), "utf8"),
  ]);
  const packageData = JSON.parse(packageJson);

  assert.match(packageData.scripts["db:migrate"], /migrate-database/);
  assert.match(packageData.scripts["db:rebuild-product-slugs"], /rebuild-product-slugs/);
  assert.match(packageData.scripts["qa:inventory-db"], /qa-inventory-full/);
  assert.match(packageData.scripts["qa:inventory-data"], /qa-inventory-data/);
  assert.match(packageData.scripts["test:inventory"], /qa-inventory-full\.test\.ts/);
  assert.match(packageData.scripts["test:inventory"], /rebuild-product-slugs\.test\.ts/);
  assert.match(packageData.scripts["test:inventory"], /qa-inventory-data\.test\.ts/);
  assert.match(readme, /corepack pnpm db:migrate/);
  assert.match(readme, /corepack pnpm db:rebuild-product-slugs --apply/);
  assert.match(readme, /corepack pnpm qa:inventory-db/);
  assert.match(readme, /corepack pnpm qa:inventory-data/);
  assert.doesNotMatch(readme, /corepack pnpm db:push/);
});
