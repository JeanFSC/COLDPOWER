import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  max,
  ne,
  or,
  sql,
  sum,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/db";
import { categories, inventoryBalances, locations, products } from "@/db/schema";
import {
  purchaseItems,
  purchaseReceiptItems,
  purchaseReceipts,
  purchaseRequestItems,
  purchaseRequests,
  purchases,
  suppliers,
  importDocuments,
} from "@/db/purchases-schema";
import type {
  PurchasesFilters,
  PurchaseListItem,
  PurchasesPageResponse,
} from "@/lib/purchases-contract";
const defaultPageSize = 25,
  maxPageSize = 100;
const fillRatePurchaseStatuses = ["PENDING", "PARTIAL_RECEIVED", "RECEIVED"] as const;
function pageValues(page?: number, pageSize?: number) {
  return {
    page: Math.max(1, Math.floor(page ?? 1)),
    pageSize: Math.min(maxPageSize, Math.max(1, Math.floor(pageSize ?? defaultPageSize))),
  };
}
function dayStart(v: string) {
  return new Date(`${v}T00:00:00-05:00`);
}
function dayAfter(v: string) {
  return new Date(dayStart(v).getTime() + 86_400_000);
}
function num(v: unknown) {
  return Number(v ?? 0);
}
function wherePurchases(f: PurchasesFilters) {
  const c: SQL[] = [];
  if (f.query) {
    const p = `%${f.query.trim()}%`;
    c.push(
      or(
        ilike(purchases.code, p),
        ilike(suppliers.name, p),
        sql`exists (select 1 from purchase_items as pi where pi.purchase_id = ${purchases.id} and (pi.sku_snapshot ilike ${p} or pi.product_name_snapshot ilike ${p}))`,
        sql`exists (select 1 from purchase_items as pi join products as pr on pr.id = pi.product_id where pi.purchase_id = ${purchases.id} and (pr.sku ilike ${p} or pr.original_name ilike ${p} or pr.normalized_name ilike ${p} or pr.model_code ilike ${p} or pr.original_reference_code ilike ${p}))`,
        sql`exists (select 1 from import_documents as idoc where idoc.supplier_id = ${purchases.supplierId} and (idoc.commercial_invoice ilike ${p} or idoc.packing_list ilike ${p}))`,
      )!,
    );
  }
  if (f.status) c.push(eq(purchases.status, f.status));
  if (f.supplierId) c.push(eq(purchases.supplierId, f.supplierId));
  if (f.locationId) c.push(eq(purchases.locationId, f.locationId));
  if (f.currency) c.push(eq(purchases.currency, f.currency));
  if (f.createdFrom) c.push(gte(purchases.createdAt, dayStart(f.createdFrom)));
  if (f.createdTo) c.push(lt(purchases.createdAt, dayAfter(f.createdTo)));
  if (f.expectedFrom) c.push(gte(purchases.expectedDeliveryAt, dayStart(f.expectedFrom)));
  if (f.expectedTo) c.push(lt(purchases.expectedDeliveryAt, dayAfter(f.expectedTo)));
  if (f.attention === "PARTIAL") c.push(eq(purchases.status, "PARTIAL_RECEIVED"));
  if (f.attention === "DELAYED")
    c.push(
      and(
        lt(purchases.expectedDeliveryAt, new Date()),
        sql`(${purchases.status} in ('DRAFT','PENDING','PARTIAL_RECEIVED'))`,
      )!,
    );
  if (f.attention === "INCIDENT") c.push(eq(suppliers.status, "INACTIVE"));
  if (f.attention === "NORMAL")
    c.push(
      and(
        ne(purchases.status, "PARTIAL_RECEIVED"),
        eq(suppliers.status, "ACTIVE"),
        or(isNull(purchases.expectedDeliveryAt), gte(purchases.expectedDeliveryAt, new Date()))!,
      )!,
    );
  return c.length ? and(...c) : undefined;
}
export async function getPurchasesPage(
  filters: PurchasesFilters = {},
): Promise<PurchasesPageResponse> {
  const { page, pageSize } = pageValues(filters.page, filters.pageSize);
  const where = wherePurchases(filters);
  const db = getDb();
  const [
    rows,
    totalRows,
    statusRows,
    amountsByCurrency,
    statusFacets,
    currencyFacets,
    supplierFacets,
    receiptDates,
    incidents,
  ] = await Promise.all([
    db
      .select({ purchase: purchases, supplierName: suppliers.name })
      .from(purchases)
      .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(where)
      .orderBy(desc(purchases.updatedAt), asc(purchases.code))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: count(purchases.id) })
      .from(purchases)
      .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(where),
    db
      .select({ status: purchases.status, total: count(purchases.id) })
      .from(purchases)
      .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(where)
      .groupBy(purchases.status),
    db
      .select({ currency: purchases.currency, total: sum(purchases.subtotal) })
      .from(purchases)
      .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(where)
      .groupBy(purchases.currency)
      .orderBy(purchases.currency),
    db
      .selectDistinct({ value: purchases.status })
      .from(purchases)
      .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(where)
      .orderBy(purchases.status),
    db
      .selectDistinct({ value: purchases.currency })
      .from(purchases)
      .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(where)
      .orderBy(purchases.currency),
    db
      .selectDistinct({ id: suppliers.id, name: suppliers.name })
      .from(purchases)
      .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(where)
      .orderBy(suppliers.name),
    db
      .select({
        purchaseId: purchases.id,
        issuedAt: purchases.issuedAt,
        receivedAt: max(purchaseReceipts.receivedAt),
      })
      .from(purchases)
      .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .leftJoin(purchaseReceipts, eq(purchaseReceipts.purchaseId, purchases.id))
      .where(and(where, eq(purchases.status, "RECEIVED")))
      .groupBy(purchases.id, purchases.issuedAt),
    db
      .select({ value: count(purchases.id) })
      .from(purchases)
      .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(and(where, eq(suppliers.status, "INACTIVE"))),
  ]);
  const totalItems = num(totalRows[0]?.total),
    map = new Map(statusRows.map((r) => [r.status, num(r.total)]));
  const items: PurchaseListItem[] = rows.map((r) => ({
    ...r.purchase,
    supplierName: r.supplierName,
  }));
  const leadTimes = receiptDates.flatMap((row) =>
    row.issuedAt && row.receivedAt
      ? [Math.max(0, (row.receivedAt.getTime() - row.issuedAt.getTime()) / 86_400_000)]
      : [],
  );
  return {
    items,
    page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))),
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    metrics: {
      total: totalItems,
      pending: map.get("PENDING") ?? 0,
      partialReceived: map.get("PARTIAL_RECEIVED") ?? 0,
      received: map.get("RECEIVED") ?? 0,
      cancelled: map.get("CANCELLED") ?? 0,
      totalAmount: amountsByCurrency.length === 1 ? num(amountsByCurrency[0]?.total) : 0,
      amountsByCurrency: amountsByCurrency.map((row) => ({
        currency: row.currency,
        amount: num(row.total),
      })),
      leadTimeDays: leadTimes.length
        ? Number((leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length).toFixed(1))
        : null,
      incidents: num(incidents[0]?.value),
    },
    facets: {
      statuses: statusFacets.map((r) => r.value),
      currencies: currencyFacets.map((r) => r.value),
      suppliers: supplierFacets,
    },
  };
}
export async function getPurchaseDetailForReceipt(receiptId: string) {
  const [receipt] = await getDb()
    .select({ purchaseId: purchaseReceipts.purchaseId })
    .from(purchaseReceipts)
    .where(eq(purchaseReceipts.id, receiptId))
    .limit(1);
  return receipt ? getPurchaseDetail(receipt.purchaseId) : null;
}

