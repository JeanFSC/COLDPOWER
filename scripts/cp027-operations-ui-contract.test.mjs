import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("CRM expone creación de oportunidades y actividades persistentes", () => {
  const source = read("src/components/admin/CrmCreateForms.tsx");
  assert.match(source, /\/api\/admin\/oportunidades/);
  assert.match(source, /\/api\/admin\/actividades/);
  assert.match(source, /Nueva oportunidad/);
  assert.match(source, /Nueva actividad/);
  assert.match(source, /followUpAt|dueAt/);
});

test("biblioteca multimedia permite asociar assets a un slot gobernado", () => {
  const source = read("src/components/admin/MediaSlotAssociator.tsx");
  assert.match(source, /\/usages/);
  assert.match(source, /entityType/);
  assert.match(source, /entityId/);
  assert.match(source, /slot/);
});

test("promociones permiten cambiar estado y conservar auditoría", () => {
  const route = read("src/app/api/admin/promociones/[id]/route.ts");
  assert.match(route, /export async function PATCH/);
  assert.match(route, /promotions/);
  assert.match(route, /auditLogs/);
  const page = read("src/app/admin/promociones/page.tsx");
  assert.match(page, /PromotionStatusControl|promociones\/\$\{promotion\.id\}/);
});

test("promociones conservan vínculos de banner, productos y categorías", () => {
  const route = read("src/app/api/admin/promociones/route.ts");
  assert.match(route, /promotionProducts/);
  assert.match(route, /promotionCategories/);
  assert.match(route, /bannerAssetId/);
  assert.match(route, /transaction/);
  const form = read("src/components/admin/PromotionForm.tsx");
  assert.match(form, /bannerAssetId/);
  assert.match(form, /productIds/);
  assert.match(form, /categoryIds/);
});