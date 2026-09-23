import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("CP-038 ventas tienen filtros, métricas, detalle y exportación server-side", () => {
  const contract = read("src/lib/sales-contract.ts");
  const repo = read("src/lib/sales-repository.ts");
  const route = read("src/app/api/admin/ventas/route.ts");
  const detail = read("src/app/api/admin/ventas/[id]/route.ts");
  const exportRoute = read("src/app/api/admin/ventas/export/route.ts");
  for (const field of ["query", "status", "customerId", "sellerId", "quoteId", "orderId", "paymentStatus", "invoiceStatus", "dateFrom", "dateTo", "page", "pageSize", "conversionRate"]) {
    assert.match(contract, new RegExp(field));
  }
  for (const field of ["totalAmount", "averageTicket", "quoteId", "orderId", "paymentStatus", "saleItems", "limit(pageSize)", "offset((page-1)*pageSize)"]) {
    assert.ok(repo.replaceAll(" ", "").includes(field.replaceAll(" ", "")), `falta ${field}`);
  }
  assert.match(route, /getSalesPage/);
  assert.match(detail, /getSaleDetail/);
  assert.match(exportRoute, /sales\.exported/);
  assert.match(exportRoute, /text\/csv/);
});

test("CP-038 preserva conversión idempotente, cancelación con motivo y facturación", () => {
  const service = read("src/lib/sales-service.ts");
  const cancel = read("src/app/api/admin/ventas/[id]/route.ts");
  const invoice = read("src/app/api/admin/ventas/[id]/facturacion/route.ts");
  const detail = read("src/lib/sales-repository.ts");
  assert.match(service, /idempotencyKey/);
  assert.match(service, /releaseInventoryReservationInTransaction/);
  assert.match(service, /cancelSale/);
  assert.match(cancel, /CANCELLATION_REASON_REQUIRED/);
  assert.match(cancel, /cancelSale/);
  assert.match(invoice, /INVOICE_REFERENCE_REQUIRED/);
  assert.match(invoice, /sales\.invoice_status_updated/);
  assert.match(detail, /opportunities/);
  assert.match(detail, /payments/);
});

test("CP-038 no inventa precios al preparar una conversión sin precios confirmados", () => {
  const route = read("src/app/api/admin/ventas/route.ts");
  assert.match(route, /unitPrice:\s*""/);
  assert.doesNotMatch(route, /unitPrice:\s*"0\.00"/);
});

test("CP-038 no mezcla monedas en la conciliación de ventas", () => {
  const repo = read("src/lib/sales-repository.ts");
  assert.match(repo, /payments\.currency, sales\.currency/);
  assert.match(repo, /paymentRefunds\.currency.*payments\.currency/);
  assert.match(repo, /p\.currency = \$\{sales\.currency\}/);
});

test("CP-038 separa el detalle financiero de ventas según RBAC", () => {
  const route = read("src/app/api/admin/ventas/[id]/route.ts");
  const repo = read("src/lib/sales-repository.ts");
  const ui = read("src/components/admin/SalesControlCenter.tsx");
  assert.match(route, /includeFinancial: can\(actor\.role, "payments\.view"\)/);
  assert.match(repo, /options: \{ includeFinancial\?: boolean \}/);
  assert.match(repo, /includeFinancial/);
  assert.match(ui, /canPaymentsView/);
  assert.match(ui, /tab === "Cobros" && canPaymentsView/);
});

test("CP-038 exporta documentos y conciliación financiera de cada venta", () => {
  const route = read("src/app/api/admin/ventas/export/route.ts");
  for (const field of ["Documentos", "Cobro", "Vendedor", "Recibido", "Reembolsado", "Diferencia"]) {
    assert.match(route, new RegExp(field));
  }
});

test("CP-038 ofrece loading state estructural para la navegación al módulo", () => {
  const loading = read("src/app/admin/ventas/loading.tsx");
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /Cargando ventas/);
  assert.match(loading, /animate-pulse/);
  assert.match(loading, /grid/);
});

test("CP-038 ofrece error state accionable sin exponer detalles internos", () => {
  const error = read("src/app/admin/ventas/error.tsx");
  const shared = read("src/components/admin/AdminSegmentError.tsx");
  assert.match(error, /No pudimos cargar las ventas/);
  assert.match(error, /unstable_retry/);
  assert.match(shared, /role="alert"/);
  assert.match(shared, /Reintentar/);
  assert.doesNotMatch(shared, /error\.message/);
});
