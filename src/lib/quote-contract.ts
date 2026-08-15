import { quoteWorkflowStatuses, legacyQuoteStatus, type QuoteWorkflowStatus } from "@/lib/quote-workflow";

export class QuoteInvalidFilterError extends Error {
  constructor() { super("QUOTE_INVALID_FILTER"); this.name = "QuoteInvalidFilterError"; }
}

export type QuoteFilters = { query?: string; workflowStatus?: QuoteWorkflowStatus; legacyStatus?: string; customerType?: string; createdFrom?: string; createdTo?: string; page?: number; pageSize?: number };

function text(params: URLSearchParams, key: string) { const value = params.get(key)?.trim(); return value || undefined; }
function positive(params: URLSearchParams, key: string) { const raw = params.get(key); if (raw === null || raw === "") return undefined; const value = Number(raw); if (!Number.isInteger(value) || value < 1) throw new QuoteInvalidFilterError(); return value; }
function date(params: URLSearchParams, key: string) { const value = text(params, key); if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new QuoteInvalidFilterError(); return value; }

export function parseQuoteFilters(params: URLSearchParams): QuoteFilters {
  const status = text(params, "workflowStatus") ?? text(params, "status");
  const workflowStatus = status && (quoteWorkflowStatuses as readonly string[]).includes(status) ? status as QuoteWorkflowStatus : undefined;
  const legacyStatus = status && !workflowStatus ? legacyQuoteStatus(status) ? status : undefined : undefined;
  if (status && !workflowStatus && !legacyStatus) throw new QuoteInvalidFilterError();
  const createdFrom = date(params, "createdFrom");
  const createdTo = date(params, "createdTo");
  if (createdFrom && createdTo && createdFrom > createdTo) throw new QuoteInvalidFilterError();
  return { query: text(params, "query") ?? text(params, "q"), workflowStatus, legacyStatus, customerType: text(params, "customerType"), createdFrom, createdTo, page: positive(params, "page"), pageSize: positive(params, "pageSize") };
}

export type QuoteListItem = { id: string; trackingCode: string; name: string; customerType: string; documentNumber: string; phone: string; email: string | null; preferredContact: string; productName: string | null; status: string; workflowStatus: string; itemCount: number; createdAt: Date; updatedAt: Date };
export type QuotePageResponse = { items: QuoteListItem[]; page: number; pageSize: number; totalItems: number; totalPages: number; metrics: { total: number; pending: number; converted: number; rejected: number; conversionRate: number | null }; facets: { statuses: string[]; customerTypes: string[] } };
