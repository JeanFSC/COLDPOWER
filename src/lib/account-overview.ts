import { and, countDistinct, desc, eq, gt, gte, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  customerAddresses,
  customerQuoteLinks,
  customers,
} from "@/db/crm-schema";
import {
  orders,
  payments,
} from "@/db/sales-schema";
import {
  quoteCarts,
  quoteStatusHistory,
  quotes,
  users,
  type QuoteCartItem,
} from "@/db/schema";
import { isStaffRole, type AppRole } from "@/lib/roles";
import {
  accountNonPaymentOrderStatuses,
  accountPendingPaymentStatuses,
  accountQuoteAttentionCondition,
} from "@/lib/account-attention";

export type AccountActivityKind = "quote" | "order" | "payment";

export type AccountActivity = {
  id: string;
  kind: AccountActivityKind;
  label: string;
  reference: string;
  status: string;
  occurredAt: Date;
  href: string;
};

export type AccountProfile = {
  customerId: string | null;
  name: string | null;
  firstName: string | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  primaryAddress: { address: string; location: string | null } | null;
  contactPreference: string | null;
  customerSince: Date | null;
};

export type AccountOverview = {
  profile: AccountProfile;
  access: { canOpenAdmin: boolean; adminHref: string | null };
  billing: { hasCompleteData: boolean };
  counts: {
    quotes: number;
    respondedQuotes: number;
    orders: number;
    payments: number;
    pendingPayments: number;
    quoteCartItems: number;
  };
  recentActivity: AccountActivity[];
};

const companyCustomerTypes = new Set(["COMPANY", "EMPRESA", "DISTRIBUIDOR", "MAYORISTA"]);

function firstName(value: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized.split(/\s+/)[0] : null;
}

function locationLabel(input: {
  district?: string | null;
  province?: string | null;
  department?: string | null;
  country?: string | null;
}) {
  const value = [input.district, input.province, input.department, input.country]
    .map((item) => item?.trim())
    .filter(Boolean)
    .join(", ");
  return value || null;
}

function publicReference(value: string, prefix: "COT" | "PED") {
  const normalized = value.trim();
  const upper = normalized.toUpperCase();
  if (upper.startsWith(`${prefix}-`)) return normalized;
  if (prefix === "PED" && upper.startsWith("ORD-")) return `PED-${normalized.slice(4)}`;
  if (normalized.length <= 32 && !normalized.includes("-")) return `${prefix}-${normalized}`;
  return `${prefix}-${normalized.slice(-8).toUpperCase()}`;
}

export function publicQuoteStatus(value: string | null | undefined) {
  switch (value?.trim().toLowerCase()) {
    case "borrador":
    case "draft":
      return "Borrador";
    case "enviada":
    case "sent":
      return "Enviada";
    case "evaluacion":
    case "in_review":
      return "En evaluación";
    case "requiere_info":
      return "Información requerida";
    case "cotizada":
      return "Cotizada";
    case "aprobada":
    case "accepted":
    case "approved":
      return "Aprobada";
    case "convertida":
    case "converted":
      return "Convertida";
    case "cerrada":
    case "cerrado":
      return "Cerrada";
    case "nuevo":
      return "Nueva";
    case "contactado":
    case "follow_up":
      return "En contacto";
    default:
      return "En seguimiento";
  }
}

export function publicOrderStatus(value: string | null | undefined) {
  switch (value) {
    case "NEW":
      return "Recibido";
    case "RECEIVED":
      return "Recibido";
    case "PAYMENT_PENDING":
      return "Pago pendiente";
    case "PAID":
      return "Pago confirmado";
    case "PREPARING":
      return "En preparación";
    case "READY":
    case "READY_FOR_PICKUP":
      return "Listo para recoger";
    case "IN_TRANSIT":
    case "SHIPPED":
      return "En camino";
    case "DELIVERED":
      return "Entregado";
    case "CANCELLED":
      return "Cancelado";
    default:
      return "En seguimiento";
  }
}

export function publicPaymentStatus(value: string | null | undefined) {
  switch (value) {
    case "PENDING":
      return "Pendiente";
    case "UNDER_REVIEW":
      return "En revisión";
    case "CONFIRMED":
    case "APPROVED":
      return "Confirmado";
    case "REJECTED":
      return "Rechazado";
    case "CANCELLED":
      return "Cancelado";
    case "REFUNDED":
      return "Reembolsado";
    case "ERROR":
      return "No procesado";
    default:
      return "En seguimiento";
  }
}

function countCartItems(items: QuoteCartItem[] | null | undefined) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((total, item) => {
    const quantity = typeof item?.quantity === "number" && Number.isFinite(item.quantity)
      ? Math.max(0, Math.floor(item.quantity))
      : 0;
    return total + quantity;
  }, 0);
}

