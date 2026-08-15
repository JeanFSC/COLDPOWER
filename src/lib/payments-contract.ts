import { paymentMethodTypeEnum, paymentStatusEnum } from "@/db/sales-schema";

export class PaymentsInvalidFilterError extends Error {
  constructor() { super("PAYMENTS_INVALID_FILTER"); this.name = "PaymentsInvalidFilterError"; }
}

export type PaymentsFilters = {
  query?: string;
  status?: (typeof paymentStatusEnum.enumValues)[number];
  provider?: string;
  method?: string;
  methodType?: (typeof paymentMethodTypeEnum.enumValues)[number];
  orderId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

function text(params: URLSearchParams, key: string) { const value = params.get(key)?.trim(); return value || undefined; }
function positive(params: URLSearchParams, key: string) { const raw = params.get(key); if (!raw) return undefined; const value = Number(raw); if (!Number.isInteger(value) || value < 1) throw new PaymentsInvalidFilterError(); return value; }
function date(params: URLSearchParams, key: string) { const value = text(params, key); if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new PaymentsInvalidFilterError(); return value; }

export function parsePaymentsFilters(params: URLSearchParams): PaymentsFilters {
  const status = text(params, "status");
  const methodType = text(params, "methodType");
  if (status && !(paymentStatusEnum.enumValues as readonly string[]).includes(status)) throw new PaymentsInvalidFilterError();
  if (methodType && !(paymentMethodTypeEnum.enumValues as readonly string[]).includes(methodType)) throw new PaymentsInvalidFilterError();
  const dateFrom = date(params, "dateFrom");
  const dateTo = date(params, "dateTo");
  if (dateFrom && dateTo && dateFrom > dateTo) throw new PaymentsInvalidFilterError();
  return { query: text(params, "query") ?? text(params, "q"), status: status as PaymentsFilters["status"], provider: text(params, "provider"), method: text(params, "method"), methodType: methodType as PaymentsFilters["methodType"], orderId: text(params, "orderId"), customerId: text(params, "customerId"), dateFrom, dateTo, page: positive(params, "page"), pageSize: positive(params, "pageSize") };
}

export type PaymentListItem = {
  id: string;
  orderId: string;
  orderCode: string;
  saleId: string | null;
  saleCode: string | null;
  customerId: string;
  customerName: string;
  methodType: string;
  method: string;
  provider: string | null;
  providerReference: string | null;
  amount: string;
  currency: string;
  status: string;
  attempts: number;
  expectedAmount: string;
  receivedAmount: string;
  reconciliation: "MATCH" | "DIFFERENCE" | "PENDING";
  createdAt: Date;
  updatedAt: Date;
};

export type PaymentsPageResponse = {
  items: PaymentListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  metrics: { total: number; pending: number; approved: number; rejected: number; refunded: number; totalAmount: number };
  facets: { statuses: string[]; providers: string[]; methods: string[] };
};

export function normalizeProviderStatus(value: string): "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "REFUNDED" | "ERROR" {
  const normalized = value.trim().toUpperCase();
  if (["APPROVED", "CONFIRMED", "PAID", "SUCCESS", "SUCCEEDED"].includes(normalized)) return "CONFIRMED";
  if (["PENDING", "PROCESSING", "UNDER_REVIEW"].includes(normalized)) return "PENDING";
  if (["REJECTED", "DECLINED", "FAILED"].includes(normalized)) return "REJECTED";
  if (["CANCELLED", "CANCELED", "VOIDED"].includes(normalized)) return "CANCELLED";
  if (["REFUNDED", "REFUND_SUCCESS", "REFUND_SUCCEEDED"].includes(normalized)) return "REFUNDED";
  return "ERROR";
}

export function canTransitionPayment(from: string, to: string) {
  if (from === to) return true;
  if (to === "REFUNDED") return from === "CONFIRMED" || from === "APPROVED";
  if (from === "PENDING" || from === "UNDER_REVIEW") return ["CONFIRMED", "APPROVED", "REJECTED", "CANCELLED", "ERROR"].includes(to);
  if (from === "APPROVED" && to === "CONFIRMED") return true;
  return false;
}

export function reconciliationState(status: string, expected: number, received: number): PaymentListItem["reconciliation"] {
  if (status === "PENDING" || status === "UNDER_REVIEW") return "PENDING";
  return Math.abs(expected - received) < 0.005 ? "MATCH" : "DIFFERENCE";
}
