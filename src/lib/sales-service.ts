import { and, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { getDb } from "@/db";
import { count, sum } from "drizzle-orm";
import { auditLogs, inventoryBalances, locations, products, productPrices } from "@/db/schema";
import { customers, opportunities, opportunityStageHistory } from "@/db/crm-schema";
import { orderIncidents, orderItems, orderStatusHistory, orders, paymentAttempts, paymentRefunds, payments, paymentStatusHistory, saleItems, sales } from "@/db/sales-schema";
import { consumeInventoryReservationInTransaction, notifyInventoryState, releaseInventoryReservationInTransaction, reserveInventoryBatchInTransaction, type InventoryReservationInput } from "@/lib/inventory";
export { convertQuoteToSale } from "@/lib/quote-conversion-service";
import { canTransitionOrderForDelivery, type CheckoutInput, type ManualPaymentMethod, type OrderStatus } from "@/lib/sales-validation";
import { summarizePaymentLedger } from "@/lib/payments-contract";
import { notifyStaffOnce } from "@/lib/notifications-service";
import { applyPromotionsInTransaction } from "@/lib/promotion-service";

type Actor = { userId: string | null; role?: string | null };
type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
function id(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
function money(value: string | number) { return Number(Number(value).toFixed(2)); }
function audit(actor: Actor, action: string, entityType: string, entityId: string, before: unknown, after: unknown, metadata?: Record<string, unknown>) { return { id: id("audit"), actorId: actor.userId, actorRole: actor.role ?? null, action, entityType, entityId, before: before as Record<string, unknown> | null, after: after as Record<string, unknown> | null, metadata: metadata ?? null }; }

type ResolvedLine = { productId: string; sku: string; name: string; quantity: number; unitPrice: string; currency: string; lineTotal: string };
type CommercialLine = ResolvedLine & { baseLineTotal: string; discountAmount: string; promotionIds: string[] };
async function resolveLines(tx: Transaction, input: CheckoutInput) {
  const quantities = new Map<string, number>();
  for (const item of input.items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  const productRows = await tx.select({ id: products.id, sku: products.sku, name: products.commercialName, normalizedName: products.normalizedName }).from(products).where(inArray(products.id, [...quantities.keys()]))
  if (productRows.length !== quantities.size) throw new Error("Uno o más productos ya no están disponibles en el catálogo.");
  const now = new Date();
  const prices = await tx.select().from(productPrices).where(and(inArray(productPrices.productId, [...quantities.keys()]), eq(productPrices.priceType, "RETAIL"), eq(productPrices.active, true), lte(productPrices.validFrom, now), or(isNull(productPrices.validUntil), gt(productPrices.validUntil, now)))).orderBy(desc(productPrices.validFrom));
  const priceByProduct = new Map<string, typeof prices[number]>();
  for (const price of prices) if (!priceByProduct.has(price.productId)) priceByProduct.set(price.productId, price);
  const lines: ResolvedLine[] = [];
  for (const product of productRows) {
    const price = priceByProduct.get(product.id);
    if (!price) throw new Error(`El producto ${product.sku} todavía no tiene precio retail vigente; continúa como cotizable.`);
    const quantity = quantities.get(product.id) ?? 0;
    const unitPrice = Number(price.amount).toFixed(2);
    lines.push({ productId: product.id, sku: product.sku, name: product.name || product.normalizedName, quantity, unitPrice, currency: price.currency, lineTotal: (money(unitPrice) * quantity).toFixed(2) });
  }
  const currencies = new Set(lines.map((line) => line.currency));
  if (currencies.size !== 1) throw new Error("No se puede crear un pedido con monedas mezcladas.");
  return lines;
}

async function applyCheckoutPromotions(tx: Transaction, lines: ResolvedLine[], idempotencyKey: string): Promise<CommercialLine[]> {
  return Promise.all(lines.map(async (line) => {
    const applied = await applyPromotionsInTransaction(tx, { productId: line.productId, baseUnitPrice: line.unitPrice, contextType: "checkout", contextId: idempotencyKey, idempotencyKey: idempotencyKey + ":" + line.productId });
    return { ...line, baseLineTotal: line.lineTotal, unitPrice: applied.finalUnitPrice, discountAmount: applied.discountAmount, promotionIds: applied.promotionIds, lineTotal: (money(applied.finalUnitPrice) * line.quantity).toFixed(2) };
  }));
}

async function findOrCreateCustomer(tx: Transaction, input: CheckoutInput, actor: Actor, existingCustomerId?: string) {
  if (existingCustomerId) {
    const [customer] = await tx.select().from(customers).where(eq(customers.id, existingCustomerId)).for("update").limit(1);
    if (!customer) throw new Error("El cliente seleccionado no existe.");
    return customer;
  }
  const conditions = [input.email ? eq(customers.email, input.email) : undefined, eq(customers.phone, input.phone)].filter(Boolean) as NonNullable<ReturnType<typeof eq>>[];
  const [existing] = conditions.length ? await tx.select().from(customers).where(or(...conditions)).limit(1) : [];
  if (existing) {
    const [updated] = await tx.update(customers).set({ name: input.name, email: existing.email ?? input.email, phone: existing.phone ?? input.phone, whatsapp: existing.whatsapp ?? input.phone, address: input.address ?? existing.address, status: "ACTIVE", updatedAt: new Date() }).where(eq(customers.id, existing.id)).returning();
    return updated;
  }
  const [created] = await tx.insert(customers).values({ id: id("customer"), userId: actor.userId, name: input.name, phone: input.phone, whatsapp: input.phone, email: input.email, address: input.address, customerType: "CONSUMIDOR", status: "ACTIVE" }).returning();
  return created;
}

export async function createCheckoutOrder(input: CheckoutInput, actor: Actor, options: { customerId?: string; channel?: string | null; origin?: "WEB" | "WHATSAPP" | "TELEFONO" | "LOCAL" | "REFERIDO" | "CLIENTE_RECURRENTE" | "OTRO" } = {}) {
  const result = await getDb().transaction(async (tx) => {
    const [existing] = await tx.select().from(orders).where(eq(orders.idempotencyKey, input.idempotencyKey)).limit(1);
    if (existing) return { order: existing, idempotent: true, reservations: [] };
    const [location] = await tx.select().from(locations).where(and(eq(locations.id, input.locationId), eq(locations.active, true))).limit(1);
  if (!location) throw new Error("El local seleccionado no está activo o no existe.");
    const baseLines = await resolveLines(tx, input);
    const lines = await applyCheckoutPromotions(tx, baseLines, input.idempotencyKey);
    const balances = await tx.select({ productId: inventoryBalances.productId, available: inventoryBalances.onHand, reserved: inventoryBalances.reserved }).from(inventoryBalances).where(and(eq(inventoryBalances.locationId, input.locationId), inArray(inventoryBalances.productId, lines.map((line) => line.productId)))).for("update");
    const balanceByProduct = new Map(balances.map((balance) => [balance.productId, balance]));
    for (const line of lines) { const balance = balanceByProduct.get(line.productId); if (!balance) throw new Error(`INVENTORY_UNKNOWN: No hay saldo cuantitativo confirmado para ${line.sku} en ${location.name}.`); const available = balance.available - balance.reserved; if (available < line.quantity) throw new Error(`Stock insuficiente para ${line.sku} en ${location.name}.`); }
    const customer = await findOrCreateCustomer(tx, input, actor, options.customerId);
    const now = new Date(); const orderId = id("order"); const saleId = id("sale"); const code = `ORD-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`; const saleCode = `VTA-${crypto.randomUUID().slice(0, 10).toUpperCase()}`;
    const subtotal = lines.reduce((sum, line) => sum + money(line.baseLineTotal), 0).toFixed(2); const discountAmount = lines.reduce((sum, line) => sum + money(line.discountAmount) * line.quantity, 0).toFixed(2); const total = Math.max(0, money(subtotal) - money(discountAmount)).toFixed(2); const currency = lines[0].currency;
    const [opportunity] = await tx.insert(opportunities).values({ id: id("opportunity"), code: `OP-${code}`, customerId: customer.id, title: `Pedido ${code}`, origin: options.origin ?? "WEB", stage: "PAYMENT_PENDING", createdBy: actor.userId }).returning();
    await tx.insert(opportunityStageHistory).values({ id: id("opportunity-stage"), opportunityId: opportunity.id, fromStage: null, toStage: "PAYMENT_PENDING", changedBy: actor.userId ?? "anonymous", note: "Oportunidad creada desde checkout" });
    const [sale] = await tx.insert(sales).values({ id: saleId, code: saleCode, customerId: customer.id, opportunityId: opportunity.id, status: "CONFIRMED", sellerId: actor.userId, channel: options.channel ?? null, subtotal, discountAmount, total, currency, createdAt: now, updatedAt: now }).returning();
    await tx.insert(saleItems).values(lines.map((line) => ({ id: id("sale-item"), saleId, productId: line.productId, skuSnapshot: line.sku, productNameSnapshot: line.name, quantity: line.quantity, unitPrice: line.unitPrice, currency: line.currency, discountAmount: (money(line.discountAmount) * line.quantity).toFixed(2), lineTotal: line.lineTotal })));
    const [order] = await tx.insert(orders).values({ id: orderId, code, saleId, customerId: customer.id, opportunityId: opportunity.id, status: "PAYMENT_PENDING", deliveryMethod: input.deliveryMethod, locationId: input.locationId, deliveryAddress: input.address, customerNameSnapshot: input.name, customerPhoneSnapshot: input.phone, customerEmailSnapshot: input.email, sellerId: actor.userId, subtotal, discountAmount, total, currency, idempotencyKey: input.idempotencyKey, createdAt: now, updatedAt: now }).returning();
    const reservationInputs: InventoryReservationInput[] = lines.map((line) => ({ productId: line.productId, locationId: input.locationId, quantity: line.quantity, performedBy: actor.userId ?? undefined, performedByRole: actor.role ?? undefined, referenceType: "order", referenceId: orderId }));
    const reservations = await reserveInventoryBatchInTransaction(tx, reservationInputs);
    await tx.insert(orderItems).values(lines.map((line) => ({ id: id("order-item"), orderId, productId: line.productId, skuSnapshot: line.sku, productNameSnapshot: line.name, quantity: line.quantity, unitPrice: line.unitPrice, currency: line.currency, lineTotal: line.lineTotal, reservationId: reservations.find((reservation) => reservation.productId === line.productId)?.reservationId ?? null })));
    await tx.insert(payments).values({ id: id("payment"), orderId, methodType: "PROVIDER", method: "UNCONFIGURED", provider: null, providerReference: null, amount: total, currency, status: "PENDING", metadata: { reason: "provider_not_configured" }, createdBy: actor.userId });
    await tx.insert(orderStatusHistory).values({ id: id("order-status"), orderId, fromStatus: null, toStatus: "PAYMENT_PENDING", changedBy: actor.userId, note: "Pedido creado; pago pendiente de proveedor configurado" });
    await tx.insert(auditLogs).values(audit(actor, "sales.checkout_order_created", "order", orderId, null, order, { saleId, opportunityId: opportunity.id, reservationCount: reservations.length }));
    return { order, sale, opportunity, reservations, idempotent: false };
  });
  if (!result.idempotent) {
    for (const reservation of result.reservations) {
      try { await notifyInventoryState(reservation.productId, reservation.locationId); } catch (error) { console.error("ColdPower: no se pudo notificar el stock reservado", error); }
    }
  }
  if (!result.idempotent && result.sale) { try { await notifyStaffOnce({ type: "ORDER_CREATED", title: "Nuevo pedido pendiente de pago", body: `El pedido ${result.order.code} requiere revisión de pago.`, link: "/admin/pedidos", metadata: { orderId: result.order.id, status: result.order.status }, dedupeKey: `order:${result.order.id}:created` }); await notifyStaffOnce({ type: "SALE_CREATED", title: "Nueva venta registrada", body: `La venta ${result.sale.code} fue registrada desde el checkout.`, link: "/admin/ventas", metadata: { saleId: result.sale.id, orderId: result.order.id }, dedupeKey: `sale:${result.sale.id}:created` }); } catch (error) { console.error("ColdPower: no se pudo notificar el nuevo pedido o venta", error); } }
  return result;
}

export async function createDirectSale(input: { customerId: string; locationId: string; items: Array<{ productId: string; quantity: number }>; deliveryMethod: "PICKUP" | "DELIVERY" | "SHIPPING"; address?: string | null; idempotencyKey: string; channel?: string | null }, actor: Actor) {
  const [customer] = await getDb().select().from(customers).where(eq(customers.id, input.customerId)).limit(1);
  if (!customer) throw new Error("El cliente seleccionado no existe.");
  if (!customer.phone?.trim()) throw new Error("El cliente seleccionado necesita teléfono para registrar una venta directa.");
  if (!input.idempotencyKey || !/^[A-Za-z0-9:_-]{12,180}$/.test(input.idempotencyKey)) throw new Error("La clave de idempotencia de la venta no es válida.");
  if (!Array.isArray(input.items) || !input.items.length || input.items.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999)) throw new Error("Los productos de la venta directa son inválidos.");
  return createCheckoutOrder({
    items: input.items,
    locationId: input.locationId,
    deliveryMethod: input.deliveryMethod,
    address: input.address?.trim().slice(0, 300) || customer.address || null,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    idempotencyKey: input.idempotencyKey,
  }, actor, { customerId: customer.id, channel: input.channel?.trim().slice(0, 80) || "DIRECT", origin: "LOCAL" });
}
export async function listOrders() { return getDb().select().from(orders).orderBy(desc(orders.createdAt)).limit(500); }
export async function listOrdersPage(requestedPage = 1, requestedPageSize = 25) {
  const pageSize = Math.min(100, Math.max(1, Math.floor(requestedPageSize)));
  const page = Math.max(1, Math.floor(requestedPage));
  const [rows, [{ total }]] = await Promise.all([
    getDb().select().from(orders).orderBy(desc(orders.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    getDb().select({ total: count() }).from(orders),
  ]);
  const totalItems = Number(total ?? 0);
  return { rows, page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))), pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) };
}
export async function listOrdersForUser(userId: string) { return getDb().select({ order: orders, payment: payments }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).leftJoin(payments, eq(payments.orderId, orders.id)).where(eq(customers.userId, userId)).orderBy(desc(orders.createdAt)).limit(200); }

