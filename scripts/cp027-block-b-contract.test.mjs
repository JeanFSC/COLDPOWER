import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("Bloque B declara campos editoriales y tablas de media/CMS", () => {
  const schema = read("src/db/schema.ts");
  assert.match(schema, /commercialName/);
  assert.match(schema, /featured/);
  assert.match(schema, /mediaAssets/);
  assert.match(schema, /mediaAssetUsages/);
  assert.match(schema, /cmsPages/);
  assert.match(schema, /cmsBlocks/);
});

test("Bloque B tiene migración aditiva, rollback y rutas principales", () => {
  const migration = read("drizzle/0008_lying_black_widow.sql");
  assert.match(migration, /CREATE TABLE "media_assets"/);
  assert.match(migration, /CREATE TABLE "media_asset_usages"/);
  assert.match(migration, /CREATE TABLE "cms_pages"/);
  assert.match(migration, /CREATE TABLE "cms_blocks"/);
  assert.match(migration, /ALTER TABLE "products" ADD COLUMN "commercial_name"/);
  assert.match(read("docs/migrations/rollback/2026-08-12-cp-027-bloque-b.sql"), /DROP TABLE IF EXISTS media_assets/);
  for (const route of [
    "src/app/api/admin/media/route.ts",
    "src/app/api/admin/media/[id]/route.ts",
    "src/app/api/admin/cms/[slug]/route.ts",
    "src/app/api/admin/catalogo/[id]/route.ts",
  ]) assert.ok(existsSync(join(root, route)), route);
});
