import "server-only";

import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/db";
import { customerQuoteLinks, customers } from "@/db/crm-schema";
import {
  orderItems,
  orderStatusHistory,
  orders,
  payments,
  shipments,
} from "@/db/sales-schema";
import { quotes } from "@/db/schema";
import {
  getAccountOverview,
  publicOrderStatus,
  publicQuoteStatus,
} from "@/lib/account-overview";
import {
  accountDeliveryAttentionStatuses,
  accountQuoteAttentionCondition,
  isAccountOrderInProgress,
  isAccountPaymentPending,
  isQuoteAwaitingCustomerDecision,
} from "@/lib/account-attention";
import { buildOrderTimeline } from "@/lib/order-display";

export type AccountAttention = {
  id: string;
  kind: "quote" | "payment" | "order";
  title: string;
  reference: string;
  description: string;
  href: string;
  action: string;
  validUntil: Date | null;
  estimatedDeliveryAt: Date | null;
};

export type AccountCurrentOrder = {
  id: string;
  code: string;
  title: string;
  status: string;
  statusLabel: string;
  updatedAt: Date;
  deliveryMethod: string;
  location: string | null;
  estimatedDeliveryAt: Date | null;
  timeline: ReturnType<typeof buildOrderTimeline>;
};

export type AccountQuoteSummary = {
  id: string;
  reference: string;
  title: string;
  status: string;
  statusLabel: string;
  updatedAt: Date;
  validUntil: Date | null;
};

export type AccountOrderSummary = {
  id: string;
  code: string;
  title: string;
  status: string;
  statusLabel: string;
  total: string;
  currency: string;
  updatedAt: Date;
};

export type AccountHubData = {
  overview: Awaited<ReturnType<typeof getAccountOverview>>;
  attention: AccountAttention[];
  currentOrder: AccountCurrentOrder | null;
  recentQuotes: AccountQuoteSummary[];
  recentOrders: AccountOrderSummary[];
};

function quoteTitle(productName: string | null, message: string) {
  const product = productName?.trim();
  if (product) return product;
  const firstLine = message.trim().split(/\r?\n/)[0]?.trim();
  return firstLine ? firstLine.slice(0, 72) : "Solicitud de cotización";
}

function orderTitle(productName: string | null, code: string) {
  return productName?.trim() || `Pedido ${code}`;
}

function publicReference(value: string, prefix: "COT" | "PED") {
  const normalized = value.trim();
  const upper = normalized.toUpperCase();
  if (upper.startsWith(`${prefix}-`)) return normalized;
  if (prefix === "PED" && upper.startsWith("ORD-")) return `PED-${normalized.slice(4)}`;
  return normalized.length <= 32 && !normalized.includes("-")
    ? `${prefix}-${normalized}`
    : `${prefix}-${normalized.slice(-8).toUpperCase()}`;
}

