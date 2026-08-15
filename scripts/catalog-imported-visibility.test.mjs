import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "..");
const repository = readFileSync(join(root, "src/lib/catalog-repository.ts"), "utf8");

test("el catálogo público solo expone referencias publicadas y de origen activo", () => {
  assert.doesNotMatch(
    repository,
    /isNotNull\(products\.editorialDescription\)/,
    "la descripción editorial no debe ser un requisito para descubrir el catálogo base",
  );
  assert.match(repository, /publicationStatus,\s*"published"/, "el catálogo público debe exigir publicación editorial explícita");
  assert.match(
    repository,
    /lower\(\$\{products\.status\}\).*activo/,
    "solo deben aparecer productos con estado fuente activo",
  );
});
