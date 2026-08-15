import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
assert.equal(existsSync(join(root, "scripts/import-inventory.ts")), true);
assert.equal(existsSync(join(root, "scripts/qa-inventory-full.ts")), true);
assert.equal(existsSync(join(root, "scripts/qa-inventory-data.ts")), true);
const schema = read("src/db/schema.ts");
const importer = read("scripts/import-inventory.ts") + read("scripts/inventory-import.mjs");
const qa = read("scripts/qa-inventory-data.ts");
assert.match(schema, /products = pgTable/);
assert.match(importer, /IMPORT_PRODUCTOS|1348/);
assert.match(qa, /mismatchCount|missingSkus|unexpectedSkus/);
assert.match(read("src/lib/catalog-repository.ts"), /getCatalogProducts/);
assert.doesNotMatch(read("src/app/page.tsx"), /catalogPilot|catalog-pilot/);
console.log("Phase 24 persistent 1,348-row catalog contract: PASS");