export async function changeOrderStatus(orderId: string, nextStatus: OrderStatus, actor: Actor, reason?: string, options: { expectedVersion?: number; receivedBy?: string | null; idempotencyKey?: string | null } = {}) {
  const after = await getDb().transaction(async (tx) => {
    const [before] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update").limit(1);
    if (!before) throw new Error("Pedido no encontrado.");
    if (options.idempotencyKey) {
      const [previous] = await tx.select().from(orderStatusHistory).where(eq(orderStatusHistory.idempotencyKey, options.idempotencyKey)).limit(1);
      if (previous) {
        if (previous.orderId !== orderId || previous.toStatus !== nextStatus || (previous.note ?? "") !== (reason?.trim() ?? "")) throw new Error("ORDER_IDEMPOTENCY_CONFLICT");
        return before;
      }
    }
    if (options.expectedVersion !== undefined && before.version !== options.expectedVersion) throw new Error("ORDER_VERSION_CONFLICT");
    if (nextStatus === "CANCELLED" && !reason?.trim()) throw new Error("CANCELLATION_REASON_REQUIRED");
    if (!canTransitionOrderForDelivery(before.status, nextStatus, before.deliveryMethod)) throw new Error(`Transición no permitida para ${before.deliveryMethod}: ${before.status} → ${nextStatus}.`);
    if (before.status === nextStatus) return before;
    if (nextStatus === "READY" || nextStatus === "READY_FOR_PICKUP") {
      const lines = await tx.select({ quantity: orderItems.quantity, pickedQuantity: orderItems.pickedQuantity }).from(orderItems).where(eq(orderItems.orderId, orderId)).for("update");
      if (!lines.length || lines.some((line) => line.pickedQuantity !== line.quantity)) throw new Error("ORDER_PICKING_INCOMPLETE");
      const [blocker] = await tx.select({ id: orderIncidents.id }).from(orderIncidents).where(and(eq(orderIncidents.orderId, orderId), eq(orderIncidents.status, "OPEN"), eq(orderIncidents.blocker, true))).limit(1);
      if (blocker) throw new Error("ORDER_BLOCKED_BY_INCIDENT");
    }
    if (nextStatus === "CANCELLED") {
      const [confirmed] = await tx.select({ id: payments.id }).from(payments).where(and(eq(payments.orderId, orderId), or(eq(payments.status, "CONFIRMED"), eq(payments.status, "APPROVED")))).limit(1);
      if (confirmed) throw new Error("ORDER_PAID_CANCELLATION_REQUIRES_REFUND");
    }
    if (nextStatus === "CANCELLED" || nextStatus === "DELIVERED") {
      const lines = await tx.select({ reservationId: orderItems.reservationId }).from(orderItems).where(eq(orderItems.orderId, orderId));
      for (const line of lines) if (line.reservationId) {
        if (nextStatus === "CANCELLED") await releaseInventoryReservationInTransaction(tx, line.reservationId, actor.userId ?? undefined, actor.role ?? undefined);
        else await consumeInventoryReservationInTransaction(tx, line.reservationId, actor.userId ?? undefined, actor.role ?? undefined);
      }
    }
    const now = new Date();
    const [updated] = await tx.update(orders).set({ status: nextStatus, cancellationReason: nextStatus === "CANCELLED" ? reason?.trim() ?? null : before.cancellationReason, cancelledBy: nextStatus === "CANCELLED" ? actor.userId : before.cancelledBy, cancelledAt: nextStatus === "CANCELLED" ? now : before.cancelledAt, deliveredAt: nextStatus === "DELIVERED" ? now : before.deliveredAt, receivedBy: nextStatus === "DELIVERED" ? options.receivedBy?.trim().slice(0, 160) || before.receivedBy : before.receivedBy, version: before.version + 1, updatedAt: now }).where(eq(orders.id, orderId)).returning();
    await tx.insert(orderStatusHistory).values({ id: id("order-status"), orderId, fromStatus: before.status, toStatus: nextStatus, changedBy: actor.userId, note: reason?.trim() || null, idempotencyKey: options.idempotencyKey ?? null });
    await tx.insert(auditLogs).values(audit(actor, "sales.order_status_changed", "order", orderId, before, updated, reason ? { reason: reason.trim() } : undefined));
    return updated;
  });
  if (nextStatus === "READY_FOR_PICKUP") {
    try { await notifyStaffOnce({ type: "ORDER_READY", title: "Pedido listo", body: `El pedido ${after.code} está listo para recoger.`, link: "/admin/pedidos", metadata: { orderId: after.id, status: after.status }, dedupeKey: `order:${after.id}:ready` }); }
    catch (error) { console.error("ColdPower: no se pudo notificar el pedido listo", error); }
  }
  return after;
}
export async function registerManualPayment(input: { orderId: string; method: ManualPaymentMethod; amount: string; currency: string; reference: string | null; reason: string; idempotencyKey?: string }, actor: Actor) {
  const result = await getDb().transaction(async (tx) => {
    const idempotencyKey = input.idempotencyKey ?? `manual-${input.orderId}-${input.reference ?? input.amount}`;
    const [existingPaymentByKey] = await tx.select().from(payments).where(eq(payments.idempotencyKey, idempotencyKey)).limit(1);
    const [existingAttempt] = existingPaymentByKey ? [] : await tx.select().from(paymentAttempts).where(eq(paymentAttempts.idempotencyKey, idempotencyKey)).limit(1);
    if (existingPaymentByKey || existingAttempt) {
      const [existingPayment] = existingPaymentByKey ? [existingPaymentByKey] : await tx.select().from(payments).where(eq(payments.id, existingAttempt!.paymentId)).limit(1);
      const [existingOrder] = existingPayment ? await tx.select().from(orders).where(eq(orders.id, existingPayment.orderId)).limit(1) : [];
      if (!existingPayment || !existingOrder || existingOrder.id !== input.orderId || money(existingPayment.amount) !== money(input.amount) || existingPayment.currency !== input.currency) throw new Error("PAYMENT_IDEMPOTENCY_CONFLICT");
      return { payment: existingPayment, order: existingOrder, idempotent: true };
    }
    const [order] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).for("update").limit(1);
    if (!order) throw new Error("Pedido no encontrado.");
    if (order.currency !== input.currency) throw new Error("La moneda del pago no coincide con la moneda del pedido.");
    if (["CANCELLED", "DELIVERED"].includes(order.status)) throw new Error("El pedido no admite pagos en su estado actual.");
    const [payment] = await tx.insert(payments).values({ id: id("payment"), orderId: order.id, methodType: "MANUAL", method: input.method, provider: null, providerReference: input.reference, idempotencyKey, amount: input.amount, currency: input.currency, status: "CONFIRMED", metadata: input.reference ? { reference: input.reference, reason: input.reason } : { reason: input.reason }, createdBy: actor.userId }).returning();
    await tx.insert(paymentAttempts).values({ id: id("payment-attempt"), paymentId: payment.id, provider: null, providerReference: input.reference, status: "CONFIRMED", amount: input.amount, currency: input.currency, idempotencyKey });
    await tx.insert(paymentStatusHistory).values({ id: id("payment-status"), paymentId: payment.id, fromStatus: null, toStatus: "CONFIRMED", changedBy: actor.userId, actorRole: actor.role ?? null, reason: input.reason });
    const [confirmedRows, refundedRows] = await Promise.all([
      tx.select({ total: sum(payments.amount) }).from(payments).where(and(eq(payments.orderId, order.id), eq(payments.currency, order.currency), or(eq(payments.status, "CONFIRMED"), eq(payments.status, "APPROVED")))),
      tx.select({ total: sum(paymentRefunds.amount) }).from(paymentRefunds).innerJoin(payments, eq(paymentRefunds.paymentId, payments.id)).where(and(eq(payments.orderId, order.id), eq(payments.currency, order.currency), eq(paymentRefunds.currency, order.currency), eq(paymentRefunds.status, "SUCCEEDED"))),
    ]);
    const netReceived = summarizePaymentLedger(order.total, [{ amount: confirmedRows[0]?.total ?? 0, status: "CONFIRMED" }], [{ amount: refundedRows[0]?.total ?? 0, status: "SUCCEEDED" }]).net;
    const shouldAdvance = netReceived + 0.005 >= money(order.total) && order.status === "PAYMENT_PENDING";
    const [updated] = shouldAdvance ? await tx.update(orders).set({ status: "PAID", version: order.version + 1, updatedAt: new Date() }).where(eq(orders.id, order.id)).returning() : [order];
    if (shouldAdvance) await tx.insert(orderStatusHistory).values({ id: id("order-status"), orderId: order.id, fromStatus: order.status, toStatus: "PAID", changedBy: actor.userId, note: `Cobro neto completado con pago manual ${input.method}` });
    await tx.insert(auditLogs).values(audit(actor, "payments.manual_confirmed", "payment", payment.id, null, payment, { orderId: order.id, reason: input.reason, expected: order.total, netReceived: netReceived.toFixed(2), difference: (netReceived - money(order.total)).toFixed(2) }));
    return { payment, order: updated, idempotent: false };
  });
  if (!result.idempotent) try { await notifyStaffOnce({ type: "PAYMENT_APPROVED", title: "Pago aprobado", body: `El pago manual del pedido ${result.order.code} fue confirmado.`, link: "/admin/pedidos", metadata: { orderId: result.order.id, paymentId: result.payment.id, method: "MANUAL" }, dedupeKey: `payment:${result.payment.id}:approved` }); }
  catch (error) { console.error("ColdPower: no se pudo notificar el pago manual", error); }
  return result;
}



