export const deliveryMethods = ["PICKUP", "DELIVERY", "SHIPPING"] as const;
export type DeliveryMethod = (typeof deliveryMethods)[number];
export const orderStatuses = ["NEW", "RECEIVED", "PAYMENT_PENDING", "PAID", "PREPARING", "READY", "READY_FOR_PICKUP", "IN_TRANSIT", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export const paymentStatuses = ["PENDING", "UNDER_REVIEW", "CONFIRMED", "APPROVED", "REJECTED", "CANCELLED", "REFUNDED", "ERROR"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];
export const manualPaymentMethods = ["TRANSFER", "CASH", "DEPOSIT"] as const;
export type ManualPaymentMethod = (typeof manualPaymentMethods)[number];
type CheckoutItem = { productId: string; quantity: number };
export type CheckoutInput = { items: CheckoutItem[]; deliveryMethod: DeliveryMethod; locationId: string; name: string; phone: string; email: string | null; address: string | null; idempotencyKey: string };
const orderTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  NEW: ["RECEIVED", "PAYMENT_PENDING", "CANCELLED"],
  RECEIVED: ["PAYMENT_PENDING", "PREPARING", "CANCELLED"],
  PAYMENT_PENDING: ["PAID", "CANCELLED"],
  PAID: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "READY_FOR_PICKUP", "CANCELLED"],
  READY: ["IN_TRANSIT", "SHIPPED", "DELIVERED", "CANCELLED"],
  READY_FOR_PICKUP: ["DELIVERED", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};
