import { deliveryMethodEnum, orderStatusEnum, paymentStatusEnum } from "@/db/sales-schema";
import type { ReconciliationState } from "@/lib/payments-contract";

export class OrdersInvalidFilterError extends Error {
  constructor() { super("ORDERS_INVALID_FILTER"); this.name = "OrdersInvalidFilterError"; }
}

export type OrdersFilters = {
  query?: string;
  status?: (typeof orderStatusEnum.enumValues)[number];
  active?: boolean;
  customerId?: string;
  customerQuery?: string;
  sellerId?: string;
  sellerQuery?: string;
  deliveryMethod?: (typeof deliveryMethodEnum.enumValues)[number];
  locationId?: string;
  currency?: string;
  dateFrom?: string;
  dateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  paymentStatus?: (typeof paymentStatusEnum.enumValues)[number];
  reconciliation?: ReconciliationState;
  withIncident?: boolean;
  page?: number;
  pageSize?: number;
};

function text(params: URLSearchParams, key: string) { const value = params.get(key)?.trim(); return value || undefined; }
function positive(params: URLSearchParams, key: string) { const raw = params.get(key); if (raw === null || raw === "") return undefined; const value = Number(raw); if (!Number.isInteger(value) || value < 1) throw new OrdersInvalidFilterError(); return value; }
function date(params: URLSearchParams, key: string) { const value = text(params, key); if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new OrdersInvalidFilterError(); return value; }

export function parseOrdersFilters(params: URLSearchParams): OrdersFilters {
  const rawStatus = text(params, "status");
  const active = rawStatus === "active";
  const status = active ? undefined : rawStatus;
  const deliveryMethod = text(params, "deliveryMethod");
  const paymentStatus = text(params, "paymentStatus");
  const reconciliation = text(params, "reconciliation");
  const currency = text(params, "currency")?.toUpperCase();
  if (status && !(orderStatusEnum.enumValues as readonly string[]).includes(status)) throw new OrdersInvalidFilterError();
  if (deliveryMethod && !(deliveryMethodEnum.enumValues as readonly string[]).includes(deliveryMethod)) throw new OrdersInvalidFilterError();
  if (paymentStatus && !(paymentStatusEnum.enumValues as readonly string[]).includes(paymentStatus)) throw new OrdersInvalidFilterError();
  if (reconciliation && !["PENDING", "MATCH", "UNDERPAID", "OVERPAID"].includes(reconciliation)) throw new OrdersInvalidFilterError();
  if (currency && !/^[A-Z]{3}$/.test(currency)) throw new OrdersInvalidFilterError();
  const dateFrom = date(params, "dateFrom") ?? date(params, "createdFrom");
  const dateTo = date(params, "dateTo") ?? date(params, "createdTo");
  if (dateFrom && dateTo && dateFrom > dateTo) throw new OrdersInvalidFilterError();
  return { query: text(params, "query") ?? text(params, "q"), status: status as OrdersFilters["status"], active, customerId: text(params, "customerId"), customerQuery: text(params, "customer"), sellerId: text(params, "sellerId"), sellerQuery: text(params, "seller"), deliveryMethod: deliveryMethod as OrdersFilters["deliveryMethod"], locationId: text(params, "locationId"), currency, dateFrom, dateTo, createdFrom: dateFrom, createdTo: dateTo, paymentStatus: paymentStatus as OrdersFilters["paymentStatus"], reconciliation: reconciliation as ReconciliationState | undefined, withIncident: params.get("withIncident") === "true" || params.get("incident") === "true", page: positive(params, "page"), pageSize: positive(params, "pageSize") };
}

export type OrderAttention = "NORMAL" | "REQUIRES_ATTENTION" | "OVERDUE" | "INCIDENT";
export type OrderListItem = {
  id: string; code: string; customerId: string; customerName: string; customerPhone: string; customerEmail: string | null;
  sellerId: string | null; sellerName: string | null; sellerEmail: string | null; locationName: string | null; channel: string | null;
  saleId: string; quoteId: string | null; quoteTrackingCode: string | null;
  // Set for online (storefront) purchases: the buyer's account.
  userId: string | null;
  lineCount: number; reservationCount: number; totalQuantity: number; pickedQuantity: number; openIncidentCount: number;
  paymentStatus: string | null; expectedAmount: string; netReceivedAmount: string; paymentReconciliation: ReconciliationState;
  attention: OrderAttention; status: string; deliveryMethod: string; locationId: string; deliveryAddress: string | null;
  subtotal: string; discountAmount: string; total: string; currency: string; deliveredAt: Date | null; receivedBy: string | null; version: number; createdAt: Date; updatedAt: Date;
};

export type OrdersPageResponse = {
  items: OrderListItem[]; page: number; pageSize: number; totalItems: number; totalPages: number;
  queues: {
    prepare: OrderListItem[];
    dispatch: OrderListItem[];
    pickup: OrderListItem[];
    incidents: OrderListItem[];
  };
  metrics: {
    total: number; active: number; new: number; preparing: number; ready: number; inTransit: number; delivered: number;
    pendingPayment: number; pending: number; cancelled: number; paid: number; incidents: number;
    totalAmount: number; averageTicket: number | null; amountsByCurrency: Array<{ currency: string; amount: number }>;
  };
  facets: { statuses: string[]; deliveryMethods: string[]; currencies: string[]; locations: Array<{ id: string; name: string }> };
};
