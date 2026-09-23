// Customer-facing wording for orders, payments and their progress.
export const orderStatusLabels: Record<string, string> = {
  NEW: "Nuevo",
  RECEIVED: "Recibido",
  PAYMENT_PENDING: "Pago pendiente",
  PAID: "Pagado",
  PREPARING: "En preparación",
  READY: "Listo para despacho",
  READY_FOR_PICKUP: "Listo para recoger",
  IN_TRANSIT: "En camino",
  SHIPPED: "Enviado por agencia",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const paymentStatusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  UNDER_REVIEW: "En revisión",
  CONFIRMED: "Aprobado",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  CANCELLED: "Anulado",
  REFUNDED: "Reembolsado",
  ERROR: "Con error",
};

export const deliveryMethodLabels: Record<string, string> = {
  PICKUP: "Recojo en tienda",
  DELIVERY: "Delivery en Lima",
  SHIPPING: "Envío a provincia",
};

const flows: Record<string, string[]> = {
  PICKUP: ["PAYMENT_PENDING", "PAID", "PREPARING", "READY_FOR_PICKUP", "DELIVERED"],
  DELIVERY: ["PAYMENT_PENDING", "PAID", "PREPARING", "READY", "IN_TRANSIT", "DELIVERED"],
  SHIPPING: ["PAYMENT_PENDING", "PAID", "PREPARING", "READY", "SHIPPED", "DELIVERED"],
};

export type TimelineStep = { status: string; label: string; state: "done" | "current" | "upcoming"; at: Date | null };

// Steps of the delivery method, filled with the real timestamps from order_status_history.
export function buildOrderTimeline(deliveryMethod: string, currentStatus: string, history: Array<{ toStatus: string; createdAt: Date }>): TimelineStep[] {
  const reachedAt = new Map<string, Date>();
  for (const entry of history) reachedAt.set(entry.toStatus, entry.createdAt);
  const flow = flows[deliveryMethod] ?? flows.PICKUP;
  const currentIndex = flow.indexOf(currentStatus);
  return flow.map((status, index) => ({
    status,
    label: status === "PAYMENT_PENDING" ? "Pedido creado" : orderStatusLabels[status] ?? status,
    state: currentStatus === "CANCELLED" ? (reachedAt.has(status) ? "done" : "upcoming") : index < currentIndex || (index === currentIndex && status === "DELIVERED") ? "done" : index === currentIndex ? "current" : "upcoming",
    at: reachedAt.get(status) ?? null,
  }));
}

export function formatMoney(amount: string | number, currency: string) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency, minimumFractionDigits: 2 }).format(Number(amount));
}

export function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" }).format(value);
}
