import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("CMS: el encabezado abre el editor y los errores de carga/publicación son visibles", async () => {
  const views = await read("src/components/admin/AdminCategoryViews.tsx");
  const page = await read("src/app/admin/cms/page.tsx");
  const editor = await read("src/components/admin/CmsPageEditor.tsx");

  assert.match(views, /href="#cms-controls"/);
  assert.match(page, /id="cms-controls"/);
  assert.match(editor, /role=\{messageKind === "error" \? "alert"/);
  assert.match(editor, /if \(!response\.ok\) throw/);
});
