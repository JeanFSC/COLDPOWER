import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(file, "utf8");
const views = await read("src/components/admin/AdminCategoryViews.tsx");
const pipeline = await read("src/components/admin/PipelineWorkspace.tsx");
const quotes = await read("src/components/admin/QuotesWorkspace.tsx");
const inventory = await read("src/components/admin/InventoryAdminWorkspace.tsx");
const catalog = await read("src/components/admin/AdminProductCatalog.tsx");
const sales = await read("src/components/admin/SalesControlCenter.tsx");
const orders = await read("src/components/admin/OrdersControlCenter.tsx");
const payments = await read("src/components/admin/PaymentsControlCenter.tsx");
const layout = await read("src/app/admin/layout.tsx");
const shell = await read("src/components/admin/AdminShell.tsx");

for (const name of [
  "ProductWorkspace",
  "InventoryWorkspace",
  "PricingWorkspace",
  "OrdersWorkspace",
  "PaymentsWorkspace",
  "ContentWorkspace",
  "ReportsWorkspace",
  "AuditWorkspace",
  "UsersWorkspace",
  "CompanySettingsWorkspace",
]) {
  assert.match(views, new RegExp(`export function ${name}`), `${name} must remain available for its active consumer`);
}

assert.doesNotMatch(views, /export function (Pipeline|Quotes|Sales)Workspace/);
assert.match(pipeline, /export function PipelineWorkspace/);
assert.match(quotes, /export function QuotesWorkspace/);
assert.match(inventory, /export function InventoryAdminWorkspace/);
assert.match(catalog, /export function AdminProductCatalog/);
assert.match(sales, /export function SalesControlCenter/);
assert.match(orders, /export function OrdersControlCenter/);
assert.match(payments, /export function PaymentsControlCenter/);

assert.match(layout, /ADMIN_NAV_ITEMS/);
for (const section of ["Comercial", "Operación", "Catálogo", "Gestión"]) {
  assert.match(layout, new RegExp(`section: "${section}"`));
}
assert.match(layout, /label: "Compras"/);
assert.match(layout, /permission: "purchases\.view"/);
assert.match(shell, /useSearchParams/);
assert.match(shell, /w-\[190px\]/);

console.log("admin-category-ui-contract: passed");
