import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("catalog schema models dimensions, products, technical source fields, and quote items", async () => {
  const schema = await readFile(path.join(repoRoot, "src/db/schema.ts"), "utf8");

  for (const [exportName, table] of [["categories", "categories"], ["families", "families"], ["brands", "brands"], ["products", "products"], ["quoteItems", "quote_items"]]) {
    assert.match(schema, new RegExp(`export const ${exportName} = pgTable\\(\\s*\\\"${table}\\\"`), `missing ${exportName}`);
  }

  for (const field of [
    'sku: text("sku")',
    'slug: text("slug")',
    'categoryId: text("category_id")',
    'familyId: text("family_id")',
    'brandId: text("brand_id")',
    'originalName: text("original_name")',
    'normalizedName: text("normalized_name")',
    'compatibilityBrands: text("compatibility_brands").array()',
    'requiresReview: boolean("requires_review")',
    'reviewReason: text("review_reason")',
    'normalizationConfidence: text("normalization_confidence")',
    'sourcePage: integer("source_page")',
    'sourceRow: integer("source_row")',
    'voltage: text("voltage")',
    'refrigerant: text("refrigerant")',
    'quoteId: text("quote_id")',
    'skuSnapshot: text("sku_snapshot")',
    'productNameSnapshot: text("product_name_snapshot")',
  ]) {
    assert.match(schema, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing ${field}`);
  }

  assert.match(schema, /uniqueIndex\([\s\S]*products_sku/);
  assert.match(schema, /index\([\s\S]*products_category/);
});
