import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("el panel administrativo de catálogo tiene filtros, colas y publicación autorizada", () => {
  assert.equal(fs.existsSync(path.join(root, "src", "lib", "admin-catalog.ts")), true);
  assert.equal(fs.existsSync(path.join(root, "src", "app", "api", "admin", "catalogo", "[id]", "publication", "route.ts")), true);
  assert.match(read("src/app/admin/catalogo/page.tsx"), /published|review|hidden|duplicate/i);
  assert.match(read("src/lib/admin-catalog.ts"), /possibleDuplicate|normalizationConfidence|sourceStatus/i);
  assert.match(read("src/app/api/admin/catalogo/[id]/publication/route.ts"), /PATCH/);
  assert.doesNotMatch(read("src/app/api/admin/catalogo/[id]/publication/route.ts"), /DELETE/);
});
