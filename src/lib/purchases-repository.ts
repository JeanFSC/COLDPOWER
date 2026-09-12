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
import { locations } from "@/db/schema";
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
    amountRow,
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
      .select({ total: sum(purchases.subtotal) })
      .from(purchases)
      .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(where),
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
      totalAmount: num(amountRow[0]?.total),
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
      pending: (statusMap.get("SUBMITTED") ?? 0) + (statusMap.get("APPROVED") ?? 0),
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

export async function getSupplierDetail(supplierId: string) {
  const db = getDb();
  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, supplierId)).limit(1);
  if (!supplier) return null;
  const [purchaseRows, receiptRows, productRows, documents] = await Promise.all([
    db
      .select({ purchase: purchases, locationName: locations.name })
      .from(purchases)
      .innerJoin(locations, eq(locations.id, purchases.locationId))
      .where(eq(purchases.supplierId, supplierId))
      .orderBy(desc(purchases.createdAt))
      .limit(200),
    db
      .select({ receipt: purchaseReceipts, purchaseCode: purchases.code })
      .from(purchaseReceipts)
      .innerJoin(purchases, eq(purchases.id, purchaseReceipts.purchaseId))
      .where(eq(purchases.supplierId, supplierId))
      .orderBy(desc(purchaseReceipts.receivedAt))
      .limit(200),
    db
      .selectDistinct({ sku: purchaseItems.skuSnapshot, name: purchaseItems.productNameSnapshot })
      .from(purchaseItems)
      .innerJoin(purchases, eq(purchases.id, purchaseItems.purchaseId))
      .where(eq(purchases.supplierId, supplierId))
      .orderBy(asc(purchaseItems.skuSnapshot))
      .limit(200),
    db
      .select()
      .from(importDocuments)
      .where(eq(importDocuments.supplierId, supplierId))
      .orderBy(desc(importDocuments.createdAt))
      .limit(100),
  ]);
  const purchaseItemsByPurchase = new Map<string, { ordered: number; received: number }>();
  const itemRows = purchaseRows.length
    ? await db
        .select({
          purchaseId: purchaseItems.purchaseId,
          ordered: sum(purchaseItems.quantityOrdered),
          received: sum(purchaseItems.quantityReceived),
        })
        .from(purchaseItems)
        .where(
          inArray(
            purchaseItems.purchaseId,
            purchaseRows.map(({ purchase }) => purchase.id),
          ),
        )
        .groupBy(purchaseItems.purchaseId)
    : [];
  for (const row of itemRows)
    purchaseItemsByPurchase.set(row.purchaseId, {
      ordered: Number(row.ordered ?? 0),
      received: Number(row.received ?? 0),
    });
  const receiptsByPurchase = new Map<string, Date>();
  for (const row of receiptRows) {
    const date = row.receipt.receivedAt;
    const current = receiptsByPurchase.get(row.receipt.purchaseId);
    if (!current || date > current) receiptsByPurchase.set(row.receipt.purchaseId, date);
  }
  const completed = purchaseRows.filter(({ purchase }) => purchase.status === "RECEIVED");
  const onTime = completed.filter(({ purchase }) => {
    const expected = purchase.expectedDeliveryAt;
    const receivedAt = receiptsByPurchase.get(purchase.id);
    return Boolean(expected && receivedAt && receivedAt <= expected);
  });
  const leadTimes = completed.flatMap(({ purchase }) => {
    const receivedAt = receiptsByPurchase.get(purchase.id);
    return purchase.issuedAt && receivedAt
      ? [(receivedAt.getTime() - purchase.issuedAt.getTime()) / 86_400_000]
      : [];
  });
  const ordered = [...purchaseItemsByPurchase.values()].reduce(
    (total, value) => total + value.ordered,
    0,
  );
  const received = [...purchaseItemsByPurchase.values()].reduce(
    (total, value) => total + value.received,
    0,
  );
  return {
    supplier,
    purchases: purchaseRows,
    receipts: receiptRows,
    products: productRows,
    documents,
    performance: {
      openOrders: purchaseRows.filter(({ purchase }) =>
        ["DRAFT", "PENDING", "PARTIAL_RECEIVED"].includes(purchase.status),
      ).length,
      onTimeRate: completed.length
        ? Number(((onTime.length / completed.length) * 100).toFixed(1))
        : null,
      fillRate: ordered ? Number(((received / ordered) * 100).toFixed(1)) : null,
      leadTimeDays: leadTimes.length
        ? Number((leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length).toFixed(1))
        : null,
      incidents: purchaseRows.filter(
        ({ purchase }) =>
          supplier.status === "INACTIVE" &&
          ["DRAFT", "PENDING", "PARTIAL_RECEIVED"].includes(purchase.status),
      ).length,
    },
  };
}