export async function getPurchaseDetail(purchaseId: string) {
  const db = getDb();
  const [row] = await db
    .select({ purchase: purchases, supplier: suppliers, location: locations })
    .from(purchases)
    .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .innerJoin(locations, eq(purchases.locationId, locations.id))
    .where(eq(purchases.id, purchaseId))
    .limit(1);
  if (!row) return null;
  const items = await db
    .select()
    .from(purchaseItems)
    .where(eq(purchaseItems.purchaseId, purchaseId))
    .orderBy(asc(purchaseItems.createdAt));
  const receipts = await db
    .select({ receipt: purchaseReceipts, item: purchaseReceiptItems })
    .from(purchaseReceipts)
    .leftJoin(purchaseReceiptItems, eq(purchaseReceiptItems.receiptId, purchaseReceipts.id))
    .where(eq(purchaseReceipts.purchaseId, purchaseId))
    .orderBy(desc(purchaseReceipts.createdAt));
  return {
    purchase: row.purchase,
    supplier: row.supplier,
    location: row.location,
    items,
    receipts,
  };
}

export async function getPurchaseReceivingOptions(query = "") {
  const db = getDb();
  const conditions: SQL[] = [inArray(purchases.status, ["PENDING", "PARTIAL_RECEIVED"] as never[])];
  const trimmedQuery = query.trim();
  if (trimmedQuery) {
    const pattern = `%${trimmedQuery}%`;
    conditions.push(
      or(
        ilike(purchases.code, pattern),
        ilike(suppliers.name, pattern),
        sql`exists (select 1 from purchase_items as pi where pi.purchase_id = ${purchases.id} and (pi.sku_snapshot ilike ${pattern} or pi.product_name_snapshot ilike ${pattern}))`,
      )!,
    );
  }
  const purchaseRows = await db
    .select({
      id: purchases.id,
      code: purchases.code,
      currency: purchases.currency,
      supplierName: suppliers.name,
      locationId: purchases.locationId,
      locationName: locations.name,
    })
    .from(purchases)
    .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .innerJoin(locations, eq(purchases.locationId, locations.id))
    .where(and(...conditions))
    .orderBy(desc(purchases.updatedAt), asc(purchases.code))
    .limit(25);
  if (!purchaseRows.length) return [];
  const lineRows = await db
    .select()
    .from(purchaseItems)
    .where(inArray(purchaseItems.purchaseId, purchaseRows.map((row) => row.id)))
    .orderBy(asc(purchaseItems.createdAt));
  const itemsByPurchase = new Map<string, typeof lineRows>();
  for (const line of lineRows) {
    const list = itemsByPurchase.get(line.purchaseId) ?? [];
    list.push(line);
    itemsByPurchase.set(line.purchaseId, list);
  }
  return purchaseRows.map((purchase) => ({
    ...purchase,
    items: (itemsByPurchase.get(purchase.id) ?? [])
      .map((line) => ({
        id: line.id,
        productId: line.productId,
        sku: line.skuSnapshot,
        productName: line.productNameSnapshot,
        quantityOrdered: line.quantityOrdered,
        quantityReceived: line.quantityReceived,
        quantityPending: Math.max(0, line.quantityOrdered - line.quantityReceived),
      }))
      .filter((line) => line.quantityPending > 0),
  })).filter((purchase) => purchase.items.length > 0);
}

