import { alias } from "drizzle-orm/pg-core";
import { and, asc, count, desc, eq, exists, gte, gt, ilike, inArray, isNotNull, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { quoteDiscountApprovals, quoteItems, quoteStatusHistory, quoteVersionItems, quoteVersions, quotes, users } from "@/db/schema";
import { crmActivities, crmTasks, customerQuoteLinks, customers, opportunities, opportunityFollowups, opportunityStageHistory } from "@/db/crm-schema";
import { orders, payments, sales } from "@/db/sales-schema";
import { effectiveQuoteStatus, quoteWorkflowStatuses, type QuoteWorkflowStatus } from "@/lib/quote-workflow";
import type { QuoteFilters, QuoteListItem, QuotePageResponse } from "@/lib/quote-contract";

const defaultPageSize = 25;
const maxPageSize = 100;
const seller = alias(users, "quote_seller");

function pageValues(page?: number, pageSize?: number) {
  return { page: Math.max(1, Math.floor(page ?? 1)), pageSize: Math.min(maxPageSize, Math.max(1, Math.floor(pageSize ?? defaultPageSize))) };
}
function dayStart(value: string) { return new Date(`${value}T00:00:00-05:00`); }
function dayAfter(value: string) { return new Date(dayStart(value).getTime() + 86_400_000); }
function numberValue(value: unknown) { return Number(value ?? 0); }
function displayStatus(status: string, workflowStatus: string | null | undefined, validUntil: Date | null | undefined) { return effectiveQuoteStatus(status, workflowStatus, validUntil); }
const legacyStatusesByWorkflow: Partial<Record<QuoteWorkflowStatus, readonly (typeof quotes.status.enumValues)[number][]>> = { DRAFT: ["borrador"], SENT: ["enviada", "nuevo", "contactado"], FOLLOW_UP: ["evaluacion", "requiere_info", "cotizada"], ACCEPTED: ["aprobada"], CONVERTED: ["convertida"] };

function quoteWhere(filters: QuoteFilters, now = new Date()) {
  const conditions: SQL[] = [];
  if (filters.query) {
    const pattern = `%${filters.query.trim()}%`;
    const itemMatch = exists(getDb().select({ id: quoteItems.id }).from(quoteItems).where(and(eq(quoteItems.quoteId, quotes.id), or(ilike(quoteItems.skuSnapshot, pattern), ilike(quoteItems.productNameSnapshot, pattern)))));
    conditions.push(or(ilike(quotes.trackingCode, pattern), ilike(quotes.name, pattern), ilike(quotes.email, pattern), ilike(quotes.phone, pattern), ilike(quotes.documentNumber, pattern), ilike(quotes.productName, pattern), ilike(quotes.sku, pattern), ilike(customers.name, pattern), ilike(customers.email, pattern), ilike(customers.phone, pattern), ilike(customers.documentNumber, pattern), ilike(customers.ruc, pattern), itemMatch)!);
  }
  if (filters.open) conditions.push(or(eq(quotes.workflowStatus, "DRAFT"), eq(quotes.status, "borrador"), eq(quotes.workflowStatus, "ACCEPTED"), eq(quotes.status, "aprobada"), and(or(inArray(quotes.workflowStatus, ["SENT", "FOLLOW_UP"]), inArray(quotes.status, ["enviada", "nuevo", "contactado", "evaluacion", "requiere_info", "cotizada"])), or(isNull(quotes.validUntil), gte(quotes.validUntil, now))))!);
  if (filters.workflowStatus) {
    if (filters.workflowStatus === "EXPIRED") conditions.push(and(lt(quotes.validUntil, now), or(inArray(quotes.workflowStatus, ["SENT", "FOLLOW_UP"]), inArray(quotes.status, ["enviada", "nuevo", "contactado", "evaluacion", "requiere_info", "cotizada"])))!);
    else conditions.push(or(eq(quotes.workflowStatus, filters.workflowStatus), legacyStatusesByWorkflow[filters.workflowStatus]?.length ? inArray(quotes.status, legacyStatusesByWorkflow[filters.workflowStatus]!) : undefined)!);
  }
  if (filters.legacyStatus) conditions.push(eq(quotes.status, filters.legacyStatus as (typeof quotes.status.enumValues)[number]));
  if (filters.customerType) conditions.push(eq(quotes.customerType, filters.customerType));
  if (filters.customerId) conditions.push(eq(customerQuoteLinks.customerId, filters.customerId));
  if (filters.assignedSellerId) conditions.push(or(eq(opportunities.assignedSellerId, filters.assignedSellerId), eq(quotes.assignedSellerId, filters.assignedSellerId))!);
  if (filters.currency) conditions.push(eq(quotes.currency, filters.currency));
  if (filters.createdFrom) conditions.push(gte(quotes.createdAt, dayStart(filters.createdFrom)));
  if (filters.createdTo) conditions.push(lt(quotes.createdAt, dayAfter(filters.createdTo)));
  if (filters.sentFrom) conditions.push(gte(quotes.sentAt, dayStart(filters.sentFrom)));
  if (filters.sentTo) conditions.push(lt(quotes.sentAt, dayAfter(filters.sentTo)));
  if (filters.validity === "expired") conditions.push(lt(quotes.validUntil, now));
  if (filters.validity === "today") conditions.push(gte(quotes.validUntil, now), lt(quotes.validUntil, new Date(now.getTime() + 86_400_000)));
  if (filters.validity === "3d") conditions.push(gte(quotes.validUntil, now), lt(quotes.validUntil, new Date(now.getTime() + 3 * 86_400_000)));
  if (filters.validity === "7d") conditions.push(gte(quotes.validUntil, now), lt(quotes.validUntil, new Date(now.getTime() + 7 * 86_400_000)));
  if (filters.followUp === "with") conditions.push(or(isNotNull(opportunities.followUpAt), exists(getDb().select({ id: crmTasks.id }).from(crmTasks).where(and(eq(crmTasks.quoteId, quotes.id), eq(crmTasks.status, "PENDING"))))!)!);
  if (filters.followUp === "without") conditions.push(and(isNull(opportunities.followUpAt), sql`not exists (select 1 from crm_tasks where crm_tasks.quote_id = ${quotes.id} and crm_tasks.status = 'PENDING')`)!);
  if (filters.discount === "with") conditions.push(gt(quotes.discountAmount, "0"));
  if (filters.discount === "without") conditions.push(or(isNull(quotes.discountAmount), eq(quotes.discountAmount, "0"))!);
  if (filters.discount === "pending") conditions.push(eq(quotes.discountApprovalStatus, "PENDING"));
  return conditions.length ? and(...conditions) : undefined;
}

function orderByFor(filters: QuoteFilters) {
  const column = filters.sort === "trackingCode" ? quotes.trackingCode : filters.sort === "customer" ? customers.name : filters.sort === "status" ? quotes.workflowStatus : filters.sort === "validUntil" ? quotes.validUntil : filters.sort === "total" ? quotes.total : filters.sort === "createdAt" ? quotes.createdAt : quotes.updatedAt;
  return filters.direction === "asc" ? asc(column) : desc(column);
}

function quoteItemPreviewMap(rows: Array<{ quoteId: string; sku: string; name: string; quantity: number }>) {
  const grouped = new Map<string, Array<{ name: string; sku: string; quantity: number }>>();
  for (const row of rows) grouped.set(row.quoteId, [...(grouped.get(row.quoteId) ?? []), { name: row.name, sku: row.sku, quantity: row.quantity }]);
  return grouped;
}

function metricsFromStatusCounts(statusCounts: Map<string, number>) {
  const open = ["DRAFT", "SENT", "FOLLOW_UP", "ACCEPTED"].reduce((sum, status) => sum + (statusCounts.get(status) ?? 0), 0);
  const draft = statusCounts.get("DRAFT") ?? 0;
  const sent = statusCounts.get("SENT") ?? 0;
  const followUp = statusCounts.get("FOLLOW_UP") ?? 0;
  const accepted = statusCounts.get("ACCEPTED") ?? 0;
  const converted = statusCounts.get("CONVERTED") ?? 0;
  const rejected = statusCounts.get("REJECTED") ?? 0;
  const expired = statusCounts.get("EXPIRED") ?? 0;
  const cancelled = statusCounts.get("CANCELLED") ?? 0;
  const denominator = converted + rejected + expired;
  return { open, draft, sent, followUp, accepted, converted, rejected, expired, cancelled, conversionRate: denominator ? Number(((converted / denominator) * 100).toFixed(2)) : null };
}

export async function getQuotesPage(filters: QuoteFilters = {}): Promise<QuotePageResponse> {
  const { page, pageSize } = pageValues(filters.page, filters.pageSize);
  const db = getDb();
  const where = quoteWhere(filters);
  const [rows, totalRows, typeRows, currencyRows, sellerRows, summaryStatusRows] = await Promise.all([
    db.select({ quote: quotes, customer: customers, opportunity: opportunities, seller }).from(quotes).leftJoin(customerQuoteLinks, eq(customerQuoteLinks.quoteId, quotes.id)).leftJoin(customers, eq(customerQuoteLinks.customerId, customers.id)).leftJoin(opportunities, eq(customerQuoteLinks.opportunityId, opportunities.id)).leftJoin(seller, eq(seller.id, sql`coalesce(${opportunities.assignedSellerId}, ${quotes.assignedSellerId})`)).where(where).orderBy(orderByFor(filters), asc(quotes.trackingCode)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count(quotes.id) }).from(quotes).leftJoin(customerQuoteLinks, eq(customerQuoteLinks.quoteId, quotes.id)).leftJoin(customers, eq(customerQuoteLinks.customerId, customers.id)).leftJoin(opportunities, eq(customerQuoteLinks.opportunityId, opportunities.id)).where(where),
    db.selectDistinct({ value: quotes.customerType }).from(quotes).leftJoin(customerQuoteLinks, eq(customerQuoteLinks.quoteId, quotes.id)).leftJoin(customers, eq(customerQuoteLinks.customerId, customers.id)).leftJoin(opportunities, eq(customerQuoteLinks.opportunityId, opportunities.id)).where(where).orderBy(quotes.customerType),
    db.selectDistinct({ value: quotes.currency }).from(quotes).leftJoin(customerQuoteLinks, eq(customerQuoteLinks.quoteId, quotes.id)).leftJoin(customers, eq(customerQuoteLinks.customerId, customers.id)).leftJoin(opportunities, eq(customerQuoteLinks.opportunityId, opportunities.id)).where(where).orderBy(quotes.currency),
    db.selectDistinct({ id: seller.id, name: seller.name, email: seller.email }).from(quotes).leftJoin(customerQuoteLinks, eq(customerQuoteLinks.quoteId, quotes.id)).leftJoin(customers, eq(customerQuoteLinks.customerId, customers.id)).leftJoin(opportunities, eq(customerQuoteLinks.opportunityId, opportunities.id)).innerJoin(seller, eq(seller.id, sql`coalesce(${opportunities.assignedSellerId}, ${quotes.assignedSellerId})`)).where(where).orderBy(asc(seller.name), asc(seller.email)),
    // NOTE: intentionally only quotes/customerQuoteLinks/customers/opportunities joined —
    // matches the same `where` scope as the other summary queries above so status
    // counts reflect the filtered set, not every quote ever created.
    db.select({ status: quotes.workflowStatus, legacyStatus: quotes.status, validUntil: quotes.validUntil }).from(quotes).leftJoin(customerQuoteLinks, eq(customerQuoteLinks.quoteId, quotes.id)).leftJoin(customers, eq(customerQuoteLinks.customerId, customers.id)).leftJoin(opportunities, eq(customerQuoteLinks.opportunityId, opportunities.id)).where(where).groupBy(quotes.workflowStatus, quotes.status, quotes.validUntil),
  ]);
  const itemRows = rows.length ? await db.select({ quoteId: quoteItems.quoteId, sku: quoteItems.skuSnapshot, name: quoteItems.productNameSnapshot, quantity: quoteItems.quantity }).from(quoteItems).where(inArray(quoteItems.quoteId, rows.map((row) => row.quote.id))).orderBy(asc(quoteItems.createdAt)) : [];
  const itemMap = quoteItemPreviewMap(itemRows);
  const items: QuoteListItem[] = rows.map(({ quote, customer, opportunity, seller: quoteSeller }) => {
    const itemPreview = itemMap.get(quote.id) ?? [];
    const status = displayStatus(quote.status, quote.workflowStatus, quote.validUntil);
    return { id: quote.id, trackingCode: quote.trackingCode, currentVersion: quote.currentVersionNumber, name: customer?.name ?? quote.name, customerType: customer?.customerType ?? quote.customerType, documentNumber: customer?.documentNumber ?? quote.documentNumber, phone: customer?.phone ?? quote.phone, email: customer?.email ?? quote.email, preferredContact: quote.preferredContact, productName: quote.productName, itemsPreview: itemPreview.slice(0, 2), itemCount: itemPreview.length, status: quote.status, workflowStatus: status, currency: quote.currency, subtotal: quote.subtotal, discountAmount: quote.discountAmount, taxAmount: quote.taxAmount, total: quote.total, validUntil: quote.validUntil, sentAt: quote.sentAt, seller: quoteSeller?.id ? { id: quoteSeller.id, name: quoteSeller.name, email: quoteSeller.email } : null, opportunity: opportunity?.id ? { id: opportunity.id, code: opportunity.code, stage: opportunity.stage, nextAction: opportunity.nextAction, followUpAt: opportunity.followUpAt } : null, nextAction: opportunity?.nextAction ?? null, createdAt: quote.createdAt, updatedAt: quote.updatedAt };
  });
  const statusCounts = new Map<string, number>();
  for (const row of summaryStatusRows) {
    const normalized = effectiveQuoteStatus(row.legacyStatus, row.status, row.validUntil);
    statusCounts.set(normalized, (statusCounts.get(normalized) ?? 0) + 1);
  }
  const metricsBase = metricsFromStatusCounts(statusCounts);
  const [followUpRows, expiryRows, pendingDiscountRows] = await Promise.all([
    db.select({ bucket: sql<string>`case when ${crmTasks.dueAt} < now() then 'overdue' when ${crmTasks.dueAt} < now() + interval '1 day' then 'today' else 'upcoming' end`, total: count(crmTasks.id) }).from(crmTasks).innerJoin(quotes, eq(crmTasks.quoteId, quotes.id)).leftJoin(customerQuoteLinks, eq(customerQuoteLinks.quoteId, quotes.id)).leftJoin(customers, eq(customerQuoteLinks.customerId, customers.id)).leftJoin(opportunities, eq(customerQuoteLinks.opportunityId, opportunities.id)).where(and(where, eq(crmTasks.status, "PENDING"), isNotNull(crmTasks.quoteId))).groupBy(sql`1`),
    db.select({ bucket: sql<string>`case when ${quotes.validUntil} < now() + interval '1 day' then 'today' when ${quotes.validUntil} < now() + interval '3 days' then 'threeDays' else 'sevenDays' end`, total: count(quotes.id) }).from(quotes).leftJoin(customerQuoteLinks, eq(customerQuoteLinks.quoteId, quotes.id)).leftJoin(customers, eq(customerQuoteLinks.customerId, customers.id)).leftJoin(opportunities, eq(customerQuoteLinks.opportunityId, opportunities.id)).where(and(where, gte(quotes.validUntil, new Date()), lt(quotes.validUntil, new Date(Date.now() + 7 * 86_400_000)), or(inArray(quotes.workflowStatus, ["SENT", "FOLLOW_UP"]), inArray(quotes.status, ["enviada", "nuevo", "contactado", "evaluacion", "requiere_info", "cotizada"])))).groupBy(sql`1`),
    db.select({ total: count(quoteDiscountApprovals.id) }).from(quoteDiscountApprovals).innerJoin(quotes, eq(quoteDiscountApprovals.quoteId, quotes.id)).leftJoin(customerQuoteLinks, eq(customerQuoteLinks.quoteId, quotes.id)).leftJoin(customers, eq(customerQuoteLinks.customerId, customers.id)).leftJoin(opportunities, eq(customerQuoteLinks.opportunityId, opportunities.id)).where(and(where, eq(quoteDiscountApprovals.status, "PENDING"))),
  ]);
  const followUps = { overdue: 0, today: 0, upcoming: 0 };
  for (const row of followUpRows) if (row.bucket in followUps) followUps[row.bucket as keyof typeof followUps] = numberValue(row.total);
  const expiries = { today: 0, threeDays: 0, sevenDays: 0 };
  for (const row of expiryRows) if (row.bucket in expiries) expiries[row.bucket as keyof typeof expiries] = numberValue(row.total);
  const alerts = [
    { id: "accepted", label: "Aceptadas sin convertir", count: metricsBase.accepted, workflowStatus: "ACCEPTED" as const },
    { id: "draft", label: "Borradores sin enviar", count: metricsBase.draft, workflowStatus: "DRAFT" as const },
    { id: "follow-up", label: "Seguimientos vencidos", count: followUps.overdue },
    { id: "expiry", label: "Cotizaciones próximas a vencer", count: expiries.today + expiries.threeDays, workflowStatus: "SENT" as const },
    { id: "discount", label: "Descuentos pendientes de aprobación", count: numberValue(pendingDiscountRows[0]?.total) },
  ].filter((alert) => alert.count > 0).slice(0, 5);
  const totalItems = numberValue(totalRows[0]?.total);
  return { items, page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))), pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), metrics: { total: totalItems, ...metricsBase, pending: metricsBase.draft }, summary: { ...metricsBase, followUps, expiries, alerts }, facets: { statuses: quoteWorkflowStatuses.filter((status) => statusCounts.has(status)), customerTypes: typeRows.flatMap((row) => row.value ? [row.value] : []), currencies: currencyRows.flatMap((row) => row.value ? [row.value] : []), sellers: sellerRows.map((row) => ({ id: row.id, name: row.name, email: row.email })) } };
}

