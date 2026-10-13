import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import fs from "node:fs";
import { tabularWorkbook } from "../src/lib/tabular-workbook";
import { toDashboardWorkbook } from "../src/lib/dashboard-export";
import { auditExportSnapshot } from "../src/lib/audit-export";
import { toPricingWorkbook } from "../src/lib/pricing-export";

test("Pricing workbook preserves missing amounts, zero, SKU text and excludes cost records", () => {
  const base = { id: "p", productId: "p", sku: "0000123", productName: "=1+1", categoryId: null, categoryName: null, familyId: null, familyName: null, brandId: null, brandName: null, price: null };
  const data = { items: [{ ...base, priceType: "RETAIL", amount: "10.25", currency: "PEN" }, { ...base, sku: "0000124", priceType: "COST", amount: "5.00", currency: "PEN" }, { ...base, sku: "0000125" }, { ...base, sku: "0000126", priceType: "RETAIL", amount: "0.00", currency: "PEN" }] } as Parameters<typeof toPricingWorkbook>[0];
  const book = XLSX.read(toPricingWorkbook(data, false), { type: "array" });
  const sheet = book.Sheets.Precios;
  assert.equal(sheet["!ref"], "A1:K4");
  assert.equal(sheet.A2.v, "0000123");
  assert.equal(sheet.B2.f, undefined);
  assert.equal(sheet.G2.t, "n");
  assert.equal(sheet.G2.v, 10.25);
  assert.equal(sheet.G3.v, "");
  assert.equal(sheet.G4.v, 0);
  const privileged = XLSX.read(toPricingWorkbook(data, true), { type: "array" });
  assert.equal(privileged.Sheets.Precios.F3.v, "COST");
  assert.equal(privileged.Sheets.Precios.G3.v, 5);
});

test("Pricing defaults to XLSX while explicitly labeled CSV and dashboard PDF remain available", () => {
  const pricing = fs.readFileSync("src/app/api/admin/precios/export/route.ts", "utf8");
  assert.match(pricing, /requireApiPermission\("pricing.view"\)/);
  assert.match(pricing, /filters.priceType === "COST" && !includeCost/);
  assert.match(pricing, /toPricingWorkbook\(data, includeCost\)/);
  assert.match(pricing, /params.get\("format"\) === "csv"/);
  assert.match(pricing, /"cache-control": "no-store"/);
  const promotions = fs.readFileSync("src/app/api/admin/promociones/export/route.ts", "utf8");
  assert.match(promotions, /requireApiPermission\("promotions.export"\)/);
  assert.match(promotions, /page <= first.totalPages/);
  assert.match(promotions, /params.get\("format"\) === "xlsx"/);
  const dashboard = fs.readFileSync("src/app/api/admin/dashboard/export/route.ts", "utf8");
  assert.match(dashboard, /url.searchParams.get\("format"\) === "xlsx"/);
  assert.match(dashboard, /toDashboardWorkbook\(data, actor\)/);
  assert.match(dashboard, /application\/pdf/);
});

test("Audit export snapshots preserve sanitized structured details and redact unauthorized access", () => {
  const input = { status: "DRAFT", password: "do-not-export", nested: { token: "do-not-export", qty: 2 }, items: [{ sku: "00012", api_key: "do-not-export" }] };
  assert.deepEqual(JSON.parse(auditExportSnapshot(input, true)), { status: "DRAFT", nested: { qty: 2 }, items: [{ sku: "00012" }] });
  assert.equal(auditExportSnapshot(input, false), "[REDACTED]");
  assert.equal(auditExportSnapshot(null, true), "");
  const book = XLSX.read(tabularWorkbook("Auditoría", ["Antes"], [[auditExportSnapshot(input, true)]]), { type: "array" });
  assert.equal(book.Sheets.Auditoría.A2.t, "s");
  assert.equal(book.Sheets.Auditoría.A2.f, undefined);
});