export async function getPurchaseRequestsPage(
  options: { status?: string; source?: string; page?: number; pageSize?: number } = {},
) {
  const { page, pageSize } = pageValues(options.page, options.pageSize);
  const conditions: SQL[] = [];
  if (options.status) conditions.push(eq(purchaseRequests.status, options.status as never));
  if (options.source) conditions.push(eq(purchaseRequests.source, options.source as never));
  const where = conditions.length ? and(...conditions) : undefined;
  const db = getDb();
  const [rows, totalRows, statusRows, sourceRows] = await Promise.all([
    db
      .select()
      .from(purchaseRequests)
      .where(where)
      .orderBy(desc(purchaseRequests.updatedAt), asc(purchaseRequests.code))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: count(purchaseRequests.id) })
      .from(purchaseRequests)
      .where(where),
    db
      .select({ status: purchaseRequests.status, total: count(purchaseRequests.id) })
      .from(purchaseRequests)
      .where(where)
      .groupBy(purchaseRequests.status),
    db
      .selectDistinct({ value: purchaseRequests.source })
      .from(purchaseRequests)
      .where(where)
      .orderBy(purchaseRequests.source),
  ]);
  const ids = rows.map((row) => row.id);
  const itemRows = ids.length
    ? await db
        .select({
          requestId: purchaseRequestItems.requestId,
          total: count(purchaseRequestItems.id),
        })
        .from(purchaseRequestItems)
        .where(inArray(purchaseRequestItems.requestId, ids))
        .groupBy(purchaseRequestItems.requestId)
    : [];
  const itemCount = new Map(itemRows.map((row) => [row.requestId, num(row.total)]));
  const totalItems = num(totalRows[0]?.total);
  const statusMap = new Map(statusRows.map((row) => [row.status, num(row.total)]));
  return {
    items: rows.map((row) => ({ ...row, itemCount: itemCount.get(row.id) ?? 0 })),
    page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))),
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    metrics: {
      pending: statusMap.get("SUBMITTED") ?? 0,
      draft: statusMap.get("DRAFT") ?? 0,
      approved: statusMap.get("APPROVED") ?? 0,
      rejected: statusMap.get("REJECTED") ?? 0,
      converted: statusMap.get("CONVERTED") ?? 0,
    },
    facets: {
      statuses: statusRows.map((row) => row.status),
      sources: sourceRows.map((row) => row.value),
    },
  };
}

