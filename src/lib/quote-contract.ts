import { quoteWorkflowStatuses, legacyQuoteStatus, type QuoteWorkflowStatus } from "@/lib/quote-workflow";

export class QuoteInvalidFilterError extends Error {
  constructor() { super("QUOTE_INVALID_FILTER"); this.name = "QuoteInvalidFilterError"; }
}

export type QuoteFilters = { query?: string; workflowStatus?: QuoteWorkflowStatus; legacyStatus?: string; open?: boolean; customerType?: string; customerId?: string; assignedSellerId?: string; currency?: string; createdFrom?: string; createdTo?: string; sentFrom?: string; sentTo?: string; validity?: "today" | "3d" | "7d" | "expired"; followUp?: "with" | "without"; discount?: "with" | "without" | "pending"; page?: number; pageSize?: number; sort?: "createdAt" | "updatedAt" | "trackingCode" | "customer" | "status" | "validUntil" | "total"; direction?: "asc" | "desc" };

function text(params: URLSearchParams, key: string) { const value = params.get(key)?.trim(); return value || undefined; }
function positive(params: URLSearchParams, key: string) { const raw = params.get(key); if (raw === null || raw === "") return undefined; const value = Number(raw); if (!Number.isInteger(value) || value < 1) throw new QuoteInvalidFilterError(); return value; }
function date(params: URLSearchParams, key: string) { const value = text(params, key); if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new QuoteInvalidFilterError(); return value; }

export function parseQuoteFilters(params: URLSearchParams): QuoteFilters {
  const rawStatus = text(params, "workflowStatus") ?? text(params, "status");
  const open = rawStatus === "open";
  const status = open ? undefined : rawStatus;
  const workflowStatus = status && (quoteWorkflowStatuses as readonly string[]).includes(status) ? status as QuoteWorkflowStatus : undefined;
  const legacyStatus = status && !workflowStatus ? legacyQuoteStatus(status) ? status : undefined : undefined;
  if (status && !workflowStatus && !legacyStatus) throw new QuoteInvalidFilterError();
  const createdFrom = date(params, "createdFrom");
  const createdTo = date(params, "createdTo");
  const sentFrom = date(params, "sentFrom");
  const sentTo = date(params, "sentTo");
  if (createdFrom && createdTo && createdFrom > createdTo) throw new QuoteInvalidFilterError();
  if (sentFrom && sentTo && sentFrom > sentTo) throw new QuoteInvalidFilterError();
  const currency = text(params, "currency")?.toUpperCase();
  if (currency && !/^[A-Z]{3}$/.test(currency)) throw new QuoteInvalidFilterError();
  const validity = text(params, "validity");
  if (validity && !["today", "3d", "7d", "expired"].includes(validity)) throw new QuoteInvalidFilterError();
  const followUp = text(params, "followUp");
  if (followUp && !["with", "without"].includes(followUp)) throw new QuoteInvalidFilterError();
  const discount = text(params, "discount");
  if (discount && !["with", "without", "pending"].includes(discount)) throw new QuoteInvalidFilterError();
  const sort = text(params, "sort");
  if (sort && !["createdAt", "updatedAt", "trackingCode", "customer", "status", "validUntil", "total"].includes(sort)) throw new QuoteInvalidFilterError();
  const direction = text(params, "direction");
  if (direction && !["asc", "desc"].includes(direction)) throw new QuoteInvalidFilterError();
  return { query: text(params, "query") ?? text(params, "q"), workflowStatus, legacyStatus, open, customerType: text(params, "customerType"), customerId: text(params, "customerId"), assignedSellerId: text(params, "assignedSellerId"), currency, createdFrom, createdTo, sentFrom, sentTo, validity: validity as QuoteFilters["validity"], followUp: followUp as QuoteFilters["followUp"], discount: discount as QuoteFilters["discount"], page: positive(params, "page"), pageSize: positive(params, "pageSize"), sort: sort as QuoteFilters["sort"], direction: direction as QuoteFilters["direction"] };
}

export type QuoteListItem = { id: string; trackingCode: string; currentVersion: number; name: string; customerType: string; documentNumber: string; phone: string; email: string | null; preferredContact: string; productName: string | null; itemsPreview: Array<{ name: string; sku: string; quantity: number }>; itemCount: number; status: string; workflowStatus: string; currency: string | null; subtotal: string | null; discountAmount: string | null; taxAmount: string | null; total: string | null; validUntil: Date | null; sentAt: Date | null; seller: { id: string; name: string | null; email: string | null } | null; opportunity: { id: string; code: string; stage: string; nextAction: string | null; followUpAt: Date | null } | null; nextAction: string | null; createdAt: Date; updatedAt: Date };
export type QuoteSummary = { open: number; draft: number; sent: number; followUp: number; accepted: number; rejected: number; expired: number; converted: number; cancelled: number; conversionRate: number | null; followUps: { overdue: number; today: number; upcoming: number }; expiries: { today: number; threeDays: number; sevenDays: number }; alerts: Array<{ id: string; label: string; count: number; workflowStatus?: QuoteWorkflowStatus }> };
export type QuotePageResponse = { items: QuoteListItem[]; page: number; pageSize: number; totalItems: number; totalPages: number; metrics: { total: number; open: number; pending: number; accepted: number; converted: number; rejected: number; expired: number; cancelled: number; conversionRate: number | null }; summary: QuoteSummary; facets: { statuses: string[]; customerTypes: string[]; currencies: string[]; sellers: Array<{ id: string; name: string | null; email: string | null }> } };

export type QuoteTaxMode = "INCLUDED" | "EXCLUDED" | "UNCONFIGURED";
export type QuoteResponseChannel = "WHATSAPP" | "EMAIL" | "PHONE" | "IN_PERSON" | "PORTAL" | "OTHER";

export function quoteCurrencyLabel(currency: string | null | undefined) {
  if (currency === "PEN") return "S/";
  if (currency === "USD") return "$";
  return currency ?? "";
}
