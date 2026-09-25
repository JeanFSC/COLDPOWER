import { and, count, eq, inArray, like, or, sql, sum } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, inventoryReservations } from "@/db/schema";
import { customers } from "@/db/crm-schema";
import { orderStatusHistory, orders, paymentAttempts, paymentEvents, paymentRefunds, payments, paymentStatusHistory } from "@/db/sales-schema";
import { getPaymentProvider, type PaymentCreateResult, type PaymentRefundResult } from "@/lib/payments";
import { canTransitionPayment, normalizeProviderStatus, summarizePaymentLedger } from "@/lib/payments-contract";
import { sanitizeAuditValue } from "@/lib/operational-semantics";
import { notifyStaffOnce } from "@/lib/notifications-service";

type Actor = { userId: string | null; role?: string | null };
function id(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
function amount(value: string | number) { return Number(Number(value).toFixed(2)); }
function audit(actor: Actor | null, action: string, entityId: string, before: unknown, after: unknown, metadata?: Record<string, unknown>) { return { id: id("audit"), actorId: actor?.userId ?? null, actorRole: actor?.role ?? null, action, entityType: "payment", entityId, before: sanitizeAuditValue(before) as Record<string, unknown> | null, after: sanitizeAuditValue(after) as Record<string, unknown> | null, metadata: metadata ?? null }; }

export class PaymentDomainError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); this.name = "PaymentDomainError"; }
}

// A new provider attempt may only replace a payment that never succeeded.
const retryablePaymentStatuses = ["PENDING", "REJECTED", "CANCELLED", "ERROR"] as const as readonly string[];
const receivedPaymentStatuses = ["CONFIRMED", "APPROVED"] as const;
const lateApprovalRefundReason = "Aprobación posterior: requiere reembolso";
type PaymentTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

function isReceivedPaymentStatus(status: string) {
  return (receivedPaymentStatuses as readonly string[]).includes(status);
}

async function summarizeOrderPaymentLedger(
  tx: PaymentTransaction,
  order: { id: string; total: string; currency: string },
  excludedPaymentId?: string,
) {
  const paymentWhere = excludedPaymentId
    ? and(eq(payments.orderId, order.id), eq(payments.currency, order.currency), sql`${payments.id} <> ${excludedPaymentId}`)
    : and(eq(payments.orderId, order.id), eq(payments.currency, order.currency));
  const refundWhere = excludedPaymentId
    ? and(eq(payments.orderId, order.id), eq(payments.currency, order.currency), eq(paymentRefunds.currency, order.currency), sql`${payments.id} <> ${excludedPaymentId}`)
    : and(eq(payments.orderId, order.id), eq(payments.currency, order.currency), eq(paymentRefunds.currency, order.currency));
  const [paymentRows, refundRows] = await Promise.all([
    tx.select({ amount: payments.amount, status: payments.status }).from(payments).where(paymentWhere),
    tx.select({ amount: paymentRefunds.amount, status: paymentRefunds.status }).from(paymentRefunds).innerJoin(payments, eq(paymentRefunds.paymentId, payments.id)).where(and(refundWhere, eq(paymentRefunds.status, "SUCCEEDED"))),
  ]);
  return summarizePaymentLedger(order.total, paymentRows, refundRows);
}

async function confirmationDisposition(
  tx: PaymentTransaction,
  payment: { id: string; status: string; amount: string; currency: string; orderId: string },
  order: { id: string; code: string; status: string; total: string; currency: string },
) {
  if (isReceivedPaymentStatus(payment.status)) {
    return { entersConfirmed: false, refundRequired: false, overpaidAmount: 0, refundAmount: 0, previousLedger: null };
  }
  const previousLedger = await summarizeOrderPaymentLedger(tx, order, payment.id);
  const expected = amount(order.total);
  const previousCovered = previousLedger.net + 0.005 >= expected;
  const overpaidAmount = previousCovered ? 0 : amount(Math.max(0, previousLedger.net + amount(payment.amount) - expected));
  const refundRequired = order.status !== "PAYMENT_PENDING" || previousCovered || overpaidAmount > 0.005;
  const refundAmount = refundRequired ? (order.status !== "PAYMENT_PENDING" || previousCovered ? amount(payment.amount) : overpaidAmount) : 0;
  return { entersConfirmed: true, refundRequired, overpaidAmount, refundAmount, previousLedger };
}

