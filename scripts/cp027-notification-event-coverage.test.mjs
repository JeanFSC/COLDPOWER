import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("el centro cubre los eventos operativos CP-027", () => {
  const service = read("src/lib/notifications-service.ts");
  assert.match(service, /notifyStaffOnce/);
  assert.match(service, /dedupeKey/);
  assert.match(service, /metadata/);

  const quoteRoute = read("src/app/api/cotizacion/route.ts");
  assert.match(quoteRoute, /QUOTE_CREATED/);
  assert.match(quoteRoute, /LEAD_CREATED/);

  const salesService = read("src/lib/sales-service.ts");
  assert.match(salesService, /SALE_CREATED/);
  assert.match(salesService, /ORDER_READY/);

  const webhook = read("src/app/api/pagos/webhook/[provider]/route.ts");
  const paymentService = read("src/lib/payment-service.ts");
  assert.match(webhook, /processPaymentWebhook/);
  assert.match(webhook, /x-payment-signature|x-signature/);
  assert.match(paymentService, /PAYMENT_APPROVED/);
  assert.match(paymentService, /PAYMENT_FAILED/);

  const crmService = read("src/lib/crm-service.ts");
  assert.match(crmService, /FOLLOW_UP_OVERDUE/);

  assert.match(salesService, /notifyInventoryState/);
  const purchasesService = read("src/lib/purchases-service.ts");
  assert.match(purchasesService, /notifyInventoryState/);

  const inventoryService = read("src/lib/inventory.ts");
  assert.match(inventoryService, /STOCK_MINIMUM/);
  assert.match(inventoryService, /PRODUCT_OUT_OF_STOCK/);

  const transferRoute = read("src/app/api/admin/inventario/transferencias/[id]/route.ts");
  assert.match(transferRoute, /TRANSFER_APPROVAL_PENDING/);
});


