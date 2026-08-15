import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("el modelo de producto incluye disponibilidad desconocida y la UI no inventa bajo pedido", () => {
  const product = fs.readFileSync(path.join(root, "src", "types", "product.ts"), "utf8");
  const schema = fs.readFileSync(path.join(root, "src", "db", "schema.ts"), "utf8");
  assert.match(product, /unknown/);
  assert.match(schema, /availabilityStatus/);
  assert.match(fs.readFileSync(path.join(root, "src", "lib", "publication-governance.ts"), "utf8"), /Consultar disponibilidad/);
});