export function canTransitionOrder(from: OrderStatus, to: OrderStatus) { return from === to || orderTransitions[from].includes(to); }
export function canTransitionOrderForDelivery(from: OrderStatus, to: OrderStatus, deliveryMethod: DeliveryMethod) {
  if (!canTransitionOrder(from, to)) return false;
  if (from === "PREPARING" && to === "READY_FOR_PICKUP") return deliveryMethod === "PICKUP";
  if (from === "PREPARING" && to === "READY") return deliveryMethod !== "PICKUP";
  if (from === "READY" && to === "IN_TRANSIT") return deliveryMethod === "DELIVERY";
  if (from === "READY" && to === "SHIPPED") return deliveryMethod === "SHIPPING";
  if (from === "READY" && to === "DELIVERED") return false;
  return true;
}
export function isValidPickedQuantity(pickedQuantity: number, requestedQuantity: number) {
  return Number.isInteger(requestedQuantity) && requestedQuantity > 0 && Number.isInteger(pickedQuantity) && pickedQuantity >= 0 && pickedQuantity <= requestedQuantity;
}
function text(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
export function validateCheckoutInput(input: unknown): CheckoutInput {
  if (!input || typeof input !== "object") throw new Error("El checkout debe enviarse como objeto.");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => ["unitPrice", "price", "total", "currency"].includes(key))) throw new Error("El precio del checkout se calcula en el servidor.");
  if (!Array.isArray(value.items) || value.items.length === 0 || value.items.length > 100) throw new Error("Debes indicar al menos un producto.");
  const items = value.items.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Producto de checkout inválido.");
    const row = item as Record<string, unknown>; const productId = text(row.productId, 160); const quantity = Number(row.quantity);
    if (!productId) throw new Error("Cada producto necesita su identificador.");
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 999) throw new Error("La cantidad del producto debe ser un entero positivo.");
    if (Object.keys(row).some((key) => ["unitPrice", "price", "total", "currency"].includes(key))) throw new Error("El precio del checkout se calcula en el servidor.");
    return { productId, quantity };
  });
  const deliveryMethod = text(value.deliveryMethod, 30);
  if (!(deliveryMethods as readonly string[]).includes(deliveryMethod)) throw new Error("Método de entrega inválido.");
  const locationId = text(value.locationId, 160); const name = text(value.name, 160); const phone = text(value.phone, 40);
  const email = text(value.email, 180).toLowerCase() || null; const address = text(value.address, 300) || null; const idempotencyKey = text(value.idempotencyKey, 180);
  if (!locationId) throw new Error("Debes seleccionar un local con stock confirmado.");
  if (!name || !phone) throw new Error("Nombre y teléfono son obligatorios.");
  if (deliveryMethod !== "PICKUP" && !address) throw new Error("La dirección es obligatoria para la entrega.");
  if (!idempotencyKey || !/^[A-Za-z0-9:_-]{12,180}$/.test(idempotencyKey)) throw new Error("La clave de checkout no es válida.");
  return { items, deliveryMethod: deliveryMethod as DeliveryMethod, locationId, name, phone, email, address, idempotencyKey };
}
export function validateManualPaymentInput(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("El pago debe enviarse como objeto.");
  const value = input as Record<string, unknown>; const orderId = text(value.orderId, 160); const method = text(value.method, 30); const amount = Number(value.amount); const currency = text(value.currency, 3).toUpperCase(); const reference = text(value.reference, 180) || null; const reason = text(value.reason, 500);
  if (!orderId) throw new Error("El pago necesita un pedido.");
  if (!(manualPaymentMethods as readonly string[]).includes(method)) throw new Error("Método de pago manual no confirmado.");
  if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) throw new Error("El monto debe ser mayor que cero y tener como máximo dos decimales.");
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("La moneda debe ser ISO de tres letras.");
  if ((method === "TRANSFER" || method === "DEPOSIT") && !reference) throw new Error("La referencia es obligatoria para transferencias y depósitos.");
  if (!reason) throw new Error("El motivo de confirmación manual es obligatorio.");
  return { orderId, method: method as ManualPaymentMethod, amount: amount.toFixed(2), currency, reference, reason };
}
export type CartCheckoutDetails = { district?: string; province?: string; department?: string; reference?: string; agencyName?: string; recipientName?: string; recipientDocument?: string };
export type CartCheckoutRequest = { deliveryMethod: DeliveryMethod; locationId: string; name: string; phone: string; email: string | null; address: string | null; deliveryDetails: CartCheckoutDetails | null };
// Online checkout from the purchase cart: the items and their prices come only from the
// server-side cart, so any client-sent items/prices/keys are refused outright.
export function validateCartCheckoutInput(input: unknown): CartCheckoutRequest {
  if (!input || typeof input !== "object") throw new Error("El checkout debe enviarse como objeto.");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => ["items", "unitPrice", "price", "total", "currency", "idempotencyKey"].includes(key))) throw new Error("Los productos, precios y totales se toman de tu carrito en el servidor.");
  const deliveryMethod = text(value.deliveryMethod, 30);
  if (!(deliveryMethods as readonly string[]).includes(deliveryMethod)) throw new Error("Método de entrega inválido.");
  const locationId = text(value.locationId, 160); const name = text(value.name, 160); const phone = text(value.phone, 40);
  const email = text(value.email, 180).toLowerCase() || null; const address = text(value.address, 300) || null;
  if (!locationId) throw new Error("Selecciona el local de recojo o despacho.");
  if (!name || !phone) throw new Error("Nombre y teléfono son obligatorios.");
  if (!/^[+\d][\d\s-]{6,19}$/.test(phone)) throw new Error("El teléfono no es válido.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("El correo no es válido.");
  const raw = value.deliveryDetails && typeof value.deliveryDetails === "object" ? value.deliveryDetails as Record<string, unknown> : {};
  const details: CartCheckoutDetails = {};
  for (const key of ["district", "province", "department", "reference", "agencyName", "recipientName", "recipientDocument"] as const) { const field = text(raw[key], 160); if (field) details[key] = field; }
  if (deliveryMethod === "DELIVERY") {
    if (!address) throw new Error("La dirección de entrega es obligatoria.");
    if (!details.district) throw new Error("Indica el distrito de entrega en Lima.");
    details.department = "Lima";
  }
  if (deliveryMethod === "SHIPPING") {
    if (!details.department || !details.province) throw new Error("Indica el departamento y la provincia de destino.");
    if (!details.agencyName) throw new Error("Indica la agencia de transporte de destino.");
    if (!details.recipientName || !details.recipientDocument) throw new Error("Indica el nombre y DNI de quien recoge en la agencia.");
  }
  return { deliveryMethod: deliveryMethod as DeliveryMethod, locationId, name, phone, email, address: deliveryMethod === "PICKUP" ? null : address, deliveryDetails: deliveryMethod === "PICKUP" ? null : details };
}
