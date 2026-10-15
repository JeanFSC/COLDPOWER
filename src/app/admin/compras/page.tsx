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
  getPurchaseDetailForReceipt,
  getPurchaseRequestDetail,
  getPurchaseRequestsPage,
  getPurchasesKpiSeries,
  getPurchasesPage,
  getSupplierScorecard,
  getSupplierSpendRanking,
} from "@/lib/purchases-repository";
import { resolvePurchasesPageFilters } from "@/lib/purchases-page-filters";
import { getInventoryProductOptions } from "@/lib/inventory-admin-service";
import { PurchasesOperations } from "@/components/admin/PurchasesOperations";
import { AdminPurchasesModule } from "@/components/admin/AdminPurchasesModule";
import { purchaseReceiptViews } from "@/lib/purchase-receipt-view";
import { InventoryCatalogAccess } from "@/components/admin/InventoryCatalogLink";

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
  const canViewCosts = can(actor.role, "purchases.cost.view");
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }
  const db = getDb();
  const resolved = resolvePurchasesPageFilters(query);
  const purchaseFilters = resolved.filters;
  let filterNotice = resolved.filterNotice;
  const requestPageValue = Number(query.get("requestPage") ?? "1");
  const requestPageNumber = Number.isInteger(requestPageValue) && requestPageValue > 0 ? requestPageValue : 1;
  const [
    suppliers,
    activeLocations,
    purchasePageData,
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
    query.get("receiptId") ? getPurchaseDetailForReceipt(query.get("receiptId")!) : query.get("purchaseId") ? getPurchaseDetail(query.get("purchaseId")!) : Promise.resolve(null),
    canViewCosts ? getCategorySpend(purchaseFilters) : Promise.resolve([]),
    canViewCosts ? getSupplierSpendRanking(purchaseFilters) : Promise.resolve([]),
    getSupplierScorecard(),
    getPurchaseAlerts(),
    getPurchasesKpiSeries(purchaseFilters),
  ]);
  const purchasePage = canViewCosts ? purchasePageData : {
    ...purchasePageData,
    items: purchasePageData.items.map((purchase) => ({ ...purchase, subtotal: "" })),
    metrics: { ...purchasePageData.metrics, totalAmount: 0, amountsByCurrency: [] },
  };
  const safeSeries = canViewCosts ? series : { ...series, spend: null };
  if (query.get("receiptId") && !selectedPurchase) {
    filterNotice = [filterNotice, "No se encontró la recepción solicitada. Revisa el código y vuelve a seleccionar una recepción."].filter(Boolean).join(" ");
  }
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
          subtotal: canViewCosts ? selectedPurchase.purchase.subtotal : "",
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
          unitCost: canViewCosts ? item.unitCost : "",
          currency: item.currency,
        })),
        receipts: purchaseReceiptViews(selectedPurchase.receipts, selectedPurchase.items),
      }
    : null;
  return (
    <InventoryCatalogAccess canOpen={can(actor.role, "catalog.product.edit")}>
    <AdminPurchasesModule
      suppliers={supplierOptions}
      locations={activeLocations}
      purchasePage={purchasePage}
      requestPage={requestPageData}
      categorySpend={categorySpend}
      supplierRanking={supplierRanking}
      scorecard={scorecard}
      alerts={alerts}
      series={safeSeries}
      selectedRequest={selectedRequest}
      selectedPurchase={purchaseDetail}
      selectedReceiptId={query.get("receiptId") ?? undefined}
      filters={purchaseFilters}
      filterNotice={filterNotice}
      queryString={resolved.queryString}
      exportHref={resolved.exportHref}
      canManage={can(actor.role, "purchases.manage")}
      canReceive={can(actor.role, "purchases.receive")}
      canApprove={can(actor.role, "purchases.approve")}
      canViewCosts={canViewCosts}
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
    </InventoryCatalogAccess>
  );
}
