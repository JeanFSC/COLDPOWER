import { asc, eq } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getDb } from "../src/db";
import { users } from "../src/db/schema";
import {
  purchaseItems,
  purchaseReceiptItems,
  purchaseReceipts,
  purchaseRequestItems,
  purchaseRequests,
  purchases,
  suppliers,
} from "../src/db/purchases-schema";
import { assertDevDatabaseTarget, assertDevMockSeedAllowed, mockFixtureId } from "../src/lib/dev-mock-fixtures";

// Dev-only fixture for the Compras module — same protection/idempotency pattern as
// seed-notifications-dev.ts (production blocked, --confirm-dev-mock required, deterministic
// mockFixtureId + onConflictDoNothing so reruns never duplicate rows). The DB had zero
// suppliers/purchases/requests before this, so the redesigned KPIs/donut/scorecard/alerts
// would otherwise render an honest-but-empty state. Real product/category/location rows are
// reused from the existing catalog import and the cp-dashboard-v5 fixtures — nothing here
// invents a product, category or inventory balance; the "critical stock in transit" alert
// deliberately references a product+location pair that already has a real critical
// inventoryBalances row (product-cp-ref-bim-0431 @ cp-dashboard-v5-location-lima) so that
// alert is a genuine join, not a fabricated count.
const fixture = "cp-compras-dev";
const day = 24 * 60 * 60 * 1000;
const id = (entity: string, key: string) => mockFixtureId(entity, key);
const daysAgo = (days: number) => new Date(Date.now() - days * day);
const LIMA = "cp-dashboard-v5-location-lima";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertRows(tx: any, table: any, rows: any[]) {
  if (!rows.length) return 0;
  const inserted = await tx.insert(table).values(rows).onConflictDoNothing().returning({ id: table.id });
  return inserted.length;
}