test("Audit and user export preserve permission gates and explicit truncation in both formats", () => {
  for (const [path, permission, count] of [["auditoria", "audit.export", 14], ["usuarios", "users.export", 10]] as const) {
    const source = fs.readFileSync(`src/app/api/admin/${path}/export/route.ts`, "utf8");
    assert.ok(source.includes(`requireApiPermission("${permission}")`));
    assert.match(source, /MAX_EXPORT_ITEMS = 5_000/);
    assert.match(source, /items.slice\(0, MAX_EXPORT_ITEMS\)/);
    assert.match(source, /if \(truncated\) values.push/);
    assert.match(source, /params.get\("format"\) === "csv"/);
    const headers = JSON.parse(source.match(/const headers = (\[[^\n]+\]);/)![1]) as string[];
    assert.equal(headers.length, count);
  }
  const audit = fs.readFileSync("src/app/api/admin/auditoria/export/route.ts", "utf8");
  assert.match(audit, /can\(actor.role, "audit.sensitive.view"\)/);
  assert.match(audit, /auditExportSnapshot\(item.before, canViewSensitive\)/);
  assert.match(audit, /auditExportSnapshot\(item.after, canViewSensitive\)/);
});

test("Report workbook separates sections, preserves numeric amounts and excludes privileged metrics without an actor", () => {
  const data = {
    filters: { range: "month" }, currency: "PEN", sales: 2, revenue: 100.25,
    quotes: 1, orders: { total: 3 }, criticalStock: 0, unknownStock: 1,
    costOfSales: 60, grossProfit: 40.25, grossMargin: null,
    operatingExpenses: null, operatingProfit: null, profitability: null,
    salesSeries: [{ date: "2026-10-07", total: 100.25, count: 2, orders: 3, units: 4 }],
    pipelineSummary: [{ stage: "NEW", stageLabel: "=1+1", count: 1, amount: 100, weightedValue: 10 }],
  } as Parameters<typeof toDashboardWorkbook>[0];
  const book = XLSX.read(toDashboardWorkbook(data), { type: "buffer" });
  assert.deepEqual(book.SheetNames, ["Contexto", "Resumen", "Serie", "Pipeline"]);
  assert.equal(book.Sheets.Resumen.B3.t, "n");
  assert.equal(book.Sheets.Resumen.B3.v, 100.25);
  assert.equal(book.Sheets.Resumen["!ref"], "A1:B7");
  assert.equal(book.Sheets.Serie.A2.v, "2026-10-07");
  assert.equal(book.Sheets.Pipeline.A2.t, "s");
  assert.equal(book.Sheets.Pipeline.A2.f, undefined);
  for (const role of ["OPERACIONES_VENTAS", "ADMIN", "VENTAS", "ALMACEN", "COMPRAS", "REPORTES", "admin", "customer"] as const) {
    const restricted = XLSX.read(toDashboardWorkbook(data, { role }), { type: "buffer" });
    assert.equal(restricted.Sheets.Resumen["!ref"], "A1:B7", role);
    assert.equal(restricted.Sheets.Resumen.A8, undefined, role);
  }
  for (const role of ["SUPERADMIN", "GERENCIA", "JEFATURA"] as const) {
    const permitted = XLSX.read(toDashboardWorkbook(data, { role }), { type: "buffer" });
    const summary = permitted.Sheets.Resumen;
    assert.equal(summary["!ref"], "A1:B13", role);
    assert.equal(summary.A8.v, "Costo de ventas", role);
    assert.equal(summary.B8.v, 60, role);
    assert.equal(summary.B8.t, "n", role);
    assert.equal(summary.B10.v, "", `${role}: unknown margin stays empty`);
    assert.equal(summary.B11.v, "", `${role}: unknown expenses stay empty`);
  }
  const source = fs.readFileSync("src/app/api/admin/reportes/export/route.ts", "utf8");
  assert.match(source, /requireApiPermission\("reports.export"\)/);
  assert.match(source, /params.get\("format"\) === "csv"/);
  assert.match(source, /toDashboardWorkbook\(data, actor\)/);
});