export async function getPurchaseRequestDetail(requestId: string) {
  const db = getDb();
  const [request] = await db
    .select()
    .from(purchaseRequests)
    .where(eq(purchaseRequests.id, requestId))
    .limit(1);
  if (!request) return null;
  const items = await db
    .select()
    .from(purchaseRequestItems)
    .where(eq(purchaseRequestItems.requestId, requestId))
    .orderBy(asc(purchaseRequestItems.createdAt));
  return { request, items };
}

async function getSupplierPerformance(supplierId: string, status: string) {
  const db = getDb();
  const latestReceipts = db.select({ purchaseId: purchaseReceipts.purchaseId, receivedAt: max(purchaseReceipts.receivedAt).as("last_received_at") }).from(purchaseReceipts).where(eq(purchaseReceipts.status, "POSTED")).groupBy(purchaseReceipts.purchaseId).as("supplier_latest_receipts");
  const [orderMetrics, itemMetrics, openAmounts] = await Promise.all([
    db.select({
      totalOrders: count(purchases.id),
      latestOrderAt: max(purchases.createdAt),
      openOrders: sql<number>`count(*) filter (where ${purchases.status} in ('DRAFT','PENDING','PARTIAL_RECEIVED'))`,
      completedOrders: sql<number>`count(*) filter (where ${purchases.status} = 'RECEIVED')`,
      evaluatedOrders: sql<number>`count(*) filter (where ${purchases.status} = 'RECEIVED' and ${purchases.expectedDeliveryAt} is not null and ${latestReceipts.receivedAt} is not null)`,
      onTimeOrders: sql<number>`count(*) filter (where ${purchases.status} = 'RECEIVED' and ${latestReceipts.receivedAt} <= ${purchases.expectedDeliveryAt})`,
      leadTimeDays: sql<string | null>`avg(extract(epoch from (${latestReceipts.receivedAt} - ${purchases.issuedAt})) / 86400) filter (where ${purchases.status} = 'RECEIVED')`,
    }).from(purchases).leftJoin(latestReceipts, eq(latestReceipts.purchaseId, purchases.id)).where(eq(purchases.supplierId, supplierId)),
    db.select({ ordered: sum(purchaseItems.quantityOrdered), received: sum(purchaseItems.quantityReceived) }).from(purchaseItems).innerJoin(purchases, eq(purchases.id, purchaseItems.purchaseId)).where(and(eq(purchases.supplierId, supplierId), inArray(purchases.status, [...fillRatePurchaseStatuses]))),
    db.select({ currency: purchases.currency, amount: sum(purchases.subtotal) }).from(purchases).where(and(eq(purchases.supplierId, supplierId), inArray(purchases.status, ["DRAFT", "PENDING", "PARTIAL_RECEIVED"]))).groupBy(purchases.currency).orderBy(asc(purchases.currency)),
  ]);
  const orders = orderMetrics[0];
  const ordered = Number(itemMetrics[0]?.ordered ?? 0);
  const received = Number(itemMetrics[0]?.received ?? 0);
  const completedOrders = Number(orders.completedOrders);
  const evaluatedOrders = Number(orders.evaluatedOrders);
  return {
    openOrders: Number(orders.openOrders), completedOrders, evaluatedOrders, totalOrders: Number(orders.totalOrders), latestOrderAt: orders.latestOrderAt,
    openAmounts: openAmounts.map(row => ({ currency: row.currency, amount: row.amount ?? "0.00" })),
    onTimeRate: evaluatedOrders ? Number((Number(orders.onTimeOrders) / evaluatedOrders * 100).toFixed(1)) : null,
    fillRate: ordered ? Number((received / ordered * 100).toFixed(1)) : null,
    leadTimeDays: orders.leadTimeDays === null ? null : Number(Number(orders.leadTimeDays).toFixed(1)),
    incidents: status === "INACTIVE" ? Number(orders.openOrders) : 0,
  };
}

