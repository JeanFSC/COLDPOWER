import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("Bloque E declara ventas, pedidos, pagos e historial", () => {
  const schema = read("src/db/sales-schema.ts");
  for (const table of ["sales", "saleItems", "orders", "orderItems", "payments", "paymentAttempts", "paymentEvidence", "paymentEvents", "orderStatusHistory"]) {
    assert.match(schema, new RegExp(`export const ${table}`));
  }
  const migrationFile = readdirSync(join(root, "drizzle")).find((file) => /^0011_.*\.sql$/.test(file));
  assert.ok(migrationFile, "falta la migración 0011 del Bloque E");
  const migration = read(join("drizzle", migrationFile));
  for (const table of ["sales", "sale_items", "orders", "order_items", "payments", "payment_events", "order_status_history"]) {
    assert.match(migration, new RegExp(table));
  }
});

test("checkout usa servicio transaccional, snapshots, idempotencia y reservas", () => {
  const route = read("src/app/api/checkout/route.ts");
  const service = read("src/lib/sales-service.ts");
  assert.match(route, /createCheckoutFromCart/);
  assert.match(route, /requireApiUser/);
  assert.doesNotMatch(route, /validateCheckoutInput\(/);
  assert.match(service, /createCheckoutOrder/);
  assert.match(service, /lockCartForCheckout/);
  assert.match(service, /transaction/);
  assert.match(service, /idempotencyKey/);
  assert.match(service, /inventoryReservations|reserveInventory/);
  assert.match(service, /orderItems/);
  assert.match(service, /auditLogs/);
});

test("pagos manuales requieren permiso y no publican proveedor inventado", () => {
  const route = read("src/app/api/admin/pagos/manual/route.ts");
  const provider = read("src/lib/payments.ts");
  assert.match(route, /requireApiPermission\("payments\.manual\.confirm"\)/);
  assert.match(route, /registerManualPayment/);
  assert.match(provider, /PaymentProvider/);
  assert.match(provider, /UnconfiguredPaymentProvider/);
});

test("cancelación de venta y facturación solo registran estados y referencias externas", () => {
  const cancellation = read("src/app/api/admin/ventas/[id]/route.ts");
  const service = read("src/lib/sales-service.ts");
  const invoicing = read("src/app/api/admin/ventas/[id]/facturacion/route.ts");
  assert.match(cancellation, /CANCELLATION_REASON_REQUIRED/);
  assert.match(cancellation, /cancelSale/);
  assert.match(service, /releaseInventoryReservationInTransaction/);
  assert.match(service, /sales\.cancelled/);
  assert.match(invoicing, /externalInvoiceReference/);
  assert.doesNotMatch(invoicing, /SUNAT|simulate|simul/);
});

test("WhatsApp persiste el lead antes de generar el enlace", () => {
  const route = read("src/app/api/whatsapp/lead/route.ts");
  const component = read("src/components/shared/WhatsAppLeadButton.tsx");
  assert.match(route, /ensureLeadFromQuote|createWhatsAppLead/);
  assert.match(route, /companySettings|company\.whatsapp/);
  assert.match(component, /fetch\("\/api\/whatsapp\/lead"/);
  assert.match(component, /window\.open/);
});
