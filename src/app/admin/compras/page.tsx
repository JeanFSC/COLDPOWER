import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getDb } from "@/db";
import { locations } from "@/db/schema";
import { listSuppliers } from "@/lib/purchases-service";
import {
  getCategorySpend,
  getPurchaseAlerts,
  getPurchaseDetail,
  getPurchaseRequestDetail,
  getPurchaseRequestsPage,
  getPurchasesKpiSeries,
  getPurchasesPage,
  getSupplierScorecard,
  getSupplierSpendRanking,
} from "@/lib/purchases-repository";
import { PurchasesInvalidFilterError, parsePurchasesFilters, type PurchasesFilters } from "@/lib/purchases-contract";
import { getInventoryProductOptions } from "@/lib/inventory-admin-service";
import { PurchasesOperations } from "@/components/admin/PurchasesOperations";
import { AdminPurchasesModule } from "@/components/admin/AdminPurchasesModule";

export const metadata: Metadata = {
  title: "Compras | Panel admin ColdPower",
  description: "Proveedores, órdenes de compra y recepciones de ColdPower.",
};
export default async function AdminComprasPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePermission("purchases.view");
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }
  const db = getDb();
  let purchaseFilters: PurchasesFilters;
  let filterNotice: string | undefined;
  try {
    purchaseFilters = parsePurchasesFilters(query);
  } catch (error) {
    if (!(error instanceof PurchasesInvalidFilterError)) throw error;
    purchaseFilters = parsePurchasesFilters(new URLSearchParams());
    filterNotice = "Algunos filtros de compras no eran válidos y se restablecieron a una vista segura.";
  }
  const requestPageValue = Number(query.get("requestPage") ?? "1");
  const requestPageNumber = Number.isInteger(requestPageValue) && requestPageValue > 0 ? requestPageValue : 1;
  const [
    suppliers,
    activeLocations,
    purchasePage,
    requestPageData,
    selectedRequest,
    selectedPurchase,
    categorySpend,
    supplierRanking,
    scorecard,
    alerts,
    series,
  ] = await Promise.all([
    listSuppliers(),
    db
      .select({ id: locations.id, name: locations.name })
      .from(locations)
      .where(eq(locations.active, true))
      .orderBy(asc(locations.name)),
    getPurchasesPage(purchaseFilters),
    getPurchaseRequestsPage({
      status: query.get("requestStatus") ?? undefined,
      page: requestPageNumber,
      pageSize: 5,
    }),
    query.get("requestId") ? getPurchaseRequestDetail(query.get("requestId")!) : Promise.resolve(null),
    query.get("purchaseId") ? getPurchaseDetail(query.get("purchaseId")!) : Promise.resolve(null),
    getCategorySpend(purchaseFilters),
    getSupplierSpendRanking(purchaseFilters),
    getSupplierScorecard(),
    getPurchaseAlerts(),
    getPurchasesKpiSeries(purchaseFilters),
  ]);
  const requestProductId = query.get("requestProductId") ?? undefined;
  const requestLocationId = query.get("requestLocationId") ?? undefined;
  const orderSupplierId = query.get("orderSupplierId") ?? undefined;
  const orderLocationId = query.get("orderLocationId") ?? undefined;
  const prefilledProducts = requestProductId
    ? await getInventoryProductOptions("", requestLocationId, requestProductId)
    : [];
  const supplierOptions = suppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    currency: supplier.currency,
    status: supplier.status,
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
          productId: item.productId,
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
          purchaseId: receipt.purchaseId,
          receivedAt: receipt.receivedAt,
          status: receipt.status,
        })),
      }
    : null;
  return (
    <AdminPurchasesModule
      suppliers={supplierOptions}
      locations={activeLocations}
      purchasePage={purchasePage}
      requestPage={requestPageData}
      categorySpend={categorySpend}
      supplierRanking={supplierRanking}
      scorecard={scorecard}
      alerts={alerts}
      series={series}
      selectedRequest={selectedRequest}
      selectedPurchase={purchaseDetail}
      filters={purchaseFilters}
      filterNotice={filterNotice}
      queryString={query.toString()}
      canManage={can(actor.role, "purchases.manage")}
      canReceive={can(actor.role, "purchases.receive")}
      canApprove={can(actor.role, "purchases.approve")}
      canViewCosts={can(actor.role, "purchases.cost.view")}
      controls={
        <PurchasesOperations
          suppliers={supplierOptions}
          locations={activeLocations}
          products={prefilledProducts}
          purchases={purchasePage.items}
          canManage={can(actor.role, "purchases.manage")}
          canReceive={can(actor.role, "purchases.receive")}
          initialRequestProductId={requestProductId}
          initialRequestLocationId={requestLocationId}
          initialOrderSupplierId={orderSupplierId}
          initialOrderLocationId={orderLocationId}
        />
      }
    />
  );
}
