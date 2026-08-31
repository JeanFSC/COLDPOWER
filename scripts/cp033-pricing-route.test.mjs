import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("CP-033 expone el contrato paginado y filtra precios en servidor", () => {
  const route = read("src/app/api/admin/precios/route.ts");
  const repository = read("src/lib/pricing-repository.ts");
  assert.match(route, /parsePricingFilters/);
  assert.match(route, /getPricingPage/);
  assert.match(repository, /totalWithPrice/);
  assert.match(repository, /totalWithoutPrice/);
  assert.match(repository, /limit\(pageSize\)/);
  assert.match(repository, /offset\(\(page - 1\) \* pageSize\)/);
  assert.match(repository, /exists\(/);
  assert.doesNotMatch(repository, /rows\.slice\(/);
});

test("CP-033 protege historial y exportación, con auditoría y máscara de costos", () => {
  const history = read("src/app/api/admin/precios/historial/route.ts");
  const exportRoute = read("src/app/api/admin/precios/export/route.ts");
  const csv = read("src/lib/pricing-export.ts");
  assert.match(history, /requireApiPermission\("pricing\.view"\)/);
  assert.match(history, /parsePricingHistoryFilters/);
  assert.match(history, /getPricingHistoryPage/);
  assert.match(exportRoute, /content-type.*text\/csv/i);
  assert.match(exportRoute, /pricing\.exported/);
  assert.match(csv, /priceType === "COST" && !canViewCost/);
});

test("CP-033 mantiene mutaciones transaccionales, auditadas e idempotentes", () => {
  const service = read("src/lib/pricing-service.ts");
  const discountService = read("src/lib/discount-service.ts");
  const schema = read("src/db/schema.ts");
  assert.match(service, /db\.transaction/);
  assert.match(service, /price_history|priceHistory/);
  assert.match(service, /auditLogs/);
  assert.match(service, /idempotencyKey/);
  assert.match(service, /export async function createPrice/);
  assert.match(service, /export async function updatePrice/);
  assert.match(service, /export async function archivePrice/);
  assert.match(discountService, /pricing\.discount\.manage/);
  assert.match(discountService, /createDiscountRule/);
  assert.match(discountService, /updateDiscountRule/);
  assert.match(discountService, /setDiscountRuleStatus/);
  assert.match(discountService, /auditLogs/);
  assert.match(schema, /product_prices_idempotency_unique/);
});

test("CP-033 no entrega la capacidad de administrar descuentos a roles operativos", () => {
  const roles = read("src/lib/roles.ts");
  const core = roles.match(/const businessCore = \[([\s\S]*?)\];/)?.[1] ?? "";
  const management = roles.match(/const businessManagement = \[([\s\S]*?)\];/)?.[1] ?? "";
  assert.doesNotMatch(core, /pricing\.discount\.manage/);
  assert.match(management, /pricing\.discount\.manage/);
});

test("CP-033 página de precios consume métricas, filtros, paginación e historial reales", () => {
  const page = read("src/app/admin/precios/page.tsx");
  const workspace = read("src/components/admin/AdminCategoryViews.tsx");
  assert.match(page, /getPricingPage/);
  assert.match(page, /getPricingHistoryPage/);
  assert.match(page, /historyCount/);
  assert.match(workspace, /hrefForPage/);
  assert.match(workspace, /categoryId/);
  assert.match(workspace, /exportHref/);
  assert.match(workspace, /price-controls/);
});