export async function getSupplierDetail(supplierId: string, pages: { receiptsPage?: number; documentsPage?: number; ordersPage?: number; productsPage?: number } = {}) {
  const db = getDb();
  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, supplierId)).limit(1);
  if (!supplier) return null;
  const [[receiptCount], [documentCount], [orderCount], [productCount]] = await Promise.all([
    db.select({ total: count() }).from(purchaseReceipts).innerJoin(purchases, eq(purchases.id, purchaseReceipts.purchaseId)).where(eq(purchases.supplierId, supplierId)),
    db.select({ total: count() }).from(importDocuments).where(eq(importDocuments.supplierId, supplierId)),
    db.select({ total: count() }).from(purchases).where(and(eq(purchases.supplierId, supplierId), inArray(purchases.status, ["DRAFT", "PENDING", "PARTIAL_RECEIVED"]))),
    db.select({ total: sql<number>`count(distinct ${purchaseItems.skuSnapshot})::int` }).from(purchaseItems).innerJoin(purchases, eq(purchases.id, purchaseItems.purchaseId)).where(eq(purchases.supplierId, supplierId)),
  ]);
  const boundedPage = (value: number | undefined, total: number, size: number) => Math.min(Math.max(1, Number.isSafeInteger(value) ? value! : 1), Math.max(1, Math.ceil(total / size)));
  const receiptsPage = boundedPage(pages.receiptsPage, receiptCount.total, 5);
  const documentsPage = boundedPage(pages.documentsPage, documentCount.total, 4);
  const ordersPage = boundedPage(pages.ordersPage, orderCount.total, 20);
  const productsPage = boundedPage(pages.productsPage, productCount.total, 20);
  const [purchaseRows, receiptRows, productRows, documents] = await Promise.all([
    db
      .select({ purchase: purchases, locationName: locations.name })
      .from(purchases)
      .innerJoin(locations, eq(locations.id, purchases.locationId))
      .where(and(eq(purchases.supplierId, supplierId), inArray(purchases.status, ["DRAFT", "PENDING", "PARTIAL_RECEIVED"])))
      .orderBy(desc(purchases.createdAt), desc(purchases.id))
      .limit(20).offset((ordersPage - 1) * 20),
    db
      .select({ receipt: purchaseReceipts, purchaseCode: purchases.code })
      .from(purchaseReceipts)
      .innerJoin(purchases, eq(purchases.id, purchaseReceipts.purchaseId))
      .where(eq(purchases.supplierId, supplierId))
      .orderBy(desc(purchaseReceipts.receivedAt), desc(purchaseReceipts.id))
      .limit(5).offset((receiptsPage - 1) * 5),
    db
      .select({ sku: purchaseItems.skuSnapshot, name: sql<string>`max(${purchaseItems.productNameSnapshot})` })
      .from(purchaseItems)
      .innerJoin(purchases, eq(purchases.id, purchaseItems.purchaseId))
      .where(eq(purchases.supplierId, supplierId))
      .groupBy(purchaseItems.skuSnapshot)
      .orderBy(asc(purchaseItems.skuSnapshot))
      .limit(20).offset((productsPage - 1) * 20),
    db
      .select()
      .from(importDocuments)
      .where(eq(importDocuments.supplierId, supplierId))
      .orderBy(desc(importDocuments.createdAt), desc(importDocuments.id))
      .limit(4).offset((documentsPage - 1) * 4),
  ]);
  const performance = await getSupplierPerformance(supplierId, supplier.status);
  return { supplier, purchases: purchaseRows, receipts: receiptRows, products: productRows, documents, performance, pagination: { orders: { page: ordersPage, pages: Math.max(1, Math.ceil(orderCount.total / 20)), total: orderCount.total }, products: { page: productsPage, pages: Math.max(1, Math.ceil(productCount.total / 20)), total: productCount.total }, receipts: { page: receiptsPage, pages: Math.max(1, Math.ceil(receiptCount.total / 5)), total: receiptCount.total }, documents: { page: documentsPage, pages: Math.max(1, Math.ceil(documentCount.total / 4)), total: documentCount.total } } };
}
export type SupplierDetail = NonNullable<Awaited<ReturnType<typeof getSupplierDetail>>>;