test("Workbook preserves text identifiers and formula-looking text without formulas", () => {
  const book = XLSX.read(tabularWorkbook("Clientes", ["Documento", "Teléfono", "Nombre", "Cantidad", "Fecha"], [["00001234", "+51900000006", "=1+1", 2, new Date("2026-10-07T05:00:00Z")]]), { type: "array" });
  const sheet = book.Sheets.Clientes;
  assert.equal(sheet.A2.t, "s");
  assert.equal(sheet.A2.v, "00001234");
  assert.equal(sheet.B2.v, "+51900000006");
  assert.equal(sheet.C2.t, "s");
  assert.equal(sheet.C2.f, undefined);
  assert.equal(sheet.D2.t, "n");
  assert.equal(sheet.E2.v, "2026-10-07T05:00:00.000Z");
  assert.equal(sheet["!autofilter"]?.ref, "A1:E2");
});

test("Workbook preserves empty columns and rejects malformed rows and non-finite numbers", () => {
  const book = XLSX.read(tabularWorkbook("Clientes", ["ID", "Nombre"], []), { type: "array" });
  assert.equal(book.Sheets.Clientes["!ref"], "A1:B1");
  assert.throws(() => tabularWorkbook("Clientes", ["ID"], [[1, 2]]), /INVALID_COLUMNS/);
  assert.throws(() => tabularWorkbook("Clientes", ["ID"], [[Infinity]]), /INVALID_NUMBER/);
});

test("Commercial export routes retain permission, complete pagination and explicit CSV option", () => {
  for (const [module, permission, count] of [["compras", "purchases.view", 8], ["oportunidades", "crm.export", 13], ["cotizaciones", "quotes.export", 14]] as const) {
    const source = fs.readFileSync(`src/app/api/admin/${module}/export/route.ts`, "utf8");
    assert.ok(source.includes(`requireApiPermission("${permission}")`));
    assert.match(source, /page <= first.totalPages/);
    assert.match(source, /searchParams\.get\("format"\) === "csv"/);
    assert.match(source, /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);
    assert.match(source, /Cache-Control.*no-store/);
    const headers = JSON.parse(source.match(/const header = (\[[^\n]+\]);/)![1]) as string[];
    assert.equal(headers.length, count);
    const book = XLSX.read(tabularWorkbook("Exportación", headers, []), { type: "array" });
    assert.equal(book.Sheets.Exportación["!ref"], `A1:${XLSX.utils.encode_col(count - 1)}1`);
  }
});

test("Inventory workbook distinguishes unknown stock from zero and preserves negative movements", () => {
  const book = XLSX.read(tabularWorkbook("Inventario", ["SKU", "Stock", "Mínimo", "Delta"], [["00001234", null, 0, -2]]), { type: "array" });
  const sheet = book.Sheets.Inventario;
  assert.equal(sheet.A2.v, "00001234");
  assert.equal(sheet.B2.v, "");
  assert.equal(sheet.C2.v, 0);
  assert.equal(sheet.C2.t, "n");
  assert.equal(sheet.D2.v, -2);
  assert.equal(sheet.D2.t, "n");
});

test("Inventory uses XLSX by default and Kardex preserves its explicitly labeled CSV download", () => {
  const inventory = fs.readFileSync("src/app/api/admin/inventario/export/route.ts", "utf8");
  const kardex = fs.readFileSync("src/app/api/admin/inventario/kardex/export/route.ts", "utf8");
  assert.match(inventory, /requireApiPermission\("inventory.view"\)/);
  assert.match(inventory, /searchParams.get\("format"\) === "csv"/);
  assert.match(kardex, /requireApiPermission\("inventory.kardex.view"\)/);
  assert.match(kardex, /searchParams.get\("format"\) === "xlsx"/);
  assert.match(kardex, /parseKardexFilters/);
  assert.match(kardex, /getInventoryKardexExport\(filters\)/);
});

test("Sales workbook preserves invoice references, partial quantities and negative differences", () => {
  const book = XLSX.read(tabularWorkbook("Ventas", ["Referencia", "Productos", "Diferencia"], [["00001234", "1/2", -11.25]]), { type: "array" });
  const sheet = book.Sheets.Ventas;
  assert.equal(sheet.A2.v, "00001234");
  assert.equal(sheet.A2.t, "s");
  assert.equal(sheet.B2.v, "1/2");
  assert.equal(sheet.B2.t, "s");
  assert.equal(sheet.C2.v, -11.25);
  assert.equal(sheet.C2.t, "n");
});

