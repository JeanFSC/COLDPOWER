import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { collectCmsMediaIds, validateCmsBlocks, validateCmsPageSlug } from "../src/lib/cms-validation";

const root = process.cwd(); const read = (file: string) => readFileSync(`${root}/${file}`, "utf8");

test("cms: slug y bloques se validan antes de persistir", () => {
  assert.equal(validateCmsPageSlug("home"), "home");
  assert.equal(validateCmsPageSlug("no-existe"), null);
  assert.equal(validateCmsBlocks([{ key: "hero", type: "hero", order: 0, payload: { mediaId: "media-1" } }]).ok, true);
  assert.equal(validateCmsBlocks([{ key: "hero", type: "hero", order: 0, payload: {} }, { key: "hero", type: "text", order: 1, payload: {} }]).ok, false);
  assert.equal(validateCmsBlocks([{ key: "hero", type: "hero", order: 0, payload: {} }, { key: "text", type: "text", order: 0, payload: {} }]).ok, false);
  assert.deepEqual(collectCmsMediaIds({ mediaId: "m1", nested: { assetIds: ["m2", "m3"] } }), ["m1", "m2", "m3"]);
});

test("cms: revisiones, publicación y media tienen controles de producción", () => {
  for (const file of ["src/lib/cms-repository.ts", "src/app/api/admin/cms/[slug]/route.ts", "src/app/api/admin/cms/[slug]/revisions/route.ts", "src/app/api/admin/cms/[slug]/preview/route.ts", "src/app/api/admin/media/route.ts", "src/app/api/admin/media/[id]/route.ts", "src/app/api/admin/media/[id]/usages/route.ts"]) assert.equal(existsSync(`${root}/${file}`), true, file);
  assert.match(read("src/lib/cms-repository.ts"), /cmsPageRevisions/);
  assert.match(read("src/lib/cms-repository.ts"), /synchronizeBlocks/);
  assert.match(read("src/lib/cms-repository.ts"), /ensureMediaReferences/);
  assert.match(read("src/lib/cms-repository.ts"), /db\.transaction/);
  assert.match(read("src/lib/cms-repository.ts"), /cms\.page_published/);
  assert.match(read("src/app/api/admin/cms/[slug]/route.ts"), /cms\.publish/);
  assert.match(read("src/app/api/admin/cms/[slug]/route.ts"), /cms\.edit/);
  assert.match(read("src/app/api/admin/media/route.ts"), /contentHash/);
  assert.match(read("src/app/api/admin/media/[id]/route.ts"), /MEDIA_IN_USE/);
  assert.match(read("src/lib/public-cms.ts"), /getCmsPage\(slug, true\)/);
});
