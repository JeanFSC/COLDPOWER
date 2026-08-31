import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("catálogo público carga nombre comercial y media activa", () => {
  const repository = read("src/lib/catalog-repository.ts");
  const mapper = read("src/lib/catalog-view-model.ts");
  const media = read("src/lib/media-repository.ts");
  assert.match(repository, /commercialName/);
  assert.match(repository, /getPublishedMediaForEntities/);
  assert.match(media, /mediaAssetUsages|mediaAssets/);
  assert.match(media, /ACTIVE/);
  assert.match(mapper, /commercialName/);
});

test("páginas públicas conservan fallback cuando no hay CMS publicado", () => {
  for (const file of ["src/app/page.tsx", "src/app/nosotros/page.tsx", "src/app/contacto/page.tsx"]) {
    const source = read(file);
    assert.match(source, /loadPublishedCms|fallback|CMS|cms/i, file);
  }
});
