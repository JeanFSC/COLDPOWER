import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const views = await readFile("src/components/admin/AdminCategoryViews.tsx", "utf8");
const layout = await readFile("src/app/admin/layout.tsx", "utf8");
const shell = await readFile("src/components/admin/AdminShell.tsx", "utf8");

for (const name of [
  "ProductWorkspace",
  "InventoryWorkspace",
  "PricingWorkspace",
  "CustomersWorkspace",
  "PipelineWorkspace",
  "QuotesWorkspace",
  "SalesWorkspace",
  "OrdersWorkspace",
  "PaymentsWorkspace",
  "ContentWorkspace",
  "ReportsWorkspace",
  "AuditWorkspace",
  "UsersWorkspace",
  "CompanySettingsWorkspace",
]) {
  assert.match(views, new RegExp(`export function ${name}`), `${name} must exist`);
}

assert.match(layout, /\/admin\/pagos/);
assert.match(layout, /label: "CMS"|label: "Contenido"/);
assert.match(shell, /useSearchParams/);assert.match(layout, /label: "CMS"/, "CMS must be visible in the admin navigation");
assert.doesNotMatch(layout, /label: "Compras"/, "reference sidebar should not expose Compras");
assert.match(shell, /w-\[190px\]/, "desktop shell should use the compact reference sidebar");
assert.match(views, /Movimientos recientes/, "inventory should include recent movements");
assert.match(views, /Alertas de inventario/, "inventory should include inventory alerts");
assert.match(views, /Resumen del pipeline/, "pipeline should include the summary panel");
assert.match(views, /Seguimientos vencidos/, "pipeline should include overdue follow-ups");
assert.match(views, /PaymentDonut/, "payments should render a visible status chart");

console.log("admin-category-ui-contract: passed");


