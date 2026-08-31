import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { canTransitionPayment, normalizeProviderStatus, parsePaymentsFilters, PaymentsInvalidFilterError, reconciliationState } from "../src/lib/payments-contract";

const root = process.cwd();
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8");

test("pagos: filtros, fechas y paginación", () => {
  const result = parsePaymentsFilters(new URLSearchParams("query=ORD-1&status=PENDING&provider=culqi&method=TRANSFER&orderId=o1&customerId=c1&dateFrom=2026-01-01&dateTo=2026-01-31&page=2&pageSize=50"));
  assert.equal(result.status, "PENDING");
  assert.equal(result.page, 2);
  assert.equal(result.pageSize, 50);
  assert.throws(() => parsePaymentsFilters(new URLSearchParams("status=INVALID")), PaymentsInvalidFilterError);
  assert.throws(() => parsePaymentsFilters(new URLSearchParams("dateFrom=2026-02-01&dateTo=2026-01-01")), PaymentsInvalidFilterError);
});

test("pagos: normalización y transiciones seguras", () => {
  assert.equal(normalizeProviderStatus("approved"), "CONFIRMED");
  assert.equal(normalizeProviderStatus("declined"), "REJECTED");
  assert.equal(normalizeProviderStatus("processing"), "PENDING");
  assert.equal(canTransitionPayment("PENDING", "CONFIRMED"), true);
  assert.equal(canTransitionPayment("CONFIRMED", "REJECTED"), false);
  assert.equal(canTransitionPayment("CONFIRMED", "REFUNDED"), true);
});

test("pagos: conciliación no declara éxito durante la espera", () => {
  assert.equal(reconciliationState("PENDING", 100, 0), "PENDING");
  assert.equal(reconciliationState("CONFIRMED", 100, 100), "MATCH");
  assert.equal(reconciliationState("CONFIRMED", 100, 90), "DIFFERENCE");
});

test("pagos: rutas y controles de producción existen", () => {
  for (const file of ["src/app/api/admin/pagos/route.ts", "src/app/api/admin/pagos/[id]/route.ts", "src/app/api/admin/pagos/[id]/refund/route.ts", "src/app/api/admin/pagos/manual/route.ts", "src/app/api/admin/pagos/export/route.ts", "src/app/api/pagos/webhook/[provider]/route.ts"]) assert.equal(existsSync(`${root}/${file}`), true, file);
  assert.match(read("src/app/api/pagos/webhook/[provider]/route.ts"), /processPaymentWebhook/);
  assert.match(read("src/lib/payment-service.ts"), /PAYMENT_PROVIDER_NOT_CONFIGURED/);
  assert.match(read("src/lib/payment-service.ts"), /paymentStatusHistory/);
  assert.match(read("src/lib/payment-service.ts"), /paymentEvents/);
  assert.match(read("src/app/api/admin/pagos/manual/route.ts"), /payments\.manual\.confirm/);
  assert.match(read("src/app/api/admin/pagos/[id]/refund/route.ts"), /payments\.refund/);
  assert.match(read("src/app/api/admin/pagos/export/route.ts"), /payments\.exported/);
});