export async function getQuoteDetail(quoteId: string) {
  const db = getDb();
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!quote) return null;
  const [items, history, link, versions, activities, discountApprovals, commercialRows] = await Promise.all([
    db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId)).orderBy(asc(quoteItems.createdAt)),
    db.select().from(quoteStatusHistory).where(eq(quoteStatusHistory.quoteId, quoteId)).orderBy(desc(quoteStatusHistory.createdAt)),
    db.select({ link: customerQuoteLinks, customer: customers, opportunity: opportunities, seller }).from(customerQuoteLinks).leftJoin(customers, eq(customerQuoteLinks.customerId, customers.id)).leftJoin(opportunities, eq(customerQuoteLinks.opportunityId, opportunities.id)).leftJoin(seller, or(eq(seller.id, opportunities.assignedSellerId), quote.assignedSellerId ? eq(seller.id, quote.assignedSellerId) : undefined)).where(eq(customerQuoteLinks.quoteId, quoteId)).limit(1),
    db.select().from(quoteVersions).where(eq(quoteVersions.quoteId, quoteId)).orderBy(desc(quoteVersions.versionNumber)),
    db.select().from(crmActivities).where(eq(crmActivities.quoteId, quoteId)).orderBy(desc(crmActivities.createdAt)),
    db.select().from(quoteDiscountApprovals).where(eq(quoteDiscountApprovals.quoteId, quoteId)).orderBy(desc(quoteDiscountApprovals.createdAt)),
    db.select({ sale: sales, order: orders, payment: payments }).from(sales).leftJoin(orders, eq(orders.saleId, sales.id)).leftJoin(payments, eq(payments.orderId, orders.id)).where(eq(sales.quoteId, quoteId)).orderBy(desc(sales.createdAt)).limit(1),
  ]);
  const opportunityId = link[0]?.opportunity?.id;
  const [followUps, stageHistory, versionItems] = await Promise.all([
    opportunityId ? db.select().from(opportunityFollowups).where(eq(opportunityFollowups.opportunityId, opportunityId)).orderBy(asc(opportunityFollowups.dueAt)) : Promise.resolve([]),
    opportunityId ? db.select().from(opportunityStageHistory).where(eq(opportunityStageHistory.opportunityId, opportunityId)).orderBy(desc(opportunityStageHistory.createdAt)) : Promise.resolve([]),
    versions.length ? db.select().from(quoteVersionItems).where(inArray(quoteVersionItems.versionId, versions.map((version) => version.id))).orderBy(asc(quoteVersionItems.id)) : Promise.resolve([]),
  ]);
  const itemsByVersion = new Map<string, typeof versionItems>();
  for (const item of versionItems) itemsByVersion.set(item.versionId, [...(itemsByVersion.get(item.versionId) ?? []), item]);
  return { quote: { ...quote, normalizedWorkflowStatus: displayStatus(quote.status, quote.workflowStatus, quote.validUntil) }, items, history, customer: link[0]?.customer ?? null, opportunity: link[0]?.opportunity ?? null, seller: link[0]?.seller ?? null, activities, followUps, stageHistory, versions: versions.map((version) => ({ ...version, items: itemsByVersion.get(version.id) ?? [] })), acceptedVersion: versions.find((version) => version.id === quote.acceptedVersionId) ?? null, discountApprovals, commercial: { sale: commercialRows[0]?.sale ?? null, order: commercialRows[0]?.order ?? null, payment: commercialRows[0]?.payment ?? null } };
}

export function isCanonicalQuoteStatus(value: string): value is QuoteWorkflowStatus {
  return (quoteWorkflowStatuses as readonly string[]).includes(value);
}

export function legacyStatusForWorkflow(status: QuoteWorkflowStatus) {
  const map: Record<QuoteWorkflowStatus, (typeof quoteStatusHistory.$inferInsert)["toStatus"]> = { DRAFT: "borrador", SENT: "enviada", FOLLOW_UP: "cotizada", ACCEPTED: "aprobada", REJECTED: "cerrada", EXPIRED: "cerrada", CONVERTED: "convertida", CANCELLED: "cerrada" };
  return map[status];
}
