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
  // NEW and RECEIVED precede payment: they sit on the first ("Pedido creado") step.
  const effectiveStatus = currentStatus === "NEW" || currentStatus === "RECEIVED" ? flow[0] : currentStatus;
  const currentIndex = flow.indexOf(effectiveStatus);
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

export type OrderGuideTone = "info" | "success" | "warning" | "danger";
export type OrderGuide = { tone: OrderGuideTone; title: string; body: string; facts: Array<[string, string]> };

export type OrderGuideInput = {
  status: string;
  deliveryMethod: string;
  paymentExpired: boolean;
  paymentDueAt: Date | null;
  destination: string;
  location: { name: string | null; address: string | null } | null;
  shipment: { carrier: string | null; trackingNumber: string | null; estimatedDeliveryAt: Date | null } | null;
  nextStepLabel: string | null;
  deliveredAt: Date | null;
};

// "Qué sigue" guidance beside the order progress. Only real order data is surfaced.
export function buildOrderGuide(input: OrderGuideInput): OrderGuide {
  const isPickup = input.deliveryMethod === "PICKUP";
  const next = input.nextStepLabel ? ` Siguiente: ${input.nextStepLabel.toLowerCase()}.` : "";
  const destinationFact: Array<[string, string]> = input.destination ? [[isPickup ? "Recojo en" : "Entrega en", input.destination]] : [];
  const pickupFacts: Array<[string, string]> = [
    ["Local", input.location?.name ?? "Por confirmar"],
    ...(input.location?.address ? [["Dirección", input.location.address] as [string, string]] : []),
  ];
  switch (input.status) {
    case "NEW":
    case "RECEIVED":
      return { tone: "info", title: "Pedido recibido", body: `Estamos confirmando tu pedido; te indicaremos cómo completar el pago.${next}`, facts: destinationFact };
    case "PAYMENT_PENDING":
      return input.paymentExpired
        ? { tone: "danger", title: "El plazo de pago venció", body: "Puedes volver a comprar desde el carrito; el stock reservado se libera automáticamente.", facts: [] }
        : { tone: "warning", title: "Falta confirmar tu pago", body: `Tus productos están reservados mientras completas el pago.${next}`, facts: input.paymentDueAt ? [["Pagar antes de", formatDateTime(input.paymentDueAt)]] : [] };
    case "PAID":
      return { tone: "success", title: "Pago confirmado", body: `Nuestro almacén separará y revisará tus productos.${next} Te avisaremos cuando cambie el estado.`, facts: destinationFact };
    case "PREPARING":
      return { tone: "info", title: "Estamos preparando tu pedido", body: `Verificamos cada producto antes de ${isPickup ? "dejarlo listo para recoger" : "despacharlo"}.${next}`, facts: destinationFact };
    case "READY_FOR_PICKUP":
      return { tone: "success", title: "Tu pedido te espera", body: "Acércate con tu DNI o con el código del pedido. Si recoge otra persona, que muestre el código.", facts: pickupFacts };
    case "READY":
      return isPickup
        ? { tone: "success", title: "Tu pedido te espera", body: "Acércate con tu DNI o con el código del pedido.", facts: pickupFacts }
        : { tone: "info", title: "Listo para despacho", body: `Tu pedido está empacado y saldrá pronto.${next}`, facts: destinationFact };
    case "IN_TRANSIT":
    case "SHIPPED":
      return {
        tone: "info",
        title: "Tu pedido va en camino",
        body: "Puedes seguir cada movimiento del envío más abajo.",
        facts: [
          ...(input.shipment?.carrier ? [["Transportista", input.shipment.carrier] as [string, string]] : []),
          ...(input.shipment?.trackingNumber ? [["Guía", input.shipment.trackingNumber] as [string, string]] : []),
          ...(input.shipment?.estimatedDeliveryAt ? [["Llegada estimada", formatDateTime(input.shipment.estimatedDeliveryAt)] as [string, string]] : []),
        ],
      };
    case "DELIVERED":
      return { tone: "success", title: "Pedido entregado", body: "Gracias por tu compra. Puedes repetir este pedido desde tu historial cuando lo necesites.", facts: input.deliveredAt ? [["Entregado", formatDateTime(input.deliveredAt)]] : [] };
    case "CANCELLED":
      return { tone: "danger", title: "Este pedido fue cancelado", body: "El stock reservado se liberó. Si ya habías pagado, gestionamos la devolución y te contactaremos.", facts: [] };
    default:
      return { tone: "info", title: orderStatusLabels[input.status] ?? "En proceso", body: next.trim(), facts: [] };
  }
}
