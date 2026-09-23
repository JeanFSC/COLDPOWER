import { paymentMethodTypeEnum, paymentStatusEnum } from "@/db/sales-schema";

export class PaymentsInvalidFilterError extends Error {
  constructor() { super("PAYMENTS_INVALID_FILTER"); this.name = "PaymentsInvalidFilterError"; }
}

export const reconciliationStates = ["PENDING", "MATCH", "UNDERPAID", "OVERPAID"] as const;
export type ReconciliationState = (typeof reconciliationStates)[number];
export const receivedPaymentStatuses = ["CONFIRMED", "APPROVED", "REFUNDED"] as const;
export const paymentQueueKeys = ["pending", "difference", "providerErrors", "refunds"] as const;
export type PaymentQueueKey = (typeof paymentQueueKeys)[number];

export type PaymentLedgerRow = { amount: string | number; status: string };
export type RefundLedgerRow = { amount: string | number; status: string };

export type PaymentsFilters = {
  query?: string;
  status?: (typeof paymentStatusEnum.enumValues)[number];
  reconciliation?: ReconciliationState;
  provider?: string;
  method?: string;
  methodType?: (typeof paymentMethodTypeEnum.enumValues)[number];
  orderId?: string;
  orderQuery?: string;
  saleId?: string;
  customerId?: string;
  customerQuery?: string;
  currency?: string;
  dateFrom?: string;
  dateTo?: string;
  queue?: PaymentQueueKey;
  page?: number;
  pageSize?: number;
};

function text(params: URLSearchParams, key: string) { const value = params.get(key)?.trim(); return value || undefined; }
function positive(params: URLSearchParams, key: string) { const raw = params.get(key); if (!raw) return undefined; const value = Number(raw); if (!Number.isInteger(value) || value < 1) throw new PaymentsInvalidFilterError(); return value; }
function date(params: URLSearchParams, key: string) { const value = text(params, key); if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new PaymentsInvalidFilterError(); return value; }

export function parsePaymentsFilters(params: URLSearchParams): PaymentsFilters {
  const status = text(params, "status");
  const methodType = text(params, "methodType");
  const reconciliation = text(params, "reconciliation");
  const currency = text(params, "currency")?.toUpperCase();
  const queue = text(params, "queue");
  if (status && !(paymentStatusEnum.enumValues as readonly string[]).includes(status)) throw new PaymentsInvalidFilterError();
  if (methodType && !(paymentMethodTypeEnum.enumValues as readonly string[]).includes(methodType)) throw new PaymentsInvalidFilterError();
  if (reconciliation && !(reconciliationStates as readonly string[]).includes(reconciliation)) throw new PaymentsInvalidFilterError();
  if (currency && !/^[A-Z]{3}$/.test(currency)) throw new PaymentsInvalidFilterError();
  if (queue && !(paymentQueueKeys as readonly string[]).includes(queue)) throw new PaymentsInvalidFilterError();
  const dateFrom = date(params, "dateFrom");
  const dateTo = date(params, "dateTo");
  if (dateFrom && dateTo && dateFrom > dateTo) throw new PaymentsInvalidFilterError();
  return { query: text(params, "query") ?? text(params, "q"), status: status as PaymentsFilters["status"], reconciliation: reconciliation as ReconciliationState | undefined, provider: text(params, "provider"), method: text(params, "method"), methodType: methodType as PaymentsFilters["methodType"], orderId: text(params, "orderId"), orderQuery: text(params, "order"), saleId: text(params, "saleId"), customerId: text(params, "customerId"), customerQuery: text(params, "customer"), currency, dateFrom, dateTo, queue: queue as PaymentQueueKey | undefined, page: positive(params, "page"), pageSize: positive(params, "pageSize") };
}

export type PaymentListItem = {
  id: string; orderId: string; orderCode: string; saleId: string | null; saleCode: string | null; customerId: string; customerName: string;
  methodType: string; method: string; provider: string | null; providerReference: string | null; amount: string; currency: string; status: string; attempts: number;
  expectedAmount: string; grossReceivedAmount: string; refundedAmount: string; netReceivedAmount: string; receivedAmount: string; difference: string; reconciliation: ReconciliationState; refundRequired: boolean;
  createdAt: Date; updatedAt: Date;
};

export type CurrencyPaymentMetric = { currency: string; gross: number; refunded: number; net: number };

export type PaymentsPageResponse = {
  items: PaymentListItem[]; page: number; pageSize: number; totalItems: number; totalPages: number;
  queues: {
    pending: PaymentListItem[];
    difference: PaymentListItem[];
    providerErrors: PaymentListItem[];
    refunds: PaymentListItem[];
  };
  metrics: {
    total: number; pending: number; approved: number; rejected: number; refunded: number; observed: number;
    reconciledOrders: number; ordersWithConfirmedPayments: number; reconciliationNumerator: number; reconciliationDenominator: number; underpaidOrders: number; overpaidOrders: number; reconciliationRate: number | null;
    totalAmount: number; amountsByCurrency: CurrencyPaymentMetric[];
    statusBreakdown: Array<{ status: string; count: number }>; methodBreakdown: Array<{ method: string; count: number; confirmedAmountsByCurrency: CurrencyPaymentMetric[] }>;
  };
  facets: { statuses: string[]; providers: string[]; methods: string[]; currencies: string[] };
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

export function reconciliationState(expected: number, netReceived: number, hasConfirmedPayment?: boolean): ReconciliationState;
export function reconciliationState(status: string, expected: number, netReceived: number): ReconciliationState;
export function reconciliationState(expectedOrStatus: number | string, netOrExpected: number, confirmedOrNet?: boolean | number): ReconciliationState {
  const legacyStatus = typeof expectedOrStatus === "string" ? expectedOrStatus : null;
  const expected = typeof expectedOrStatus === "string" ? netOrExpected : expectedOrStatus;
  const netReceived = legacyStatus ? Number(confirmedOrNet ?? 0) : netOrExpected;
  const hasConfirmedPayment = legacyStatus ? !["PENDING", "UNDER_REVIEW"].includes(legacyStatus) : typeof confirmedOrNet === "boolean" ? confirmedOrNet : netReceived > 0;
  if (!hasConfirmedPayment) return "PENDING";
  const difference = netReceived - expected;
  if (Math.abs(difference) < 0.005) return "MATCH";
  return difference < 0 ? "UNDERPAID" : "OVERPAID";
}

function roundedMoney(value: string | number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0;
}

/**
 * Calculates the financial view of an order without mixing currencies or
 * treating pending/rejected payment rows as received money.
 */
export function summarizePaymentLedger(expectedInput: string | number, payments: PaymentLedgerRow[], refunds: RefundLedgerRow[]) {
  const expected = roundedMoney(expectedInput);
  const gross = roundedMoney(payments.filter((row) => (receivedPaymentStatuses as readonly string[]).includes(row.status)).reduce((total, row) => total + roundedMoney(row.amount), 0));
  const refunded = roundedMoney(refunds.filter((row) => row.status === "SUCCEEDED").reduce((total, row) => total + roundedMoney(row.amount), 0));
  const net = roundedMoney(gross - refunded);
  const difference = roundedMoney(net - expected);
  return { expected, gross, refunded, net, balance: roundedMoney(expected - net), difference, reconciliation: reconciliationState(expected, net, gross > 0) };
}