const openPurchaseStatuses = ["DRAFT", "PENDING", "PARTIAL_RECEIVED"] as const;

// Ordered subtotal by product category (unit cost x quantity ordered), used by the "Subtotal por
// categoría" donut instead of a fabricated breakdown.
export async function getCategorySpend(filters: PurchasesFilters = {}) {
  const where = wherePurchases(filters);
  const db = getDb();
  const rows = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      currency: purchases.currency,
      amount: sql<string>`coalesce(sum(${purchaseItems.unitCost} * ${purchaseItems.quantityOrdered}), 0)`,
    })
    .from(purchaseItems)
    .innerJoin(purchases, eq(purchaseItems.purchaseId, purchases.id))
    .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .innerJoin(products, eq(purchaseItems.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(where)
    .groupBy(categories.id, categories.name, purchases.currency)
    .orderBy(desc(sql`sum(${purchaseItems.unitCost} * ${purchaseItems.quantityOrdered})`));
  return rows.map((row) => ({ categoryId: row.categoryId, categoryName: row.categoryName, currency: row.currency, amount: num(row.amount) }));
}

// Ordered subtotal by supplier, used by the supplier subtotal ranking.
export async function getSupplierSpendRanking(filters: PurchasesFilters = {}) {
  const where = wherePurchases(filters);
  const db = getDb();
  const rows = await db
    .select({ supplierId: suppliers.id, supplierName: suppliers.name, currency: purchases.currency, amount: sum(purchases.subtotal) })
    .from(purchases)
    .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .where(where)
    .groupBy(suppliers.id, suppliers.name, purchases.currency)
    .orderBy(desc(sum(purchases.subtotal)));
  return rows.map((row) => ({ supplierId: row.supplierId, supplierName: row.supplierName, currency: row.currency, amount: num(row.amount) }));
}

// System-wide supplier scorecard: same on-time/fill-rate/incidents definitions as
// getSupplierDetail's per-supplier performance block, aggregated across every supplier.
// "Calificación promedio" from the design reference has no backing column anywhere in the
// schema, so it is replaced with a real "proveedores activos" count instead of a fabricated
// star rating.
export async function getSupplierScorecard() {
  const db = getDb();
  const latestReceipt = db
    .select({
      purchaseId: purchaseReceipts.purchaseId,
      receivedAt: max(purchaseReceipts.receivedAt).as("receivedAt"),
    })
    .from(purchaseReceipts)
    .where(eq(purchaseReceipts.status, "POSTED"))
    .groupBy(purchaseReceipts.purchaseId)
    .as("latest_purchase_receipt");
  const [supplierStatusRows, completedRows, itemTotals, incidentRows] = await Promise.all([
    db.select({ status: suppliers.status, total: count(suppliers.id) }).from(suppliers).groupBy(suppliers.status),
    db
      .select({
        completed: count(purchases.id),
        evaluated: sql<string>`count(*) filter (where ${purchases.expectedDeliveryAt} is not null and ${latestReceipt.receivedAt} is not null)`,
        onTime: sql<string>`count(*) filter (where ${purchases.expectedDeliveryAt} is not null and ${latestReceipt.receivedAt} is not null and ${latestReceipt.receivedAt} <= ${purchases.expectedDeliveryAt})`,
      })
      .from(purchases)
      .leftJoin(latestReceipt, eq(latestReceipt.purchaseId, purchases.id))
      .where(eq(purchases.status, "RECEIVED")),
    db.select({ ordered: sum(purchaseItems.quantityOrdered), received: sum(purchaseItems.quantityReceived) }).from(purchaseItems).innerJoin(purchases, eq(purchases.id, purchaseItems.purchaseId)).where(inArray(purchases.status, [...fillRatePurchaseStatuses])),
    db
      .select({ total: count(purchases.id) })
      .from(purchases)
      .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(and(eq(suppliers.status, "INACTIVE"), inArray(purchases.status, [...openPurchaseStatuses]))),
  ]);
  const ordered = num(itemTotals[0]?.ordered);
  const received = num(itemTotals[0]?.received);
  const evaluated = num(completedRows[0]?.evaluated);
  const onTime = num(completedRows[0]?.onTime);
  const statusMap = new Map(supplierStatusRows.map((row) => [row.status, num(row.total)]));
  const totalSuppliers = supplierStatusRows.reduce((sum, row) => sum + num(row.total), 0);
  return {
    onTimeRate: evaluated ? Number(((onTime / evaluated) * 100).toFixed(1)) : null,
    evaluatedOrders: evaluated,
    completedOrders: num(completedRows[0]?.completed),
    fillRate: ordered ? Number(((received / ordered) * 100).toFixed(1)) : null,
    incidents: num(incidentRows[0]?.total),
    activeSuppliers: statusMap.get("ACTIVE") ?? 0,
    totalSuppliers,
  };
}

// Real, non-fabricated alert counters: delayed open orders, suppliers flagged inactive with
// open orders, products already below their configured minimum stock while still in transit
// on an open purchase, and purchase requests awaiting approval.
export async function getPurchaseAlerts() {
  const db = getDb();
  const now = new Date();
  const [delayedRows, criticalRows, pendingRequestRows, incidentRows] = await Promise.all([
    db.select({ total: count(purchases.id) }).from(purchases).where(and(lt(purchases.expectedDeliveryAt, now), inArray(purchases.status, [...openPurchaseStatuses]))),
    db
      .selectDistinct({ productId: purchaseItems.productId })
      .from(purchaseItems)
      .innerJoin(purchases, eq(purchaseItems.purchaseId, purchases.id))
      .innerJoin(inventoryBalances, and(eq(inventoryBalances.productId, purchaseItems.productId), eq(inventoryBalances.locationId, purchases.locationId))!)
      .where(
        and(
          inArray(purchases.status, [...openPurchaseStatuses]),
          sql`${inventoryBalances.minimumStock} is not null and (${inventoryBalances.onHand} - ${inventoryBalances.reserved}) <= ${inventoryBalances.minimumStock}`,
        ),
      ),
    db.select({ total: count(purchaseRequests.id) }).from(purchaseRequests).where(eq(purchaseRequests.status, "SUBMITTED")),
    db
      .select({ total: count(purchases.id) })
      .from(purchases)
      .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(and(eq(suppliers.status, "INACTIVE"), inArray(purchases.status, [...openPurchaseStatuses]))),
  ]);
  return {
    delayed: num(delayedRows[0]?.total),
    supplierIncidents: num(incidentRows[0]?.total),
    criticalInTransit: criticalRows.length,
    pendingRequests: num(pendingRequestRows[0]?.total),
  };
}

const trendDays = 14;
function limaDayKey(date: Date) {
  return new Date(date.getTime() - 5 * 3_600_000).toISOString().slice(0, 10);
}
function fillTrend(rows: Array<{ date: string; total: string | number | null }>, keys: string[]) {
  const map = new Map(rows.map((row) => [row.date, num(row.total)]));
  return keys.map((key) => map.get(key) ?? 0);
}

// Day-bucketed real series (Lima calendar days) for the purchases KPI sparklines — same
// pattern as payments-repository.ts's getPaymentsKpiSeries, so these cards show a real
// trend instead of a fabricated one.
export async function getPurchasesKpiSeries(filters: PurchasesFilters = {}) {
  const db = getDb();
  const to = new Date();
  // +1 day of headroom on the SQL lower bound so "today" (partial day at query time) is never
  // excluded; the display keys below independently cover the last `trendDays` calendar days
  // ending today, so any row older than that simply won't match a key and is dropped as before.
  const from = new Date(to.getTime() - (trendDays + 1) * 86_400_000);
  const keys = Array.from({ length: trendDays }, (_, index) => limaDayKey(new Date(to.getTime() - (trendDays - 1 - index) * 86_400_000)));
  const where = wherePurchases(filters);
  const bucketCreated = sql<string>`to_char((${purchases.createdAt} - interval '5 hours'), 'YYYY-MM-DD')`;
  const bucketRequested = sql<string>`to_char((${purchaseRequests.createdAt} - interval '5 hours'), 'YYYY-MM-DD')`;
  const [openRows, spendRows, incidentRows, receptionRows, requestRows] = await Promise.all([
    db.select({ date: bucketCreated, total: count(purchases.id) }).from(purchases).innerJoin(suppliers, eq(purchases.supplierId, suppliers.id)).where(and(where, gte(purchases.createdAt, from), lt(purchases.createdAt, to), inArray(purchases.status, [...openPurchaseStatuses]))).groupBy(sql`1`).orderBy(sql`1`),
    db.select({ date: bucketCreated, currency: purchases.currency, total: sum(purchases.subtotal) }).from(purchases).innerJoin(suppliers, eq(purchases.supplierId, suppliers.id)).where(and(where, gte(purchases.createdAt, from), lt(purchases.createdAt, to))).groupBy(sql`1`, purchases.currency).orderBy(sql`1`),
    db.select({ date: bucketCreated, total: count(purchases.id) }).from(purchases).innerJoin(suppliers, eq(purchases.supplierId, suppliers.id)).where(and(where, gte(purchases.createdAt, from), lt(purchases.createdAt, to), eq(suppliers.status, "INACTIVE"))).groupBy(sql`1`).orderBy(sql`1`),
    db.select({ date: bucketCreated, total: count(purchases.id) }).from(purchases).innerJoin(suppliers, eq(purchases.supplierId, suppliers.id)).where(and(where, gte(purchases.createdAt, from), lt(purchases.createdAt, to), inArray(purchases.status, ["PENDING", "PARTIAL_RECEIVED"]))).groupBy(sql`1`).orderBy(sql`1`),
    db.select({ date: bucketRequested, total: count(purchaseRequests.id) }).from(purchaseRequests).where(and(gte(purchaseRequests.createdAt, from), lt(purchaseRequests.createdAt, to), eq(purchaseRequests.status, "SUBMITTED"))).groupBy(sql`1`).orderBy(sql`1`),
  ]);
  const spendCurrencies = [...new Set(spendRows.map((row) => row.currency))];
  return {
    openPurchases: fillTrend(openRows, keys),
    spend: spendCurrencies.length <= 1 ? fillTrend(spendRows, keys) : null,
    incidentPurchases: fillTrend(incidentRows, keys),
    receptions: fillTrend(receptionRows, keys),
    requests: fillTrend(requestRows, keys),
  };
}
