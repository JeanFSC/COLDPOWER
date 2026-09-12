import { paymentStatusEnum, saleStatusEnum } from "@/db/sales-schema";

export class SalesInvalidFilterError extends Error {
  constructor() {
    super("SALES_INVALID_FILTER");
    this.name = "SalesInvalidFilterError";
  }
}
export type SalesFilters = {
  query?: string;
  status?: (typeof saleStatusEnum.enumValues)[number];
  sellerId?: string;
  sellerQuery?: string;
  customerId?: string;
  customerQuery?: string;
  quoteId?: string;
  orderId?: string;
  paymentStatus?: string;
  paymentReconciliation?: SalesFinancialState;
  invoiceStatus?: string;
  currency?: string;
  channel?: string;
  dateFrom?: string;
  dateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  pageSize?: number;
};
function text(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim();
  return value || undefined;
}
function positive(params: URLSearchParams, key: string) {
  const raw = params.get(key);
  if (raw === null || raw === "") return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new SalesInvalidFilterError();
  return value;
}
function date(params: URLSearchParams, key: string) {
  const value = text(params, key);
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new SalesInvalidFilterError();
  return value;
}
export function parseSalesFilters(params: URLSearchParams): SalesFilters {
  const status = text(params, "status");
  const paymentStatus = text(params, "paymentStatus");
  const paymentReconciliation = text(params, "paymentReconciliation");
  const invoiceStatus = text(params, "invoiceStatus");
  if (status && !(saleStatusEnum.enumValues as readonly string[]).includes(status))
    throw new SalesInvalidFilterError();
  if (paymentStatus && !(paymentStatusEnum.enumValues as readonly string[]).includes(paymentStatus))
    throw new SalesInvalidFilterError();
  if (
    paymentReconciliation &&
    !["PENDING", "PARTIAL", "PAID", "OVERPAID", "OBSERVED", "NO_ORDER"].includes(
      paymentReconciliation,
    )
  )
    throw new SalesInvalidFilterError();
  if (invoiceStatus && !["PENDING", "ISSUED", "VOID", "ERROR"].includes(invoiceStatus))
    throw new SalesInvalidFilterError();
  const dateFrom = date(params, "dateFrom") ?? date(params, "createdFrom");
  const dateTo = date(params, "dateTo") ?? date(params, "createdTo");
  if (dateFrom && dateTo && dateFrom > dateTo) throw new SalesInvalidFilterError();
  return {
    query: text(params, "query") ?? text(params, "q"),
    status: status as SalesFilters["status"],
    sellerId: text(params, "sellerId"),
    sellerQuery: text(params, "seller"),
    customerId: text(params, "customerId"),
    customerQuery: text(params, "customer"),
    quoteId: text(params, "quoteId"),
    orderId: text(params, "orderId"),
    paymentStatus,
    paymentReconciliation: paymentReconciliation as SalesFinancialState | undefined,
    invoiceStatus,
    currency: text(params, "currency"),
    channel: text(params, "channel"),
    dateFrom,
    dateTo,
    createdFrom: dateFrom,
    createdTo: dateTo,
    page: positive(params, "page"),
    pageSize: positive(params, "pageSize"),
  };
}
export type SalesFinancialState =
  | "PENDING"
  | "PARTIAL"
  | "PAID"
  | "OVERPAID"
  | "OBSERVED"
  | "NO_ORDER";
export type SalesMoneyByCurrency = {
  currency: string;
  saleCount: number;
  expectedAmount: string;
  receivedAmount: string;
  pendingAmount: string;
  averageTicket: string | null;
};
export type SalesListItem = {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  sellerId: string | null;
  sellerName: string | null;
  sellerEmail: string | null;
  quoteId: string | null;
  quoteTrackingCode: string | null;
  opportunityId: string | null;
  opportunityCode: string | null;
  opportunityTitle: string | null;
  orderId: string | null;
  orderCode: string | null;
  orderStatus: string | null;
  lineCount: number;
  paymentStatus: string | null;
  payment: {
    expectedAmount: string;
    receivedAmount: string;
    refundedAmount: string;
    difference: string;
    state: SalesFinancialState;
  };
  status: string;
  channel: string | null;
  subtotal: string;
  discountAmount: string;
  total: string;
  currency: string;
  invoiceStatus: string | null;
  externalInvoiceReference: string | null;
  createdAt: Date;
  updatedAt: Date;
};
export type SalesPageResponse = {
  items: SalesListItem[];
  queues: {
    pending: SalesListItem[];
    invoices: SalesListItem[];
    alerts: SalesListItem[];
  };
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  metrics: {
    total: number;
    confirmed: number;
    cancelled: number;
    pending: number;
    alertCount: number;
    moneyByCurrency: SalesMoneyByCurrency[];
    totalAmount: number | null;
    averageTicket: number | null;
    conversionRate: null;
    paymentBreakdown: Array<{ method: string; count: number }>;
    channelBreakdown: Array<{ channel: string; count: number }>;
  };
  facets: { statuses: string[]; currencies: string[]; channels: string[] };
};
