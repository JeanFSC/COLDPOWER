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

test("páginas públicas conservan contenido recuperable cuando no hay CMS publicado", () => {
  const home = read("src/app/page.tsx");
  const about = read("src/app/nosotros/page.tsx");
  const contact = read("src/app/contacto/page.tsx");
  assert.match(home, /loadPublishedCms/);
  assert.match(about, /timeline|FinalCTA|nosotros-almacen/);
  assert.match(contact, /fallbackAssets|getCmsPage|ContactPage/);
});
