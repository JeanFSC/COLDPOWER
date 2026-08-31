import { and, asc, count, desc, eq, gte, ilike, lt, max, or, inArray, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { quoteItems, quoteStatusHistory, quotes } from "@/db/schema";
import { customerQuoteLinks, customers, opportunities } from "@/db/crm-schema";
import { legacyQuoteStatus, quoteWorkflowStatuses, type QuoteWorkflowStatus } from "@/lib/quote-workflow";
import type { QuoteFilters, QuoteListItem, QuotePageResponse } from "@/lib/quote-contract";

const defaultPageSize = 25;
const maxPageSize = 100;
function pageValues(page?: number, pageSize?: number) { return { page: Math.max(1, Math.floor(page ?? 1)), pageSize: Math.min(maxPageSize, Math.max(1, Math.floor(pageSize ?? defaultPageSize))) }; }
function dayStart(value: string) { return new Date(`${value}T00:00:00-05:00`); }
function dayAfter(value: string) { return new Date(dayStart(value).getTime() + 86_400_000); }
function numberValue(value: unknown) { return Number(value ?? 0); }
function workflowValue(status: string, workflowStatus: string | null) { return workflowStatus && (quoteWorkflowStatuses as readonly string[]).includes(workflowStatus) ? workflowStatus as QuoteWorkflowStatus : legacyQuoteStatus(status) ?? "DRAFT"; }

function quoteWhere(filters: QuoteFilters) {
  const conditions: SQL[] = [];
  if (filters.query) { const pattern = `%${filters.query.trim()}%`; conditions.push(or(ilike(quotes.trackingCode, pattern), ilike(quotes.name, pattern), ilike(quotes.email, pattern), ilike(quotes.phone, pattern), ilike(quotes.productName, pattern), ilike(quotes.sku, pattern))!); }
  if (filters.workflowStatus) conditions.push(eq(quotes.workflowStatus, filters.workflowStatus));
  if (filters.legacyStatus) conditions.push(eq(quotes.status, filters.legacyStatus as (typeof quotes.status.enumValues)[number]));
  if (filters.customerType) conditions.push(eq(quotes.customerType, filters.customerType));
  if (filters.createdFrom) conditions.push(gte(quotes.createdAt, dayStart(filters.createdFrom)));
  if (filters.createdTo) conditions.push(lt(quotes.createdAt, dayAfter(filters.createdTo)));
  return conditions.length ? and(...conditions) : undefined;
}

export async function getQuotesPage(filters: QuoteFilters = {}): Promise<QuotePageResponse> {
  const { page, pageSize } = pageValues(filters.page, filters.pageSize);
  const where = quoteWhere(filters);
  const db = getDb();
  const [rows, totalRows, statusRows, typeRows, itemRows] = await Promise.all([
    db.select().from(quotes).where(where).orderBy(desc(quotes.updatedAt), asc(quotes.trackingCode)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count(quotes.id) }).from(quotes).where(where),
    db.select({ status: quotes.workflowStatus, legacyStatus: quotes.status, total: count(quotes.id) }).from(quotes).where(where).groupBy(quotes.workflowStatus, quotes.status),
    db.selectDistinct({ value: quotes.customerType }).from(quotes).where(where).orderBy(quotes.customerType),
    db.select({ quoteId: quoteItems.quoteId, total: count(quoteItems.id) }).from(quoteItems).where(inArray(quoteItems.quoteId, (await db.select({ id: quotes.id }).from(quotes).where(where).limit(pageSize).offset((page - 1) * pageSize)).map((row) => row.id))).groupBy(quoteItems.quoteId),
  ]);
  const itemMap = new Map(itemRows.map((row) => [row.quoteId, numberValue(row.total)]));
  const items: QuoteListItem[] = rows.map((quote) => ({ id: quote.id, trackingCode: quote.trackingCode, name: quote.name, customerType: quote.customerType, documentNumber: quote.documentNumber, phone: quote.phone, email: quote.email, preferredContact: quote.preferredContact, productName: quote.productName, status: quote.status, workflowStatus: workflowValue(quote.status, quote.workflowStatus), itemCount: itemMap.get(quote.id) ?? 0, createdAt: quote.createdAt, updatedAt: quote.updatedAt }));
  const totalItems = numberValue(totalRows[0]?.total);
  const statusCounts = new Map<string, number>();
  for (const row of statusRows) { const status = workflowValue(row.legacyStatus, row.status); statusCounts.set(status, (statusCounts.get(status) ?? 0) + numberValue(row.total)); }
  const pending = ["DRAFT", "SENT", "FOLLOW_UP"].reduce((sumValue, status) => sumValue + (statusCounts.get(status) ?? 0), 0);
  const converted = statusCounts.get("CONVERTED") ?? 0;
  const rejected = ["REJECTED", "EXPIRED", "CANCELLED"].reduce((sumValue, status) => sumValue + (statusCounts.get(status) ?? 0), 0);
  const denominator = converted + rejected;
  return { items, page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))), pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), metrics: { total: totalItems, pending, converted, rejected, conversionRate: denominator ? Number(((converted / denominator) * 100).toFixed(2)) : null }, facets: { statuses: [...statusCounts.keys()], customerTypes: typeRows.map((row) => row.value) } };
}

export async function getQuoteDetail(quoteId: string) {
  const db = getDb();
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!quote) return null;
  const [items, history, link] = await Promise.all([
    db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId)).orderBy(asc(quoteItems.createdAt)),
    db.select().from(quoteStatusHistory).where(eq(quoteStatusHistory.quoteId, quoteId)).orderBy(desc(quoteStatusHistory.createdAt)),
    db.select({ link: customerQuoteLinks, customer: customers, opportunity: opportunities }).from(customerQuoteLinks).leftJoin(customers, eq(customerQuoteLinks.customerId, customers.id)).leftJoin(opportunities, eq(customerQuoteLinks.opportunityId, opportunities.id)).where(eq(customerQuoteLinks.quoteId, quoteId)).limit(1),
  ]);
  return { quote: { ...quote, normalizedWorkflowStatus: workflowValue(quote.status, quote.workflowStatus) }, items, history, customer: link[0]?.customer ?? null, opportunity: link[0]?.opportunity ?? null };
}
