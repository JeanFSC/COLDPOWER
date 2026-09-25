import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("el análisis de producto expone cantidad cotizada", () => {
  const root = process.cwd();
  const service = readFileSync(join(root, "src/lib/product-analytics.ts"), "utf8");
  const page = readFileSync(join(root, "src/app/admin/catalogo/[id]/page.tsx"), "utf8");
  const workspace = readFileSync(join(root, "src/components/admin/ProductDetailWorkspace.tsx"), "utf8");
  assert.match(service, /quotedUnits/);
  assert.match(service, /historicalAveragePrice/);
  assert.match(service, /sum\(\$\{quoteItems\.quantity\}\)/);
  assert.match(page, /getProductAnalytics/);
  assert.match(page, /analytics=\{analytics\}/);
  assert.match(workspace, /analytics/);
});


