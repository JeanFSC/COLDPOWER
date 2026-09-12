import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { canTransitionPayment, normalizeProviderStatus, parsePaymentsFilters, PaymentsInvalidFilterError, reconciliationState, summarizePaymentLedger } from "../src/lib/payments-contract";

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
  assert.equal(reconciliationState("CONFIRMED", 100, 90), "UNDERPAID");
  assert.equal(reconciliationState("CONFIRMED", 100, 110), "OVERPAID");
});

test("pagos: ledger cubre múltiples cobros, parcial, sobrepago y estados no cobrados", () => {
  assert.deepEqual(summarizePaymentLedger(1000, [
    { amount: "400.00", status: "CONFIRMED" },
    { amount: 600, status: "APPROVED" },
    { amount: 200, status: "PENDING" },
    { amount: 100, status: "REJECTED" },
  ], []), { expected: 1000, gross: 1000, refunded: 0, net: 1000, balance: 0, difference: 0, reconciliation: "MATCH" });
  assert.equal(summarizePaymentLedger(1000, [{ amount: 400, status: "CONFIRMED" }], []).reconciliation, "UNDERPAID");
  assert.equal(summarizePaymentLedger(1000, [{ amount: 1200, status: "CONFIRMED" }], []).reconciliation, "OVERPAID");
});

test("pagos: reembolso parcial/full y refund pendiente respetan neto e idempotencia", () => {
  const partial = summarizePaymentLedger(1000, [{ amount: 1000, status: "CONFIRMED" }], [{ amount: 300, status: "SUCCEEDED" }, { amount: 100, status: "PENDING" }]);
  assert.deepEqual(partial, { expected: 1000, gross: 1000, refunded: 300, net: 700, balance: 300, difference: -300, reconciliation: "UNDERPAID" });
  const full = summarizePaymentLedger(1000, [{ amount: 1000, status: "REFUNDED" }], [{ amount: 1000, status: "SUCCEEDED" }]);
  assert.deepEqual(full, { expected: 1000, gross: 1000, refunded: 1000, net: 0, balance: 1000, difference: -1000, reconciliation: "UNDERPAID" });
  assert.equal(summarizePaymentLedger(1000, [{ amount: 1000, status: "CONFIRMED" }], [{ amount: 300, status: "PENDING" }]).refunded, 0);
});

test("pagos: rutas y controles de producción existen", () => {
  for (const file of ["src/app/api/admin/pagos/route.ts", "src/app/api/admin/pagos/[id]/route.ts", "src/app/api/admin/pagos/[id]/refund/route.ts", "src/app/api/admin/pagos/manual/route.ts", "src/app/api/admin/pagos/export/route.ts", "src/app/api/pagos/webhook/[provider]/route.ts"]) assert.equal(existsSync(`${root}/${file}`), true, file);
  assert.match(read("src/app/api/pagos/webhook/[provider]/route.ts"), /processPaymentWebhook/);
  assert.match(read("src/lib/payment-service.ts"), /PAYMENT_PROVIDER_NOT_CONFIGURED/);
  assert.match(read("src/lib/payment-service.ts"), /paymentStatusHistory/);
  assert.match(read("src/lib/payment-service.ts"), /paymentEvents/);
  assert.match(read("src/app/api/admin/pagos/manual/route.ts"), /payments\.manual\.confirm/);
  assert.match(read("src/app/api/admin/pagos/[id]/refund/route.ts"), /payments\.refund/);
  assert.match(read("src/lib/payment-service.ts"), /refund-\$\{paymentId\}/);
  assert.match(read("src/lib/sales-service.ts"), /PAYMENT_IDEMPOTENCY_CONFLICT/);
  assert.match(read("src/app/api/admin/pagos/export/route.ts"), /payments\.exported/);
});

test("pagos: conciliación y marcado de pagado respetan la moneda del pedido", () => {
  const repo = read("src/lib/payments-repository.ts");
  const paymentService = read("src/lib/payment-service.ts");
  const salesService = read("src/lib/sales-service.ts");
  assert.match(repo, /eq\(payments\.currency, orders\.currency\)/);
  assert.match(repo, /eq\(paymentRefunds\.currency, orders\.currency\)/);
  assert.match(repo, /p2\.currency = \$\{orderCurrencyReference\}/);
  assert.match(paymentService, /eq\(payments\.currency, order\.currency\)/);
  assert.match(paymentService, /eq\(paymentRefunds\.currency, order\.currency\)/);
  assert.match(salesService, /eq\(payments\.currency, order\.currency\)/);
  assert.match(salesService, /eq\(paymentRefunds\.currency, order\.currency\)/);
});
test("pagos: exportación incluye conciliación financiera completa", () => {
  const route = read("src/app/api/admin/pagos/export/route.ts");
  for (const field of ["Esperado", "Neto recibido", "Diferencia", "Conciliación"]) {
    assert.match(route, new RegExp(field));
  }
});

test("pagos: ofrece loading state estructural para la navegación al módulo", () => {
  const loading = read("src/app/admin/pagos/loading.tsx");
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /Cargando pagos/);
  assert.match(loading, /animate-pulse/);
  assert.match(loading, /grid/);
});

test("pagos: ofrece error state accionable sin exponer detalles internos", () => {
  const error = read("src/app/admin/pagos/error.tsx");
  const shared = read("src/components/admin/AdminSegmentError.tsx");
  assert.match(error, /No pudimos cargar los pagos/);
  assert.match(error, /unstable_retry/);
  assert.match(shared, /role="alert"/);
  assert.match(shared, /Reintentar/);
  assert.doesNotMatch(shared, /error\.message/);
});
