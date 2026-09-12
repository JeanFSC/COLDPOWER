import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";
import { getDb } from "@/db";
import { locations } from "@/db/schema";
import { listSuppliers } from "@/lib/purchases-service";
import {
  getPurchaseDetail,
  getPurchaseRequestDetail,
  getPurchaseRequestsPage,
  getPurchasesPage,
} from "@/lib/purchases-repository";
import { parsePurchasesFilters } from "@/lib/purchases-contract";
import { PurchasesOperations } from "@/components/admin/PurchasesOperations";
import { Tanda2Purchases } from "@/components/admin/AdminTanda2Workspaces";

export const metadata: Metadata = {
  title: "Compras | Panel admin ColdPower",
  description: "Proveedores, órdenes de compra y recepciones de ColdPower.",
};
export default async function AdminComprasPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("purchases.view");
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }
  const db = getDb();
  const purchaseFilters = parsePurchasesFilters(query);
  const [suppliers, activeLocations, purchasePage, requestPage, selectedRequest, selectedPurchase] =
    await Promise.all([
      listSuppliers(),
      db
        .select({ id: locations.id, name: locations.name })
        .from(locations)
        .where(eq(locations.active, true))
        .orderBy(asc(locations.name)),
      getPurchasesPage(purchaseFilters),
      getPurchaseRequestsPage({
        status: query.get("requestStatus") ?? undefined,
        page: 1,
        pageSize: 25,
      }),
      query.get("requestId")
        ? getPurchaseRequestDetail(query.get("requestId")!)
        : Promise.resolve(null),
      query.get("purchaseId") ? getPurchaseDetail(query.get("purchaseId")!) : Promise.resolve(null),
    ]);
  const supplierOptions = suppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    currency: supplier.currency,
    status: supplier.status,
  }));
  const purchaseRows = purchasePage.items.map((purchase) => ({
    id: purchase.id,
    code: purchase.code,
    supplierId: purchase.supplierId,
    locationId: purchase.locationId,
    status: purchase.status,
    currency: purchase.currency,
    subtotal: purchase.subtotal,
    createdAt: purchase.createdAt,
    issuedAt: purchase.issuedAt,
    expectedDeliveryAt: purchase.expectedDeliveryAt,
  }));
  const purchaseDetail = selectedPurchase
    ? {
        purchase: {
          id: selectedPurchase.purchase.id,
          code: selectedPurchase.purchase.code,
          status: selectedPurchase.purchase.status,
          currency: selectedPurchase.purchase.currency,
          subtotal: selectedPurchase.purchase.subtotal,
          createdAt: selectedPurchase.purchase.createdAt,
          issuedAt: selectedPurchase.purchase.issuedAt,
          expectedDeliveryAt: selectedPurchase.purchase.expectedDeliveryAt,
          cancellationReason: selectedPurchase.purchase.cancellationReason,
          notes: selectedPurchase.purchase.notes,
        },
        supplierName: selectedPurchase.supplier.name,
        locationName: selectedPurchase.location.name,
        items: selectedPurchase.items.map((item) => ({
          id: item.id,
          skuSnapshot: item.skuSnapshot,
          productNameSnapshot: item.productNameSnapshot,
          quantityOrdered: item.quantityOrdered,
          quantityReceived: item.quantityReceived,
          unitCost: item.unitCost,
          currency: item.currency,
        })),
        receipts: selectedPurchase.receipts.map(({ receipt }) => ({
          id: receipt.id,
          code: receipt.code,
          receivedAt: receipt.receivedAt,
          status: receipt.status,
        })),
      }
    : null;
  return (
    <Tanda2Purchases
      suppliers={supplierOptions}
      locations={activeLocations}
      purchases={purchaseRows}
      metrics={purchasePage.metrics}
      requests={requestPage.items.map((request) => ({
        id: request.id,
        code: request.code,
        status: request.status,
        source: request.source,
        itemCount: request.itemCount,
        locationId: request.locationId ?? "",
      }))}
      requestMetrics={requestPage.metrics}
      selectedRequest={selectedRequest}
      selectedPurchase={purchaseDetail}
      filters={purchaseFilters}
      pagination={{
        page: purchasePage.page,
        totalPages: purchasePage.totalPages,
        totalItems: purchasePage.totalItems,
      }}
      queryString={query.toString()}
      controls={
        <PurchasesOperations
          suppliers={supplierOptions}
          locations={activeLocations}
          products={[]}
          purchases={purchaseRows}
        />
      }
    />
  );
}
