import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("configuración: las pestañas y la acción principal navegan a contenido real", async () => {
  const views = await read("src/components/admin/AdminCategoryViews.tsx");
  const form = await read("src/components/admin/CompanySettingsForm.tsx");

  assert.match(views, /href="#company-settings-form"/);
  assert.match(views, /href=\{`#\$\{tab\.id\}`\}/);
  assert.doesNotMatch(views, /disabled=\{index !== 0\}/);
  assert.match(form, /id="company-settings-form"/);
  assert.match(form, /role=\{messageKind === "error" \? "alert"/);
});

test("cotizaciones: los errores de estado y conversión se anuncian al usuario", async () => {
  const status = await read("src/components/admin/QuoteStatusControl.tsx");
  const conversion = await read("src/components/admin/QuoteConversionControl.tsx");

  assert.match(status, /role="alert"|role=\{[^}]*"alert"/);
  assert.match(status, /"message"/);
  assert.match(conversion, /role="alert"|role=\{[^}]*"alert"/);
  assert.match(conversion, /"message"/);
});
