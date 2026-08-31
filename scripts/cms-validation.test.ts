import test from "node:test";
import assert from "node:assert/strict";
import { cmsPageSlugs, validateCmsBlocks, validateCmsPageSlug } from "@/lib/cms-validation";

test("solo permite páginas CMS públicas conocidas", () => {
  assert.deepEqual(cmsPageSlugs, ["home", "nosotros", "contacto", "footer"]);
  assert.equal(validateCmsPageSlug("home"), "home");
  assert.equal(validateCmsPageSlug("admin"), null);
  assert.equal(validateCmsPageSlug(""), null);
});

test("valida tipos, claves, orden y payload de bloques CMS", () => {
  const result = validateCmsBlocks([
    { key: "hero-principal", type: "hero", order: 0, status: "draft", payload: { title: "Texto editorial" } },
    { key: "contacto", type: "contact", order: 1, status: "published", payload: { phone: null } },
  ]);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.blocks[0]?.key, "hero-principal");
});

test("rechaza bloques desconocidos, payloads no objeto y órdenes duplicados", () => {
  assert.equal(validateCmsBlocks([{ key: "x", type: "unknown", order: 0, payload: {} }]).ok, false);
  assert.equal(validateCmsBlocks([{ key: "x", type: "text", order: 0, payload: "texto" }]).ok, false);
  assert.equal(validateCmsBlocks([{ key: "x", type: "text", order: 0, payload: {} }, { key: "y", type: "text", order: 0, payload: {} }]).ok, false);
});

test("rechaza bloques publicados sin una clave válida o con demasiado contenido", () => {
  assert.equal(validateCmsBlocks([{ key: "bad key", type: "text", order: 0, status: "published", payload: {} }]).ok, false);
  assert.equal(validateCmsBlocks(Array.from({ length: 21 }, (_, order) => ({ key: `b-${order}`, type: "text", order, payload: {} }))).ok, false);
});