export async function seedPurchasesDevData() {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [actor] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.roleCode, "SUPERADMIN"))
      .orderBy(asc(users.createdAt))
      .limit(1);
    if (!actor) throw new Error("No existe un SUPERADMIN activo para atribuir el fixture de compras.");

    const supplierRows = [
      { id: id(fixture, "supplier-lg"), name: "LG Electronics", country: "KR", currency: "PEN", status: "ACTIVE" as const },
      { id: id(fixture, "supplier-samsung"), name: "Samsung", country: "KR", currency: "PEN", status: "ACTIVE" as const },
      { id: id(fixture, "supplier-mabe"), name: "Mabe", country: "MX", currency: "PEN", status: "ACTIVE" as const },
      { id: id(fixture, "supplier-daikin"), name: "Daikin", country: "JP", currency: "PEN", status: "INACTIVE" as const },
    ];
    const suppliersInserted = await insertRows(tx, suppliers, supplierRows);

    const supplierLg = id(fixture, "supplier-lg");
    const supplierSamsung = id(fixture, "supplier-samsung");
    const supplierMabe = id(fixture, "supplier-mabe");
    const supplierDaikin = id(fixture, "supplier-daikin");

    const products = {
      campanas: { id: "product-cp-cam-fil-0001", sku: "CP-CAM-FIL-0001", name: "FILTRO DE CAMPANA DE ALUMINIO SO-SLM3" },
      lavadoras: { id: "product-cp-lav-fil-0004", sku: "CP-LAV-FIL-0004", name: "FILTRO MABE" },
      herramientas: { id: "product-cp-her-otr-0005", sku: "CP-HER-OTR-0005", name: "MARCADOR LASER PORTATIL" },
      fitness: { id: "product-cp-fit-otr-0313", sku: "CP-FIT-OTR-0313", name: "TONIFICADOR DE GLUTEOS PRO" },
      refrigeracionCritico: { id: "product-cp-ref-bim-0431", sku: "CP-REF-BIM-0431", name: "PRODUCTO REFRIGERACIÓN BIMETÁLICO 0431" },
    };

    const requestRows = [
      { id: id(fixture, "request-1"), code: "SC-DEV-001", requesterId: actor.id, locationId: LIMA, source: "MANUAL" as const, status: "DRAFT" as const, notes: "Reposición de herramientas de taller." },
      { id: id(fixture, "request-2"), code: "SC-DEV-002", requesterId: actor.id, locationId: LIMA, source: "STOCK_ALERT" as const, status: "SUBMITTED" as const, notes: "Alerta automática de stock crítico." },
      { id: id(fixture, "request-3"), code: "SC-DEV-003", requesterId: actor.id, locationId: LIMA, source: "MANUAL" as const, status: "APPROVED" as const, notes: "Reposición de filtros para lavadoras.", approvedBy: actor.id, approvedAt: daysAgo(1) },
    ];
    const requestsInserted = await insertRows(tx, purchaseRequests, requestRows);
    const requestItemRows = [
      { id: id(fixture, "request-item-1"), requestId: id(fixture, "request-1"), productId: products.herramientas.id, skuSnapshot: products.herramientas.sku, productNameSnapshot: products.herramientas.name, quantityRequested: 6 },
      { id: id(fixture, "request-item-2"), requestId: id(fixture, "request-2"), productId: products.refrigeracionCritico.id, skuSnapshot: products.refrigeracionCritico.sku, productNameSnapshot: products.refrigeracionCritico.name, quantityRequested: 20 },
      { id: id(fixture, "request-item-3"), requestId: id(fixture, "request-3"), productId: products.lavadoras.id, skuSnapshot: products.lavadoras.sku, productNameSnapshot: products.lavadoras.name, quantityRequested: 10 },
    ];
    const requestItemsInserted = await insertRows(tx, purchaseRequestItems, requestItemRows);

    const purchaseRows = [
      { id: id(fixture, "purchase-1"), code: "OC-DEV-001", supplierId: supplierLg, locationId: LIMA, status: "DRAFT" as const, currency: "PEN", subtotal: "250.00", createdAt: daysAgo(1), createdBy: actor.id },
      { id: id(fixture, "purchase-2"), code: "OC-DEV-002", supplierId: supplierSamsung, locationId: LIMA, status: "PENDING" as const, currency: "PEN", subtotal: "400.00", issuedAt: daysAgo(3), expectedDeliveryAt: daysAgo(-5), createdAt: daysAgo(3), createdBy: actor.id },
      { id: id(fixture, "purchase-3"), code: "OC-DEV-003", supplierId: supplierDaikin, locationId: LIMA, status: "PENDING" as const, currency: "PEN", subtotal: "900.00", issuedAt: daysAgo(10), expectedDeliveryAt: daysAgo(2), createdAt: daysAgo(10), createdBy: actor.id },
      { id: id(fixture, "purchase-4"), code: "OC-DEV-004", supplierId: supplierLg, locationId: LIMA, status: "PARTIAL_RECEIVED" as const, currency: "PEN", subtotal: "480.00", issuedAt: daysAgo(12), expectedDeliveryAt: daysAgo(5), createdAt: daysAgo(12), createdBy: actor.id },
      { id: id(fixture, "purchase-5"), code: "OC-DEV-005", supplierId: supplierMabe, locationId: LIMA, status: "RECEIVED" as const, currency: "PEN", subtotal: "720.00", issuedAt: daysAgo(18), expectedDeliveryAt: daysAgo(8), createdAt: daysAgo(18), createdBy: actor.id },
      { id: id(fixture, "purchase-6"), code: "OC-DEV-006", supplierId: supplierSamsung, locationId: LIMA, status: "RECEIVED" as const, currency: "PEN", subtotal: "120.00", issuedAt: daysAgo(25), expectedDeliveryAt: daysAgo(20), createdAt: daysAgo(25), createdBy: actor.id },
      { id: id(fixture, "purchase-7"), code: "OC-DEV-007", supplierId: supplierMabe, locationId: LIMA, status: "CANCELLED" as const, currency: "PEN", subtotal: "240.00", createdAt: daysAgo(6), cancelledAt: daysAgo(5), cancelledBy: actor.id, cancellationReason: "Proveedor sin stock disponible.", createdBy: actor.id },
      { id: id(fixture, "purchase-8"), code: "OC-DEV-008", supplierId: supplierLg, locationId: LIMA, status: "PENDING" as const, currency: "PEN", subtotal: "240.00", issuedAt: daysAgo(0), expectedDeliveryAt: daysAgo(-10), createdAt: daysAgo(0), createdBy: actor.id },
    ];
    const purchasesInserted = await insertRows(tx, purchases, purchaseRows);

    const purchaseItemRows = [
      { id: id(fixture, "item-1"), purchaseId: id(fixture, "purchase-1"), productId: products.campanas.id, skuSnapshot: products.campanas.sku, productNameSnapshot: products.campanas.name, quantityOrdered: 10, quantityReceived: 0, unitCost: "25.00", currency: "PEN" },
      { id: id(fixture, "item-2"), purchaseId: id(fixture, "purchase-2"), productId: products.lavadoras.id, skuSnapshot: products.lavadoras.sku, productNameSnapshot: products.lavadoras.name, quantityOrdered: 5, quantityReceived: 0, unitCost: "80.00", currency: "PEN" },
      { id: id(fixture, "item-3"), purchaseId: id(fixture, "purchase-3"), productId: products.refrigeracionCritico.id, skuSnapshot: products.refrigeracionCritico.sku, productNameSnapshot: products.refrigeracionCritico.name, quantityOrdered: 20, quantityReceived: 0, unitCost: "45.00", currency: "PEN" },
      { id: id(fixture, "item-4"), purchaseId: id(fixture, "purchase-4"), productId: products.herramientas.id, skuSnapshot: products.herramientas.sku, productNameSnapshot: products.herramientas.name, quantityOrdered: 8, quantityReceived: 4, unitCost: "60.00", currency: "PEN" },
      { id: id(fixture, "item-5"), purchaseId: id(fixture, "purchase-5"), productId: products.fitness.id, skuSnapshot: products.fitness.sku, productNameSnapshot: products.fitness.name, quantityOrdered: 6, quantityReceived: 6, unitCost: "120.00", currency: "PEN" },
      { id: id(fixture, "item-6"), purchaseId: id(fixture, "purchase-6"), productId: products.campanas.id, skuSnapshot: products.campanas.sku, productNameSnapshot: products.campanas.name, quantityOrdered: 4, quantityReceived: 4, unitCost: "30.00", currency: "PEN" },
      { id: id(fixture, "item-7"), purchaseId: id(fixture, "purchase-7"), productId: products.lavadoras.id, skuSnapshot: products.lavadoras.sku, productNameSnapshot: products.lavadoras.name, quantityOrdered: 3, quantityReceived: 0, unitCost: "80.00", currency: "PEN" },
      { id: id(fixture, "item-8"), purchaseId: id(fixture, "purchase-8"), productId: products.fitness.id, skuSnapshot: products.fitness.sku, productNameSnapshot: products.fitness.name, quantityOrdered: 2, quantityReceived: 0, unitCost: "120.00", currency: "PEN" },
    ];
    const itemsInserted = await insertRows(tx, purchaseItems, purchaseItemRows);

    const receiptRows = [
      { id: id(fixture, "receipt-4"), code: "REC-DEV-001", purchaseId: id(fixture, "purchase-4"), locationId: LIMA, status: "POSTED" as const, receivedBy: actor.id, receivedAt: daysAgo(6) },
      { id: id(fixture, "receipt-5"), code: "REC-DEV-002", purchaseId: id(fixture, "purchase-5"), locationId: LIMA, status: "POSTED" as const, receivedBy: actor.id, receivedAt: daysAgo(9) },
      { id: id(fixture, "receipt-6"), code: "REC-DEV-003", purchaseId: id(fixture, "purchase-6"), locationId: LIMA, status: "POSTED" as const, receivedBy: actor.id, receivedAt: daysAgo(15) },
    ];
    const receiptsInserted = await insertRows(tx, purchaseReceipts, receiptRows);

    const receiptItemRows = [
      { id: id(fixture, "receipt-item-4"), receiptId: id(fixture, "receipt-4"), purchaseItemId: id(fixture, "item-4"), productId: products.herramientas.id, quantity: 4, unitCost: "60.00", currency: "PEN" },
      { id: id(fixture, "receipt-item-5"), receiptId: id(fixture, "receipt-5"), purchaseItemId: id(fixture, "item-5"), productId: products.fitness.id, quantity: 6, unitCost: "120.00", currency: "PEN" },
      { id: id(fixture, "receipt-item-6"), receiptId: id(fixture, "receipt-6"), purchaseItemId: id(fixture, "item-6"), productId: products.campanas.id, quantity: 4, unitCost: "30.00", currency: "PEN" },
    ];
    const receiptItemsInserted = await insertRows(tx, purchaseReceiptItems, receiptItemRows);

    return {
      suppliersInserted,
      requestsInserted,
      requestItemsInserted,
      purchasesInserted,
      itemsInserted,
      receiptsInserted,
      receiptItemsInserted,
    };
  });
}

async function main() {
  assertDevMockSeedAllowed(process.env, process.argv);
  assertDevDatabaseTarget(process.env, process.argv);
  const result = await seedPurchasesDevData();
  console.log("Fixture de compras aplicado:", result);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