function lateApprovalMetadata(base: Record<string, unknown> | null, orderCode: string, overpaidAmount: number) {
  return {
    ...(base ?? {}),
    requiresRefund: true,
    lateApproval: true,
    lateApprovalOrderCode: orderCode,
    ...(overpaidAmount > 0.005 ? { overpaidAmount } : {}),
  };
}

function storedCheckoutUrl(payment: { status: string; metadata: Record<string, unknown> | null }) {
  const url = payment.metadata?.checkoutUrl;
  return payment.status === "PENDING" && typeof url === "string" ? url : null;
}

// Starts (or resumes) the provider payment for the signed-in owner of an online order.
// A still-pending attempt returns its existing checkout URL; after a rejection a fresh
// attempt is created, until the order's payment deadline passes.
export async function startPaymentForOrder(orderCode: string, userId: string, returnUrl?: string) {
  const db = getDb();
  const [row] = await db.select({ order: orders }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(and(eq(orders.code, orderCode), or(eq(orders.userId, userId), eq(customers.userId, userId)))).limit(1);
  if (!row) throw new PaymentDomainError("ORDER_NOT_FOUND", "Pedido no encontrado.", 404);
  const order = row.order;
  if (order.status !== "PAYMENT_PENDING") throw new PaymentDomainError("PAYMENT_NOT_ALLOWED", "Este pedido ya no está pendiente de pago.", 409);
  const [current] = await db.select().from(payments).where(eq(payments.orderId, order.id)).limit(1);
  const resumable = current ? storedCheckoutUrl(current) : null;
  if (current && resumable && current.provider) return { payment: current, checkoutUrl: resumable, idempotent: true, orderCode: order.code };
  const [{ attempts }] = await db.select({ attempts: count() }).from(paymentAttempts).innerJoin(payments, eq(paymentAttempts.paymentId, payments.id)).where(and(eq(payments.orderId, order.id), like(paymentAttempts.idempotencyKey, `pay:${order.id}:%`)));
  const result = await createProviderPayment({ orderId: order.id, returnUrl, idempotencyKey: `pay:${order.id}:${Number(attempts) + 1}` });
  return { ...result, orderCode: order.code };
}

export async function createProviderPayment(input: { orderId: string; returnUrl?: string; idempotencyKey?: string }) {
  const db = getDb();
  const key = input.idempotencyKey ?? `provider-${input.orderId}`;
  // Two concurrent requests with the same idempotencyKey used to both pass
  // this pre-check (neither had inserted yet) and both call the external
  // payment provider before either had persisted a paymentAttempts row —
  // meaning two live provider charges/intents could be created for one
  // logical request. An advisory lock on orderId, held for the whole
  // operation (including the provider call), forces the second caller to
  // wait until the first has committed its attempt, so it correctly finds
  // the existing attempt below instead of calling the provider again.
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.orderId}))`);
    const [existingAttempt] = await tx.select().from(paymentAttempts).where(eq(paymentAttempts.idempotencyKey, key)).limit(1);
    if (existingAttempt) {
      const [existingPayment] = await tx.select().from(payments).where(eq(payments.id, existingAttempt.paymentId)).limit(1);
      // A retried request must get the same hosted checkout back, not a dead null link.
      if (existingPayment) return { payment: existingPayment, checkoutUrl: storedCheckoutUrl(existingPayment), idempotent: true };
    }
    const [order] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
    if (!order) throw new PaymentDomainError("ORDER_NOT_FOUND", "Pedido no encontrado.", 404);
    if (["CANCELLED", "DELIVERED"].includes(order.status)) throw new PaymentDomainError("PAYMENT_NOT_ALLOWED", "El pedido no admite un nuevo pago.", 409);
    if (order.paymentDueAt && order.paymentDueAt.getTime() <= Date.now()) throw new PaymentDomainError("ORDER_PAYMENT_EXPIRED", "El plazo de pago del pedido venció. Vuelve a armar tu carrito.", 409);
    const [currentPayment] = await tx.select().from(payments).where(eq(payments.orderId, order.id)).limit(1);
    if (currentPayment && !retryablePaymentStatuses.includes(currentPayment.status)) throw new PaymentDomainError(currentPayment.status === "CONFIRMED" || currentPayment.status === "APPROVED" ? "PAYMENT_ALREADY_CONFIRMED" : "PAYMENT_NOT_ALLOWED", "El pedido ya tiene un pago en curso o confirmado.", 409);
    let created: PaymentCreateResult;
    try { created = await getPaymentProvider().createPayment({ orderId: order.id, amount: order.total, currency: order.currency, returnUrl: input.returnUrl }); } catch (error) {
      const unconfigured = error instanceof Error && error.message === "PAYMENT_PROVIDER_NOT_CONFIGURED";
      throw new PaymentDomainError(unconfigured ? "PAYMENT_PROVIDER_NOT_CONFIGURED" : "PAYMENT_PROVIDER_CREATE_FAILED", error instanceof Error ? error.message : "No se pudo crear el pago en el proveedor.", unconfigured ? 503 : 502);
    }
    if (!created.provider || !created.providerReference || !created.checkoutUrl) throw new PaymentDomainError("PAYMENT_PROVIDER_INVALID_RESPONSE", "El proveedor devolvió una respuesta de pago incompleta.", 502);
    const [payment] = await tx.select().from(payments).where(eq(payments.orderId, order.id)).for("update").limit(1);
    if (payment?.providerReference === created.providerReference) return { payment, checkoutUrl: created.checkoutUrl, idempotent: true };
    if (payment && (payment.status === "CONFIRMED" || payment.status === "APPROVED")) throw new PaymentDomainError("PAYMENT_ALREADY_CONFIRMED", "El pedido ya tiene un pago confirmado.", 409);
    const duplicate = await tx.select({ id: payments.id }).from(payments).where(and(eq(payments.provider, created.provider), eq(payments.providerReference, created.providerReference))).limit(1);
    if (duplicate.length) throw new PaymentDomainError("PAYMENT_PROVIDER_REFERENCE_DUPLICATE", "La referencia del proveedor ya está asociada a otro pago.", 409);
    const saved = payment
      ? (await tx.update(payments).set({ methodType: "PROVIDER", method: created.provider, provider: created.provider, providerReference: created.providerReference, status: "PENDING", metadata: { checkoutUrl: created.checkoutUrl }, updatedAt: new Date() }).where(eq(payments.id, payment.id)).returning())[0]
      : (await tx.insert(payments).values({ id: id("payment"), orderId: order.id, methodType: "PROVIDER", method: created.provider, provider: created.provider, providerReference: created.providerReference, amount: order.total, currency: order.currency, status: "PENDING", metadata: { checkoutUrl: created.checkoutUrl } }).returning())[0];
    await tx.insert(paymentAttempts).values({ id: id("payment-attempt"), paymentId: saved.id, provider: created.provider, providerReference: created.providerReference, status: "PENDING", amount: saved.amount, currency: saved.currency, idempotencyKey: key });
    await tx.insert(paymentStatusHistory).values({ id: id("payment-status"), paymentId: saved.id, fromStatus: payment?.status ?? null, toStatus: "PENDING", changedBy: null, actorRole: "CUSTOMER", provider: created.provider, reason: payment && payment.status !== "PENDING" ? `Nuevo intento de pago tras ${payment.status}` : "Pago iniciado en proveedor" });
    await tx.insert(auditLogs).values(audit(null, "payments.provider_created", saved.id, payment, saved, { orderId: order.id, provider: created.provider }));
    return { payment: saved, checkoutUrl: created.checkoutUrl, idempotent: false };
  });
}

export async function refreshPaymentStatus(paymentId: string, actor: Actor | null = null) {
  const db = getDb();
  const [current] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!current) throw new PaymentDomainError("PAYMENT_NOT_FOUND", "Pago no encontrado.", 404);
  if (!current.provider || !current.providerReference) throw new PaymentDomainError("PAYMENT_PROVIDER_NOT_CONFIGURED", "El pago no tiene proveedor o referencia externa.", 503);
  let rawStatus: string;
  try { rawStatus = await getPaymentProvider().getStatus(current.providerReference); } catch (error) {
    const unconfigured = error instanceof Error && error.message === "PAYMENT_PROVIDER_NOT_CONFIGURED";
    throw new PaymentDomainError(unconfigured ? "PAYMENT_PROVIDER_NOT_CONFIGURED" : "PAYMENT_STATUS_CHECK_FAILED", error instanceof Error ? error.message : "No se pudo consultar el estado del proveedor.", unconfigured ? 503 : 502);
  }
  const nextStatus = normalizeProviderStatus(rawStatus);
  const result = await db.transaction(async (tx) => {
    const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for("update").limit(1);
    if (!payment) throw new PaymentDomainError("PAYMENT_NOT_FOUND", "Pago no encontrado.", 404);
    if (payment.status === nextStatus) return { payment, changed: false, idempotent: true };
    if (!canTransitionPayment(payment.status, nextStatus)) return { payment, changed: false };
    let orderContext: { status: string; code: string } | null = null;
    let disposition = { entersConfirmed: false, refundRequired: false, overpaidAmount: 0, refundAmount: 0, previousLedger: null as ReturnType<typeof summarizePaymentLedger> | null };
    if (nextStatus === "CONFIRMED") {
      const [order] = await tx.select({ id: orders.id, status: orders.status, code: orders.code, total: orders.total, currency: orders.currency }).from(orders).where(eq(orders.id, payment.orderId)).for("update").limit(1);
      orderContext = order ?? null;
      if (order) disposition = await confirmationDisposition(tx, payment, order);
    }
    const refundRequired = nextStatus === "CONFIRMED" && disposition.refundRequired;
    const metadata = refundRequired ? lateApprovalMetadata(payment.metadata, orderContext?.code ?? payment.orderId, disposition.overpaidAmount) : payment.metadata;
    const [updated] = await tx.update(payments).set({ status: nextStatus, metadata, updatedAt: new Date() }).where(eq(payments.id, payment.id)).returning();
    const statusReason = refundRequired ? lateApprovalRefundReason : "Consulta de estado del proveedor";
    await tx.insert(paymentAttempts).values({ id: id("payment-attempt"), paymentId: payment.id, provider: payment.provider, providerReference: payment.providerReference, status: nextStatus, amount: payment.amount, currency: payment.currency, idempotencyKey: `status-check:${payment.id}:${payment.status}:${nextStatus}` });
    await tx.insert(paymentStatusHistory).values({ id: id("payment-status"), paymentId: payment.id, fromStatus: payment.status, toStatus: nextStatus, changedBy: actor?.userId ?? null, actorRole: actor?.role ?? "PROVIDER", provider: payment.provider, reason: statusReason });
    if (nextStatus === "CONFIRMED") await markOrderPaid(tx, payment.orderId, actor?.userId ?? null, "Pago confirmado al consultar proveedor");
    if (refundRequired) {
      await tx.insert(auditLogs).values(audit(actor, orderContext?.status === "CANCELLED" ? "payments.confirmed_on_cancelled_order" : "payments.confirmed_after_order_paid", payment.id, payment, updated, { provider: payment.provider, requiresRefund: true, lateApproval: true, refundAmount: disposition.refundAmount, ...(disposition.overpaidAmount > 0.005 ? { overpaidAmount: disposition.overpaidAmount } : {}) }));
      return { payment: updated, changed: true, requiresRefund: true, lateApprovalOrderCode: orderContext?.code ?? payment.orderId, overpaidAmount: disposition.overpaidAmount, refundAmount: disposition.refundAmount };
    }
    await tx.insert(auditLogs).values(audit(actor, "payments.status_refreshed", payment.id, payment, updated, { provider: payment.provider, status: nextStatus }));
    return { payment: updated, changed: true };
  });
  if (result.requiresRefund && result.lateApprovalOrderCode) {
    try {
      await notifyStaffOnce({ type: "PAYMENT_FAILED", title: "Pago aprobado con reembolso pendiente", body: `El proveedor ${paymentId} confirmó un pago del pedido ${result.lateApprovalOrderCode}, pero ya existía un cobro o el pedido estaba cerrado. Requiere reembolso.`, link: `/admin/pagos?paymentId=${encodeURIComponent(result.payment.id)}&queue=refunds`, metadata: { paymentId: result.payment.id, refundRequired: true, orderCode: result.lateApprovalOrderCode }, dedupeKey: `payment-late-approval:${result.payment.id}` });
    } catch (error) { console.error("ColdPower: no se pudo notificar el pago tardío", error); }
  }
  return result;
}

async function markOrderPaid(tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0], orderId: string, changedBy: string | null, note: string) {
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update").limit(1);
  if (order?.status !== "PAYMENT_PENDING") return order?.status ?? null;
  const ledger = await summarizeOrderPaymentLedger(tx, order);
  if (ledger.net + 0.005 < amount(order.total)) return order.status;
  await tx.update(orders).set({ status: "PAID", version: order.version + 1, updatedAt: new Date() }).where(eq(orders.id, order.id));
  await tx.insert(orderStatusHistory).values({ id: id("order-status"), orderId: order.id, fromStatus: order.status, toStatus: "PAID", changedBy, note });
  // A paid order keeps its stock: its reservations stop expiring with the payment deadline.
  await tx.update(inventoryReservations).set({ expiresAt: null }).where(and(eq(inventoryReservations.referenceType, "order"), eq(inventoryReservations.referenceId, order.id), eq(inventoryReservations.status, "ACTIVE")));
  return "PAID" as const;
}

export async function refundPayment(paymentId: string, input: { amount?: string; reason: string; idempotencyKey?: string }, actor: Actor) {
  if (!input.reason.trim()) throw new PaymentDomainError("PAYMENT_REFUND_REASON_REQUIRED", "El motivo del reembolso es obligatorio.");
  const db = getDb();
  const prepared = await db.transaction(async (tx) => {
    const key = input.idempotencyKey ?? `refund-${paymentId}-${input.amount ?? "full"}-${crypto.randomUUID()}`;
    const [existing] = await tx.select().from(paymentRefunds).where(eq(paymentRefunds.idempotencyKey, key)).limit(1);
    if (existing && existing.status !== "FAILED") return { refund: existing, payment: null, idempotent: true };
    const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for("update").limit(1);
    if (!payment) throw new PaymentDomainError("PAYMENT_NOT_FOUND", "Pago no encontrado.", 404);
    if (!(payment.status === "CONFIRMED" || payment.status === "APPROVED")) throw new PaymentDomainError("PAYMENT_REFUND_NOT_ALLOWED", "Solo se puede reembolsar un pago confirmado.", 409);
    const manual = payment.methodType === "MANUAL" && !payment.provider;
    if (!manual && (!payment.provider || !payment.providerReference)) throw new PaymentDomainError("PAYMENT_PROVIDER_NOT_CONFIGURED", "El pago no tiene una referencia de proveedor reembolsable.", 503);
    const [reservedRefunds] = await tx.select({ total: sum(paymentRefunds.amount) }).from(paymentRefunds).where(and(eq(paymentRefunds.paymentId, paymentId), inArray(paymentRefunds.status, ["PENDING", "SUCCEEDED"])));
    const available = amount(payment.amount) - amount(reservedRefunds?.total ?? 0);
    const refundAmount = input.amount ? amount(input.amount) : available;
    if (!Number.isFinite(refundAmount) || refundAmount <= 0 || refundAmount > available + 0.005) throw new PaymentDomainError("PAYMENT_REFUND_AMOUNT_INVALID", "El monto supera el saldo disponible para reembolso.", 400);
    let refund;
    if (existing?.status === "FAILED") {
      [refund] = await tx.update(paymentRefunds).set({ paymentId, provider: payment.provider, providerReference: null, amount: refundAmount.toFixed(2), currency: payment.currency, status: manual ? "SUCCEEDED" : "PENDING", reason: input.reason.trim().slice(0, 500), requestedBy: actor.userId, metadata: null, confirmedAt: manual ? new Date() : null, updatedAt: new Date() }).where(eq(paymentRefunds.id, existing.id)).returning();
    } else {
      [refund] = await tx.insert(paymentRefunds).values({ id: id("refund"), paymentId, provider: payment.provider, providerReference: null, idempotencyKey: key, amount: refundAmount.toFixed(2), currency: payment.currency, status: manual ? "SUCCEEDED" : "PENDING", reason: input.reason.trim().slice(0, 500), requestedBy: actor.userId, confirmedAt: manual ? new Date() : null }).returning();
    }
    await tx.insert(auditLogs).values(audit(actor, "payments.refund_requested", paymentId, payment, refund, { refundId: refund.id, reason: input.reason.trim().slice(0, 500) }));
    return { refund, payment, idempotent: false, manual };
  });
  if (prepared.idempotent || !prepared.payment) return prepared;
  if (prepared.manual) {
    return db.transaction(async (tx) => {
      const [currentPayment] = await tx.select().from(payments).where(eq(payments.id, prepared.payment!.id)).for("update").limit(1);
      if (!currentPayment) throw new PaymentDomainError("PAYMENT_NOT_FOUND", "Pago no encontrado.", 404);
      const [totalRefunds] = await tx.select({ total: sum(paymentRefunds.amount) }).from(paymentRefunds).where(and(eq(paymentRefunds.paymentId, currentPayment.id), eq(paymentRefunds.status, "SUCCEEDED")));
      const refundedTotal = amount(totalRefunds?.total ?? 0);
      const isFullRefund = refundedTotal + 0.005 >= amount(currentPayment.amount);
      let updatedPayment = currentPayment;
      if (isFullRefund) {
        if (!canTransitionPayment(currentPayment.status, "REFUNDED")) throw new PaymentDomainError("PAYMENT_REFUND_STATE_CONFLICT", "El estado del pago cambió y no permite completar el reembolso.", 409);
        [updatedPayment] = await tx.update(payments).set({ status: "REFUNDED", metadata: { ...(currentPayment.metadata ?? {}), requiresRefund: false }, updatedAt: new Date() }).where(eq(payments.id, currentPayment.id)).returning();
        await tx.insert(paymentStatusHistory).values({ id: id("payment-status"), paymentId: currentPayment.id, fromStatus: currentPayment.status, toStatus: "REFUNDED", changedBy: actor.userId, actorRole: actor.role ?? null, provider: null, reason: prepared.refund.reason });
      }
      await tx.insert(auditLogs).values(audit(actor, "payments.refund_confirmed", currentPayment.id, currentPayment, updatedPayment, { refundId: prepared.refund.id, refundedTotal: refundedTotal.toFixed(2), fullRefund: isFullRefund, method: "MANUAL" }));
      return { refund: prepared.refund, payment: updatedPayment, idempotent: false };
    });
  }
  let result: PaymentRefundResult;
  try { result = await getPaymentProvider().refund(prepared.payment.providerReference!, prepared.refund.amount); } catch (error) {
    await db.update(paymentRefunds).set({ status: "FAILED", metadata: { error: error instanceof Error ? error.message : "REFUND_PROVIDER_ERROR" }, updatedAt: new Date() }).where(eq(paymentRefunds.id, prepared.refund.id));
    const unconfigured = error instanceof Error && error.message === "PAYMENT_PROVIDER_NOT_CONFIGURED";
    throw new PaymentDomainError(unconfigured ? "PAYMENT_PROVIDER_NOT_CONFIGURED" : "PAYMENT_REFUND_FAILED", error instanceof Error ? error.message : "El proveedor rechazó el reembolso.", unconfigured ? 503 : 502);
  }
  const finalStatus = result.status === "SUCCEEDED" ? "SUCCEEDED" : result.status === "FAILED" ? "FAILED" : "PENDING";
  return db.transaction(async (tx) => {
    const [currentPayment] = await tx.select().from(payments).where(eq(payments.id, prepared.payment!.id)).for("update").limit(1);
    const [refund] = await tx.update(paymentRefunds).set({ status: finalStatus, providerReference: result.providerReference ?? null, externalReference: result.providerReference ?? null, metadata: result.metadata ?? null, confirmedAt: finalStatus === "SUCCEEDED" ? new Date() : null, updatedAt: new Date() }).where(eq(paymentRefunds.id, prepared.refund.id)).returning();
    if (finalStatus === "SUCCEEDED") {
      if (!currentPayment) throw new PaymentDomainError("PAYMENT_REFUND_STATE_CONFLICT", "El pago cambió mientras se procesaba el reembolso.", 409);
      const [totalRefunds] = await tx.select({ total: sum(paymentRefunds.amount) }).from(paymentRefunds).where(and(eq(paymentRefunds.paymentId, currentPayment.id), eq(paymentRefunds.status, "SUCCEEDED")));
      const refundedTotal = amount(totalRefunds?.total ?? 0);
      const isFullRefund = refundedTotal + 0.005 >= amount(currentPayment.amount);
      let updatedPayment = currentPayment;
      if (isFullRefund) {
        if (!canTransitionPayment(currentPayment.status, "REFUNDED")) throw new PaymentDomainError("PAYMENT_REFUND_STATE_CONFLICT", "El estado del pago cambió y no permite completar el reembolso.", 409);
        [updatedPayment] = await tx.update(payments).set({ status: "REFUNDED", updatedAt: new Date(), metadata: result.metadata ?? currentPayment.metadata }).where(eq(payments.id, currentPayment.id)).returning();
        await tx.insert(paymentStatusHistory).values({ id: id("payment-status"), paymentId: currentPayment.id, fromStatus: currentPayment.status, toStatus: "REFUNDED", changedBy: actor.userId, actorRole: actor.role ?? null, provider: currentPayment.provider, reason: prepared.refund.reason });
      }
      await tx.insert(auditLogs).values(audit(actor, "payments.refund_confirmed", currentPayment.id, currentPayment, updatedPayment, { refundId: refund.id, providerReference: result.providerReference ?? null, refundedTotal: refundedTotal.toFixed(2), fullRefund: isFullRefund }));
      return { refund, payment: updatedPayment, idempotent: false };
    }
    await tx.insert(auditLogs).values(audit(actor, finalStatus === "FAILED" ? "payments.refund_failed" : "payments.refund_pending", prepared.payment!.id, currentPayment, refund, { refundId: refund.id }));
    return { refund, payment: currentPayment, idempotent: false };
  });
}

export async function processPaymentWebhook(provider: string, rawPayload: string, signature: string | null) {
  if (!provider) throw new PaymentDomainError("PAYMENT_PROVIDER_REQUIRED", "El proveedor es obligatorio.", 400);
  if (!signature?.trim()) throw new PaymentDomainError("PAYMENT_SIGNATURE_INVALID", "Falta la firma del proveedor.", 401);
  let event;
  try { event = await getPaymentProvider().processWebhook(rawPayload, signature); } catch (error) {
    const message = error instanceof Error ? error.message : "La firma del proveedor no es válida.";
    const unconfigured = message === "PAYMENT_PROVIDER_NOT_CONFIGURED";
    throw new PaymentDomainError(unconfigured ? message : "PAYMENT_SIGNATURE_INVALID", message, unconfigured ? 503 : 401);
  }
  const nextStatus = normalizeProviderStatus(event.status);
  const result = await getDb().transaction(async (tx) => {
    const [existingEvent] = await tx.select({ id: paymentEvents.id, paymentId: paymentEvents.paymentId }).from(paymentEvents).where(and(eq(paymentEvents.provider, provider), eq(paymentEvents.providerEventId, event.providerEventId))).limit(1);
    if (existingEvent) return { duplicate: true, paymentId: existingEvent.paymentId, status: nextStatus };
    if (!event.providerReference) throw new PaymentDomainError("PAYMENT_PROVIDER_REFERENCE_REQUIRED", "El evento no contiene referencia externa.", 400);
    const [payment] = await tx.select().from(payments).where(and(eq(payments.provider, provider), eq(payments.providerReference, event.providerReference))).for("update").limit(1);
    if (!payment) throw new PaymentDomainError("PAYMENT_NOT_FOUND", "Pago no encontrado para el evento del proveedor.", 404);
    const payload = sanitizeAuditValue(event.metadata) as Record<string, unknown>;
    await tx.insert(paymentEvents).values({ id: id("payment-event"), paymentId: payment.id, provider, providerEventId: event.providerEventId, eventType: event.eventType, payload });
    if (payment.status === nextStatus) return { duplicate: false, paymentId: payment.id, status: payment.status, ignored: true, changed: false, idempotent: true };
    if (!canTransitionPayment(payment.status, nextStatus)) return { duplicate: false, paymentId: payment.id, status: payment.status, ignored: true };
    let orderContext: { id: string; status: string; code: string; total: string; currency: string } | null = null;
    let disposition = { entersConfirmed: false, refundRequired: false, overpaidAmount: 0, refundAmount: 0, previousLedger: null as ReturnType<typeof summarizePaymentLedger> | null };
    if (nextStatus === "CONFIRMED") {
      const [order] = await tx.select({ id: orders.id, status: orders.status, code: orders.code, total: orders.total, currency: orders.currency }).from(orders).where(eq(orders.id, payment.orderId)).for("update").limit(1);
      orderContext = order ?? null;
      if (order) disposition = await confirmationDisposition(tx, payment, order);
    }
    const refundRequired = nextStatus === "CONFIRMED" && disposition.refundRequired;
    const paymentMetadata = refundRequired ? lateApprovalMetadata(payload, orderContext?.code ?? payment.orderId, disposition.overpaidAmount) : payload;
    const [updatedPayment] = await tx.update(payments).set({ status: nextStatus, metadata: paymentMetadata, updatedAt: new Date() }).where(eq(payments.id, payment.id)).returning();
    await tx.insert(paymentAttempts).values({ id: id("payment-attempt"), paymentId: payment.id, provider, providerReference: event.providerReference, status: nextStatus, amount: payment.amount, currency: payment.currency, idempotencyKey: `webhook:${provider}:${event.providerEventId}` });
    await tx.insert(paymentStatusHistory).values({ id: id("payment-status"), paymentId: payment.id, fromStatus: payment.status, toStatus: nextStatus, changedBy: null, actorRole: "PROVIDER", provider, reason: refundRequired ? lateApprovalRefundReason : event.eventType });
    if (nextStatus === "CONFIRMED") await markOrderPaid(tx, payment.orderId, null, `Pago aprobado por ${provider}`);
    if (refundRequired) {
      const action = orderContext?.status === "CANCELLED" ? "payments.confirmed_on_cancelled_order" : "payments.confirmed_after_order_paid";
      await tx.insert(auditLogs).values(audit(null, action, payment.id, payment, updatedPayment, { provider, providerEventId: event.providerEventId, orderCode: orderContext?.code ?? null, requiresRefund: true, refundAmount: disposition.refundAmount, ...(disposition.overpaidAmount > 0.005 ? { overpaidAmount: disposition.overpaidAmount } : {}) }));
      await tx.insert(auditLogs).values(audit(null, "payments.webhook_processed", payment.id, payment, updatedPayment, { provider, eventType: event.eventType, providerEventId: event.providerEventId, requiresRefund: true }));
      return { duplicate: false, paymentId: payment.id, status: nextStatus, ignored: false, lateApprovalOrderCode: orderContext?.code ?? payment.orderId, refundRequired: true, overpaidAmount: disposition.overpaidAmount, refundAmount: disposition.refundAmount };
    }
    if (nextStatus === "REFUNDED") {
      const [pendingRefund] = await tx.select().from(paymentRefunds).where(and(eq(paymentRefunds.paymentId, payment.id), eq(paymentRefunds.status, "PENDING"))).orderBy(paymentRefunds.createdAt).limit(1);
      if (pendingRefund) await tx.update(paymentRefunds).set({ status: "SUCCEEDED", externalReference: event.providerReference, confirmedAt: new Date(), updatedAt: new Date(), metadata: payload }).where(eq(paymentRefunds.id, pendingRefund.id));
      else await tx.insert(paymentRefunds).values({ id: id("refund"), paymentId: payment.id, provider, providerReference: event.providerReference, amount: payment.amount, currency: payment.currency, status: "SUCCEEDED", reason: "Confirmado por webhook del proveedor", requestedBy: null, externalReference: event.providerReference, metadata: payload, confirmedAt: new Date() });
    }
    await tx.insert(auditLogs).values(audit(null, "payments.webhook_processed", payment.id, payment, updatedPayment, { provider, eventType: event.eventType, providerEventId: event.providerEventId }));
    return { duplicate: false, paymentId: payment.id, status: nextStatus, ignored: false };
  });
  if ("lateApprovalOrderCode" in result && result.lateApprovalOrderCode) {
    try { await notifyStaffOnce({ type: "PAYMENT_FAILED", title: "Pago aprobado con reembolso pendiente", body: `El proveedor ${provider} aprobó un pago del pedido ${result.lateApprovalOrderCode}, pero ya existía otro cobro o el pedido estaba cerrado. Requiere reembolso.`, link: `/admin/pagos?paymentId=${encodeURIComponent(result.paymentId)}&queue=refunds`, metadata: { paymentId: result.paymentId, provider, orderCode: result.lateApprovalOrderCode, refundRequired: true }, dedupeKey: `payment-late-approval:${result.paymentId}` }); } catch (error) { console.error("ColdPower: no se pudo notificar el pago tardío", error); }
  }
  if (!result.duplicate && !result.ignored && !("lateApprovalOrderCode" in result) && ["CONFIRMED", "REJECTED", "CANCELLED", "ERROR"].includes(result.status)) {
    try { await notifyStaffOnce({ type: result.status === "CONFIRMED" ? "PAYMENT_APPROVED" : "PAYMENT_FAILED", title: result.status === "CONFIRMED" ? "Pago aprobado" : "Pago fallido", body: `El pago del proveedor ${provider} quedó en estado ${result.status}.`, link: `/admin/pagos?paymentId=${encodeURIComponent(result.paymentId)}`, metadata: { paymentId: result.paymentId, provider, status: result.status }, dedupeKey: `payment-event:${provider}:${result.paymentId}:${result.status}` }); } catch (error) { console.error("ColdPower: no se pudo notificar el resultado del pago", error); }
  }
  return result;
}