function adminHref(role: AppRole) {
  if (!isStaffRole(role)) return null;
  if (role === "SUPERADMIN" || role === "GERENCIA" || role === "JEFATURA") return "/admin/dashboard";
  if (role === "REPORTES") return "/admin/reportes";
  return "/admin/operaciones";
}

export function emptyAccountOverview(role: AppRole): AccountOverview {
  return {
    profile: {
      customerId: null,
      name: null,
      firstName: null,
      email: null,
      phone: null,
      companyName: null,
      primaryAddress: null,
      contactPreference: null,
      customerSince: null,
    },
    access: { canOpenAdmin: isStaffRole(role), adminHref: adminHref(role) },
    billing: { hasCompleteData: false },
    counts: { quotes: 0, respondedQuotes: 0, orders: 0, payments: 0, pendingPayments: 0, quoteCartItems: 0 },
    recentActivity: [],
  };
}

export async function getAccountOverview(userId: string, role: AppRole): Promise<AccountOverview> {
  const db = getDb();
  const now = new Date();
  const [account] = await db
    .select({
      userEmail: users.email,
      userName: users.name,
      userPhone: users.phone,
      customerId: customers.id,
      customerName: customers.name,
      customerLegalName: customers.legalName,
      customerType: customers.customerType,
      customerPhone: customers.phone,
      customerEmail: customers.email,
      customerAddress: customers.address,
      customerLocation: customers.location,
      customerDocumentNumber: customers.documentNumber,
      customerRuc: customers.ruc,
      contactPreference: customers.contactPreference,
      customerCreatedAt: customers.createdAt,
    })
    .from(users)
    .leftJoin(customers, eq(customers.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  const addressRows = account?.customerId
    ? await db
        .select({
          address: customerAddresses.address,
          country: customerAddresses.country,
          department: customerAddresses.department,
          province: customerAddresses.province,
          district: customerAddresses.district,
          isPrimary: customerAddresses.isPrimary,
          updatedAt: customerAddresses.updatedAt,
        })
        .from(customerAddresses)
        .where(eq(customerAddresses.customerId, account.customerId))
        .orderBy(desc(customerAddresses.isPrimary), desc(customerAddresses.updatedAt))
        .limit(1)
    : [];

  const quoteOwnership = or(
    eq(quotes.userId, userId),
    eq(customers.userId, userId),
  );
  const orderOwnership = or(
    eq(orders.userId, userId),
    eq(customers.userId, userId),
  );

  const [quoteCountRows, respondedQuoteCountRows, orderCountRows, paymentCountRows, pendingPaymentCountRows, cartRows, quoteHistoryRows, quoteRows, orderRows, paymentRows] = await Promise.all([
    db
      .select({ total: countDistinct(quotes.id) })
      .from(quotes)
      .leftJoin(customerQuoteLinks, eq(customerQuoteLinks.quoteId, quotes.id))
      .leftJoin(customers, eq(customerQuoteLinks.customerId, customers.id))
      .where(quoteOwnership),
    db
      .select({ total: countDistinct(quotes.id) })
      .from(quotes)
      .leftJoin(customerQuoteLinks, eq(customerQuoteLinks.quoteId, quotes.id))
      .leftJoin(customers, eq(customerQuoteLinks.customerId, customers.id))
      .where(and(quoteOwnership, accountQuoteAttentionCondition(now))),
    db
      .select({ total: countDistinct(orders.id) })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(orderOwnership),
    db
      .select({ total: countDistinct(payments.id) })
      .from(payments)
      .innerJoin(orders, eq(payments.orderId, orders.id))
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(orderOwnership),
    db
      .select({ total: countDistinct(payments.id) })
      .from(payments)
      .innerJoin(orders, eq(payments.orderId, orders.id))
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(and(
        orderOwnership,
        inArray(payments.status, accountPendingPaymentStatuses),
        or(
          inArray(orders.status, accountNonPaymentOrderStatuses),
          and(eq(orders.status, "PAYMENT_PENDING"), or(isNull(orders.paymentDueAt), gte(orders.paymentDueAt, now))),
        ),
      )),
    db
      .select({ items: quoteCarts.items })
      .from(quoteCarts)
      .where(and(eq(quoteCarts.userId, userId), gt(quoteCarts.expiresAt, new Date())))
      .orderBy(desc(quoteCarts.updatedAt))
      .limit(1),
    db
      .select({
        id: quoteStatusHistory.id,
        quoteId: quotes.id,
        trackingCode: quotes.trackingCode,
        toStatus: quoteStatusHistory.toStatus,
        createdAt: quoteStatusHistory.createdAt,
      })
      .from(quoteStatusHistory)
      .innerJoin(quotes, eq(quoteStatusHistory.quoteId, quotes.id))
      .leftJoin(customerQuoteLinks, eq(customerQuoteLinks.quoteId, quotes.id))
      .leftJoin(customers, eq(customerQuoteLinks.customerId, customers.id))
      .where(quoteOwnership)
      .orderBy(desc(quoteStatusHistory.createdAt))
      .limit(20),
    db
      .select({
        id: quotes.id,
        trackingCode: quotes.trackingCode,
        status: quotes.workflowStatus,
        createdAt: quotes.createdAt,
        updatedAt: quotes.updatedAt,
      })
      .from(quotes)
      .leftJoin(customerQuoteLinks, eq(customerQuoteLinks.quoteId, quotes.id))
      .leftJoin(customers, eq(customerQuoteLinks.customerId, customers.id))
      .where(quoteOwnership)
      .orderBy(desc(quotes.updatedAt))
      .limit(20),
    db
      .select({
        id: orders.id,
        code: orders.code,
        status: orders.status,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(orderOwnership)
      .orderBy(desc(orders.updatedAt))
      .limit(20),
    db
      .select({
        id: payments.id,
        orderCode: orders.code,
        status: payments.status,
        updatedAt: payments.updatedAt,
      })
      .from(payments)
      .innerJoin(orders, eq(payments.orderId, orders.id))
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(orderOwnership)
      .orderBy(desc(payments.updatedAt))
      .limit(20),
  ]);

  const activities: AccountActivity[] = [];
  const seenHistory = new Set<string>();
  const historyQuoteIds = new Set<string>();

  for (const row of quoteHistoryRows) {
    if (seenHistory.has(row.id)) continue;
    seenHistory.add(row.id);
    historyQuoteIds.add(row.quoteId);
    activities.push({
      id: `quote-history-${row.id}`,
      kind: "quote",
      label: "Cotización actualizada",
      reference: publicReference(row.trackingCode, "COT"),
      status: publicQuoteStatus(row.toStatus),
      occurredAt: row.createdAt,
      href: "/cuenta/cotizaciones",
    });
  }

  for (const row of quoteRows) {
    if (historyQuoteIds.has(row.id)) continue;
    activities.push({
      id: `quote-${row.id}`,
      kind: "quote",
      label: "Cotización creada",
      reference: publicReference(row.trackingCode, "COT"),
      status: publicQuoteStatus(row.status),
      occurredAt: row.createdAt,
      href: "/cuenta/cotizaciones",
    });
  }

  for (const row of orderRows) {
    activities.push({
      id: `order-${row.id}`,
      kind: "order",
      label: "Pedido actualizado",
      reference: publicReference(row.code, "PED"),
      status: publicOrderStatus(row.status),
      occurredAt: row.updatedAt,
      href: `/cuenta/pedidos/${encodeURIComponent(row.code)}`,
    });
  }

  for (const row of paymentRows) {
    activities.push({
      id: `payment-${row.id}`,
      kind: "payment",
      label: "Pago actualizado",
      reference: `PAGO · ${publicReference(row.orderCode, "PED")}`,
      status: publicPaymentStatus(row.status),
      occurredAt: row.updatedAt,
      href: "/cuenta/pagos",
    });
  }

  activities.sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());

  const address = addressRows[0];
  const displayName = account?.userName?.trim() || account?.customerName?.trim() || null;
  const companyName = account?.customerLegalName?.trim() || (
    account?.customerType && companyCustomerTypes.has(account.customerType)
      ? account.customerName?.trim() || null
      : null
  );
  const addressValue = address?.address?.trim() || account?.customerAddress?.trim();
  const billingIdentifier = account?.customerRuc?.trim() || account?.customerDocumentNumber?.trim();

  return {
    profile: {
      customerId: account?.customerId ?? null,
      name: displayName,
      firstName: firstName(account?.userName?.trim() || null),
      email: account?.userEmail ?? null,
      phone: account?.customerPhone?.trim() || account?.userPhone?.trim() || null,
      companyName,
      primaryAddress: addressValue
        ? {
            address: addressValue,
            location: address
              ? locationLabel(address)
              : account?.customerLocation?.trim() || null,
          }
        : null,
      contactPreference: account?.contactPreference?.trim().toLowerCase() || null,
      customerSince: account?.customerCreatedAt ?? null,
    },
    access: { canOpenAdmin: isStaffRole(role), adminHref: adminHref(role) },
    billing: { hasCompleteData: Boolean(billingIdentifier && addressValue) },
    counts: {
      quotes: Number(quoteCountRows[0]?.total ?? 0),
      respondedQuotes: Number(respondedQuoteCountRows[0]?.total ?? 0),
      orders: Number(orderCountRows[0]?.total ?? 0),
      payments: Number(paymentCountRows[0]?.total ?? 0),
      pendingPayments: Number(pendingPaymentCountRows[0]?.total ?? 0),
      quoteCartItems: countCartItems(cartRows[0]?.items),
    },
    recentActivity: activities.slice(0, 5),
  };
}