test("Sales and order export routes preserve financial permission gates for both formats", () => {
  const sales = fs.readFileSync("src/app/api/admin/ventas/export/route.ts", "utf8");
  const orders = fs.readFileSync("src/app/api/admin/pedidos/export/route.ts", "utf8");
  for (const source of [sales, orders]) {
    assert.match(source, /page <= first.totalPages/);
    assert.match(source, /searchParams.get\("format"\) === "csv"/);
    assert.match(source, /tabularWorkbook/);
  }
  assert.match(sales, /requireApiPermission\("sales.view"\)/);
  assert.match(orders, /requireApiPermission\("orders.view"\)/);
  assert.match(orders, /includeAmounts: canViewAmounts/);
  assert.match(orders, /includeFinancial: can\(actor.role, "payments.view"\)/);
  assert.match(orders, /canViewAmounts \? \["Total", "Moneda"\] : \[\]/);
  assert.match(orders, /canViewAmounts \? \[row.total, row.currency\] : \[\]/);
  assert.match(orders, /pageOptions.includeFinancial \? \[row.paymentReconciliation\] : \[\]/);
  assert.match(orders, /canViewAmounts && index === 3/);
});

test("Taxonomy export keeps active flags and counts typed and authorizes the requested entity", () => {
  const source = fs.readFileSync("src/app/api/admin/taxonomia/export/route.ts", "utf8");
  assert.match(source, /requireTaxonomyAccess\(filters.entity\)/);
  assert.match(source, /page <= first.totalPages/);
  assert.match(source, /params.get\("format"\) === "csv"/);
  const headers = JSON.parse(source.match(/const header = (\[[^\n]+\]);/)![1]) as string[];
  assert.equal(headers.length, 9);
  const book = XLSX.read(tabularWorkbook("Taxonomía", headers, [["000123", "Familia", "familia", false, "Categoría", 0, 0, "2026-10-07T05:00:00Z", "2026-10-07T05:00:00Z"]]), { type: "array" });
  const sheet = book.Sheets.Taxonomía;
  assert.equal(sheet.A2.v, "000123");
  assert.equal(sheet.D2.t, "b");
  assert.equal(sheet.D2.v, false);
  assert.equal(sheet.F2.t, "n");
  assert.equal(sheet.F2.v, 0);
});

test("Taxonomy export control follows entity selection and explicitly labels its scope", () => {
  const source = fs.readFileSync("src/components/admin/TaxonomyWorkspace.tsx", "utf8");
  assert.match(source, /selectedCanManage \? <a href=\{`\/api\/admin\/taxonomia\/export\?entity=\$\{selection.entity\}`\}/);
  assert.match(source, /Exportar \{entityLabel\(selection.entity\)\}s/);
  assert.match(source, /Exporta todas las/);
  assert.doesNotMatch(source, /href="\/api\/admin\/taxonomia\/export\?entity=categories"/);
});

test("Operations export retains filtered complete queue reads and exports numeric inventory values", () => {
  const source = fs.readFileSync("src/app/api/admin/operaciones/export/route.ts", "utf8");
  assert.match(source, /requireApiPermission\("operations.view"\)/);
  assert.match(source, /getOperationsExport\(filters\)/);
  assert.match(source, /params.get\("format"\) === "csv"/);
  assert.match(source, /tabularWorkbook\("Operaciones", headers, values\)/);
  const headers = JSON.parse(source.match(/const headers = (\[[^\n]+\]);/)![1]) as string[];
  assert.equal(headers.length, 17);
  const book = XLSX.read(tabularWorkbook("Operaciones", headers, [["inventoryAlerts", "000123", "000456", null, "=1+1", "NO_STOCK", null, null, "QA", null, new Date("2026-10-07T05:00:00Z"), null, "CRITICAL", "0000123", -2, 0, "NO_STOCK"]]), { type: "array" });
  assert.equal(book.Sheets.Operaciones.O2.t, "n");
  assert.equal(book.Sheets.Operaciones.O2.v, -2);
  assert.equal(book.Sheets.Operaciones.P2.v, 0);
  assert.equal(book.Sheets.Operaciones.N2.v, "0000123");
  assert.equal(book.Sheets.Operaciones.E2.f, undefined);
  assert.equal(book.Sheets.Operaciones.K2.v, "2026-10-07T05:00:00.000Z");
});