export async function getAccountHubData(userId: string, role: Parameters<typeof getAccountOverview>[1]): Promise<AccountHubData> {
  const db = getDb();
  const now = new Date();
  const overview = await getAccountOverview(userId, role);
  const quoteOwnership = or(eq(quotes.userId, userId), eq(customers.userId, userId));
  const orderOwnership = or(eq(orders.userId, userId), eq(customers.userId, userId));

  const quoteSelection = {
    id: quotes.id,
    trackingCode: quotes.trackingCode,
    productName: quotes.productName,
    message: quotes.message,
    status: quotes.status,
    workflowStatus: quotes.workflowStatus,
    updatedAt: quotes.updatedAt,
    validUntil: quotes.validUntil,
  };

  const [quoteRows, attentionQuoteRows, orderRows, paymentRows] = await Promise.all([
    db
      .select(quoteSelection)
      .from(quotes)
      .leftJoin(customerQuoteLinks, eq(customerQuoteLinks.quoteId, quotes.id))
      .leftJoin(customers, eq(customerQuoteLinks.customerId, customers.id))
      .where(quoteOwnership)
      .orderBy(desc(quotes.updatedAt))
      .limit(30),
    db
      .select(quoteSelection)
      .from(quotes)
      .leftJoin(customerQuoteLinks, eq(customerQuoteLinks.quoteId, quotes.id))
      .leftJoin(customers, eq(customerQuoteLinks.customerId, customers.id))
      .where(and(quoteOwnership, accountQuoteAttentionCondition(now)))
      .orderBy(desc(quotes.updatedAt))
      .limit(3),
    db
      .select({
        id: orders.id,
        code: orders.code,
        status: orders.status,
        total: orders.total,
        currency: orders.currency,
        deliveryMethod: orders.deliveryMethod,
        paymentDueAt: orders.paymentDueAt,
        updatedAt: orders.updatedAt,
        location: customers.location,
        estimatedDeliveryAt: shipments.estimatedDeliveryAt,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(shipments, eq(shipments.orderId, orders.id))
      .where(orderOwnership)
      .orderBy(desc(orders.updatedAt))
      .limit(30),
    db
      .select({
        id: payments.id,
        orderId: payments.orderId,
        orderCode: orders.code,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        orderStatus: orders.status,
        paymentDueAt: orders.paymentDueAt,
        updatedAt: payments.updatedAt,
      })
      .from(payments)
      .innerJoin(orders, eq(payments.orderId, orders.id))
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(orderOwnership)
      .orderBy(desc(payments.updatedAt))
      .limit(50),
  ]);

  const orderIds = orderRows.map((row) => row.id);
  const [itemRows, historyRows] = orderIds.length
    ? await Promise.all([
        db
          .select({ orderId: orderItems.orderId, productName: orderItems.productNameSnapshot })
          .from(orderItems)
          .where(inArray(orderItems.orderId, orderIds))
          .orderBy(orderItems.createdAt),
        db
          .select({ orderId: orderStatusHistory.orderId, toStatus: orderStatusHistory.toStatus, createdAt: orderStatusHistory.createdAt })
          .from(orderStatusHistory)
          .where(inArray(orderStatusHistory.orderId, orderIds))
          .orderBy(orderStatusHistory.createdAt),
      ])
    : [[], []];

  const firstItemByOrder = new Map<string, string>();
  for (const row of itemRows) {
    if (!firstItemByOrder.has(row.orderId)) firstItemByOrder.set(row.orderId, row.productName);
  }
  const historyByOrder = new Map<string, Array<{ toStatus: string; createdAt: Date }>>();
  for (const row of historyRows) {
    const history = historyByOrder.get(row.orderId) ?? [];
    history.push({ toStatus: row.toStatus, createdAt: row.createdAt });
    historyByOrder.set(row.orderId, history);
  }

  const attention: AccountAttention[] = [];
  for (const quote of attentionQuoteRows) {
    if (!isQuoteAwaitingCustomerDecision(quote.status, quote.workflowStatus, quote.validUntil, now)) continue;
    attention.push({
      id: `quote-${quote.id}`,
      kind: "quote",
      title: "Cotización respondida",
      reference: publicReference(quote.trackingCode, "COT"),
      description: quote.validUntil ? "Revisa la respuesta antes de que venza." : "Revisa la respuesta de tu equipo comercial.",
      href: "/cuenta/cotizaciones",
      action: "Ver cotización",
      validUntil: quote.validUntil,
      estimatedDeliveryAt: null,
    });
  }

  const pendingOrderIds = new Set<string>();
  for (const payment of paymentRows) {
    if (!isAccountPaymentPending(payment.status, payment.orderStatus, payment.paymentDueAt, now) || pendingOrderIds.has(payment.orderId)) continue;
    pendingOrderIds.add(payment.orderId);
    attention.push({
      id: `payment-${payment.id}`,
      kind: "payment",
      title: "Pago pendiente",
      reference: publicReference(payment.orderCode, "PED"),
      description: `Monto pendiente · ${payment.currency} ${payment.amount}`,
      href: `/cuenta/pedidos/${encodeURIComponent(payment.orderCode)}`,
      action: "Pagar ahora",
      validUntil: null,
      estimatedDeliveryAt: null,
    });
  }

  for (const order of orderRows) {
    if (!(accountDeliveryAttentionStatuses as readonly string[]).includes(order.status) || !isAccountOrderInProgress(order.status, order.paymentDueAt, now)) continue;
    attention.push({
      id: `order-${order.id}`,
      kind: "order",
      title: "Pedido en camino",
      reference: publicReference(order.code, "PED"),
      description: order.estimatedDeliveryAt ? "Revisa el avance de tu entrega." : "Tu pedido tiene un nuevo avance.",
      href: `/cuenta/pedidos/${encodeURIComponent(order.code)}`,
      action: "Ver detalle",
      validUntil: null,
      estimatedDeliveryAt: order.estimatedDeliveryAt,
    });
  }

  const attentionPriority = { quote: 0, payment: 1, order: 2 } as const;
  attention.sort((left, right) => attentionPriority[left.kind] - attentionPriority[right.kind]);

  const currentRow = orderRows.find((row) => isAccountOrderInProgress(row.status, row.paymentDueAt, now)) ?? null;
  const currentOrder = currentRow
    ? {
        id: currentRow.id,
        code: currentRow.code,
        title: orderTitle(firstItemByOrder.get(currentRow.id) ?? null, currentRow.code),
        status: currentRow.status,
        statusLabel: publicOrderStatus(currentRow.status),
        updatedAt: currentRow.updatedAt,
        deliveryMethod: currentRow.deliveryMethod,
        location: currentRow.location,
        estimatedDeliveryAt: currentRow.estimatedDeliveryAt,
        timeline: buildOrderTimeline(currentRow.deliveryMethod, currentRow.status, historyByOrder.get(currentRow.id) ?? []),
      }
    : null;

  return {
    overview,
    attention: attention.slice(0, 3),
    currentOrder,
    recentQuotes: quoteRows.slice(0, 3).map((quote) => ({
      id: quote.id,
      reference: publicReference(quote.trackingCode, "COT"),
      title: quoteTitle(quote.productName, quote.message),
      status: quote.status,
      statusLabel: publicQuoteStatus(quote.status),
      updatedAt: quote.updatedAt,
      validUntil: quote.validUntil,
    })),
    recentOrders: orderRows.slice(0, 3).map((order) => ({
      id: order.id,
      code: order.code,
      title: orderTitle(firstItemByOrder.get(order.id) ?? null, order.code),
      status: order.status,
      statusLabel: publicOrderStatus(order.status),
      total: order.total,
      currency: order.currency,
      updatedAt: order.updatedAt,
    })),
  };
}
