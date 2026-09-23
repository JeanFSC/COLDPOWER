// End-to-end smoke test of the purchase flow against the configured database:
// cart → merge on sign-in → checkout → mock payment (reject, retry, approve) → tracking →
// expiry + late approval. It temporarily gives one published product a price and stock,
// then deletes every row it created and restores the stock balance, pass or fail.
// Guarded like the other dev fixtures: never with NODE_ENV=production, needs
// CP_DEV_AUTH_BYPASS=true and --confirm-dev-mock.
import assert from "node:assert/strict";
import { and, eq, inArray, like, or, sql } from "drizzle-orm";
import { assertDevDatabaseTarget, assertDevMockSeedAllowed } from "../src/lib/dev-mock-fixtures";

assertDevMockSeedAllowed(process.env, process.argv);
assertDevDatabaseTarget(process.env, process.argv);
process.env.PAYMENT_PROVIDER = "mock";
process.env.MOCK_PAYMENT_WEBHOOK_SECRET ||= "cp060-smoke-secret";
process.env.TRACKING_PROVIDER = "mock";

const tag = `cp060smoke${crypto.randomUUID().slice(0, 8)}`;
const userId = `user_${tag}`;
const sessionToken = `session-${tag}`;

async function main() {
  const { getDb } = await import("../src/db");
  const schema = await import("../src/db/schema");
  const salesSchema = await import("../src/db/sales-schema");
  const { customers, opportunities } = await import("../src/db/crm-schema");
  const { notifications } = await import("../src/db/operations-schema");
  const { publicConditions } = await import("../src/lib/catalog-repository");
  const cart = await import("../src/lib/shopping-cart-service");
  const sales = await import("../src/lib/sales-service");
  const pay = await import("../src/lib/payment-service");
  const { signMockPayload } = await import("../src/lib/payments/mock-provider");
  const { advanceShipment } = await import("../src/lib/shipment-service");

  const db = getDb();
  const { products, productPrices, inventoryBalances, locations, users, inventoryMovements, inventoryReservations, promotionApplications } = { ...schema, promotionApplications: (await import("../src/db/operations-schema")).promotionApplications };
  const { orders, orderItems, payments, sales: salesTable, shoppingCarts } = salesSchema;

  // Must run before reading the target balance: an interrupted earlier run still holds its
  // injected stock, and reading first would make this run "restore" that inflated value.
  await recoverLeftovers();

  const [target] = await db
    .select({ productId: products.id, sku: products.sku, locationId: inventoryBalances.locationId, balanceId: inventoryBalances.id, onHand: inventoryBalances.onHand, reserved: inventoryBalances.reserved })
    .from(products)
    .innerJoin(inventoryBalances, eq(inventoryBalances.productId, products.id))
    .innerJoin(locations, and(eq(locations.id, inventoryBalances.locationId), eq(locations.active, true)))
    .where(and(...publicConditions()))
    .limit(1);
  assert.ok(target, "Se necesita al menos un producto publicado con saldo en un local activo.");
  const [quoteOnly] = await db.select({ id: products.id }).from(products).where(and(...publicConditions(), sql`${products.id} <> ${target.productId}`)).limit(1);
  const priceId = `price-${tag}`;
  const send = (reference: string, status: "APPROVED" | "REJECTED", eventId = `evt-${crypto.randomUUID()}`) => {
    const raw = JSON.stringify({ eventId, reference, status, amount: "0", currency: "PEN" });
    return { raw, signature: signMockPayload(raw, process.env.MOCK_PAYMENT_WEBHOOK_SECRET!) };
  };
  const referenceOf = (url: string | null) => { assert.ok(url?.startsWith("/pago/prueba/mock_"), `URL de pago de prueba inesperada: ${url}`); return url!.split("/").pop()!; };
  const results: string[] = [];
  const ok = (label: string) => { results.push(`✓ ${label}`); console.log(`✓ ${label}`); };

  try {
    await db.insert(users).values({ id: userId, email: `${tag}@example.invalid`, name: `Cliente prueba CP060 [balance=${target.balanceId};onHand=${target.onHand};reserved=${target.reserved}]`, role: "customer", status: "ACTIVE" });
    await db.insert(productPrices).values({ id: priceId, productId: target.productId, priceType: "RETAIL", amount: "150.00", currency: "PEN", active: true, validFrom: new Date(Date.now() - 60_000), status: "ACTIVE" } as typeof productPrices.$inferInsert);
    await db.update(inventoryBalances).set({ onHand: target.onHand + 30 }).where(eq(inventoryBalances.id, target.balanceId));

    // 1. Anonymous cart, quote-only guard, merge on sign-in.
    const anon = { sessionToken, userId: null };
    let view = await cart.setCartItem(anon, target.productId, 2, "add");
    assert.equal(view.totalQuantity, 2); assert.equal(view.subtotal, "300.00"); assert.ok(view.canCheckout);
    ok("carrito anónimo: 2 u. a S/ 150.00 = 300.00");
    if (quoteOnly) {
      await assert.rejects(cart.setCartItem(anon, quoteOnly.id, 1, "add"), (error: unknown) => error instanceof cart.CartDomainError && error.code === "PRODUCT_QUOTE_ONLY");
      ok("producto sin precio rechazado en el carrito (solo cotizable)");
    }
    view = await cart.readCartView({ sessionToken, userId });
    assert.equal(view.totalQuantity, 2);
    ok("al iniciar sesión el carrito anónimo pasa a la cuenta");

    // 2. Checkout PICKUP, idempotent retry, reservation with deadline.
    const pickup = { deliveryMethod: "PICKUP" as const, locationId: target.locationId, name: "Cliente prueba CP060", phone: "999000111", email: `${tag}@example.invalid`, address: null, deliveryDetails: null };
    const first = await sales.createCheckoutFromCart(userId, pickup);
    const again = await sales.createCheckoutFromCart(userId, pickup);
    assert.equal(again.order.id, first.order.id); assert.ok(again.idempotent);
    assert.equal(first.order.userId, userId); assert.ok(first.order.paymentDueAt);
    const reservations = await db.select().from(inventoryReservations).where(and(eq(inventoryReservations.referenceType, "order"), eq(inventoryReservations.referenceId, first.order.id)));
    assert.ok(reservations.length === 1 && reservations[0].expiresAt, "La reserva debe tener vencimiento");
    ok(`checkout PICKUP ${first.order.code}: idempotente, ligado al usuario, reserva con vencimiento`);
    assert.equal((await cart.readCartView({ sessionToken, userId })).totalQuantity, 0);
    ok("el carrito queda vacío tras el checkout");

    // 3. Mock payment: resume, reject, retry, bad signature, approve, duplicate event.
    const started = await pay.startPaymentForOrder(first.order.code, userId);
    const resumed = await pay.startPaymentForOrder(first.order.code, userId);
    assert.equal(resumed.checkoutUrl, started.checkoutUrl);
    const ref1 = referenceOf(started.checkoutUrl);
    ok("pago iniciado; reintentar devuelve la misma URL de pago");
    const rejected = send(ref1, "REJECTED");
    await pay.processPaymentWebhook("mock", rejected.raw, rejected.signature);
    let [order] = await db.select().from(orders).where(eq(orders.id, first.order.id));
    assert.equal(order.status, "PAYMENT_PENDING");
    const retry = await pay.startPaymentForOrder(first.order.code, userId);
    const ref2 = referenceOf(retry.checkoutUrl);
    assert.notEqual(ref2, ref1);
    ok("pago rechazado: el pedido sigue pendiente y se genera un nuevo intento");
    const tampered = send(ref2, "APPROVED");
    await assert.rejects(pay.processPaymentWebhook("mock", tampered.raw, "00".repeat(32)), (error: unknown) => error instanceof pay.PaymentDomainError && error.code === "PAYMENT_SIGNATURE_INVALID");
    ok("webhook con firma inválida rechazado");
    const approved = send(ref2, "APPROVED");
    await pay.processPaymentWebhook("mock", approved.raw, approved.signature);
    const duplicate = await pay.processPaymentWebhook("mock", approved.raw, approved.signature);
    assert.ok(duplicate.duplicate);
    [order] = await db.select().from(orders).where(eq(orders.id, first.order.id));
    assert.equal(order.status, "PAID");
    const paidReservations = await db.select().from(inventoryReservations).where(and(eq(inventoryReservations.referenceType, "order"), eq(inventoryReservations.referenceId, first.order.id)));
    assert.ok(paidReservations.every((reservation) => reservation.status === "ACTIVE" && reservation.expiresAt === null), "Un pedido pagado no debe perder su reserva por vencimiento");
    ok("pago aprobado: pedido PAID, reserva sin vencimiento; evento duplicado ignorado");
    const detail = await sales.getOrderForUser(userId, first.order.code);
    assert.ok(detail?.history.some((entry) => entry.toStatus === "PAID"));
    assert.equal(await sales.getOrderForUser(`user_other_${tag}`, first.order.code), null);
    ok("detalle del pedido visible solo para su dueño, con historial");

    // 4. DELIVERY with courier tracking.
    await cart.setCartItem({ sessionToken, userId }, target.productId, 1, "add");
    const delivery = await sales.createCheckoutFromCart(userId, { ...pickup, deliveryMethod: "DELIVERY", address: "Av. Prueba 123", deliveryDetails: { district: "Miraflores", department: "Lima", reference: "Frente al parque" } });
    const deliveryPay = await pay.startPaymentForOrder(delivery.order.code, userId);
    const okDelivery = send(referenceOf(deliveryPay.checkoutUrl), "APPROVED");
    await pay.processPaymentWebhook("mock", okDelivery.raw, okDelivery.signature);
    const staff = { userId: null, role: "SUPERADMIN" };
    await sales.changeOrderStatus(delivery.order.id, "PREPARING", staff);
    await db.update(orderItems).set({ pickedQuantity: sql`${orderItems.quantity}` }).where(eq(orderItems.orderId, delivery.order.id));
    await sales.changeOrderStatus(delivery.order.id, "READY", staff);
    await sales.changeOrderStatus(delivery.order.id, "IN_TRANSIT", staff);
    await advanceShipment(delivery.order.id, staff);
    await advanceShipment(delivery.order.id, staff);
    await assert.rejects(advanceShipment(delivery.order.id, staff));
    await sales.changeOrderStatus(delivery.order.id, "DELIVERED", staff, undefined, { receivedBy: "Cliente prueba" });
    const tracked = await sales.getOrderForUser(userId, delivery.order.code);
    assert.deepEqual(tracked?.shipmentEvents.map((event) => event.status), ["LABEL_CREATED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"]);
    ok(`DELIVERY ${delivery.order.code}: envío con 4 eventos de seguimiento hasta entregado`);

    // 5. Unpaid order expires; a late approval is flagged, not applied.
    await cart.setCartItem({ sessionToken, userId }, target.productId, 1, "add");
    const expiring = await sales.createCheckoutFromCart(userId, { ...pickup, deliveryMethod: "SHIPPING", address: "Agencia Shalom Arequipa", deliveryDetails: { province: "Arequipa", department: "Arequipa", agencyName: "Shalom" } });
    const expiringPay = await pay.startPaymentForOrder(expiring.order.code, userId);
    await db.update(orders).set({ paymentDueAt: new Date(Date.now() - 1000) }).where(eq(orders.id, expiring.order.id));
    const sweep = await sales.cancelExpiredUnpaidOrders();
    assert.ok(sweep.cancelled.includes(expiring.order.code));
    [order] = await db.select().from(orders).where(eq(orders.id, expiring.order.id));
    assert.equal(order.status, "CANCELLED");
    const [released] = await db.select().from(inventoryReservations).where(eq(inventoryReservations.referenceId, expiring.order.id));
    assert.equal(released.status, "RELEASED");
    await assert.rejects(pay.startPaymentForOrder(expiring.order.code, userId));
    const late = send(referenceOf(expiringPay.checkoutUrl), "APPROVED");
    const lateResult = await pay.processPaymentWebhook("mock", late.raw, late.signature);
    assert.ok("lateApprovalOrderCode" in lateResult && lateResult.lateApprovalOrderCode === expiring.order.code);
    [order] = await db.select().from(orders).where(eq(orders.id, expiring.order.id));
    assert.equal(order.status, "CANCELLED");
    ok(`SHIPPING ${expiring.order.code}: vencido → cancelado, stock liberado; pago tardío marcado para reembolso`);

    const [balance] = await db.select().from(inventoryBalances).where(eq(inventoryBalances.id, target.balanceId));
    assert.equal(balance.reserved, target.reserved + 2, "Solo debe quedar reservado el pedido PICKUP pagado (2 u.)");
    ok("saldo de inventario consistente con las reservas");
  } finally {
    await cleanup(userId, sessionToken, priceId, { id: target.balanceId, onHand: target.onHand, reserved: target.reserved });
  }
  console.log(`\n${results.length} verificaciones OK. Datos de prueba eliminados.`);

  // Removes an earlier run that was interrupted before its own cleanup finished.
  async function recoverLeftovers() {
    const leftovers = await db.select({ id: users.id, name: users.name }).from(users).where(like(users.id, "user_cp060smoke%"));
    for (const leftover of leftovers) {
      const leftoverTag = leftover.id.replace("user_", "");
      const marker = /\[balance=([^;]+);onHand=(-?\d+);reserved=(-?\d+)\]/.exec(leftover.name ?? "");
      let balance: { id: string; onHand: number; reserved: number } | null = marker ? { id: marker[1], onHand: Number(marker[2]), reserved: Number(marker[3]) } : null;
      if (!balance) {
        // Oldest run format had no marker: the first movement it caused recorded the stock
        // right after the +30 injection, so the original is that value minus 30.
        const orderIds = (await db.select({ id: orders.id }).from(orders).where(eq(orders.userId, leftover.id))).map((row) => row.id);
        const [first] = orderIds.length ? await db.select().from(inventoryMovements).where(inArray(inventoryMovements.referenceId, orderIds)).orderBy(inventoryMovements.createdAt).limit(1) : [];
        if (first) {
          const [row] = await db.select({ id: inventoryBalances.id }).from(inventoryBalances).where(and(eq(inventoryBalances.productId, first.productId), eq(inventoryBalances.locationId, first.locationId)));
          balance = row ? { id: row.id, onHand: first.previousOnHand - 30, reserved: first.previousReserved } : null;
        }
      }
      await cleanup(leftover.id, `session-${leftoverTag}`, `price-${leftoverTag}`, balance);
      console.log(`Recuperada corrida anterior incompleta: ${leftover.id}`);
    }
  }

  async function cleanup(userId: string, sessionToken: string, priceId: string, balance: { id: string; onHand: number; reserved: number } | null) {
    const orderRows = await db.select({ id: orders.id, saleId: orders.saleId, opportunityId: orders.opportunityId, customerId: orders.customerId, idempotencyKey: orders.idempotencyKey }).from(orders).where(eq(orders.userId, userId));
    const orderIds = orderRows.map((row) => row.id);
    const reservationRows = orderIds.length ? await db.select({ id: inventoryReservations.id }).from(inventoryReservations).where(inArray(inventoryReservations.referenceId, orderIds)) : [];
    const reservationIds = reservationRows.map((row) => row.id);
    const paymentRows = orderIds.length ? await db.select({ id: payments.id }).from(payments).where(inArray(payments.orderId, orderIds)) : [];
    const refIds = [...orderIds, ...reservationIds];
    const movementRows = refIds.length ? await db.select({ id: inventoryMovements.id }).from(inventoryMovements).where(inArray(inventoryMovements.referenceId, refIds)) : [];
    const cartRows = await db.select({ id: shoppingCarts.id }).from(shoppingCarts).where(or(eq(shoppingCarts.userId, userId), eq(shoppingCarts.sessionToken, sessionToken)));
    // audit_logs is append-only by design (DB trigger): the test's audit trail stays.
    if (movementRows.length) await db.delete(inventoryMovements).where(inArray(inventoryMovements.id, movementRows.map((row) => row.id)));
    if (reservationIds.length) await db.delete(inventoryReservations).where(inArray(inventoryReservations.id, reservationIds));
    if (paymentRows.length) await db.delete(payments).where(inArray(payments.id, paymentRows.map((row) => row.id)));
    if (orderRows.length) {
      await db.delete(promotionApplications).where(inArray(promotionApplications.contextId, orderRows.map((row) => row.idempotencyKey)));
      await db.delete(orders).where(inArray(orders.id, orderIds));
      await db.delete(salesTable).where(inArray(salesTable.id, orderRows.map((row) => row.saleId)));
      const opportunityIds = orderRows.map((row) => row.opportunityId).filter((value): value is string => Boolean(value));
      if (opportunityIds.length) await db.delete(opportunities).where(inArray(opportunities.id, opportunityIds));
      await db.delete(notifications).where(or(...orderIds.map((id) => like(notifications.dedupeKey, `%${id}%`)), ...orderRows.map((row) => like(notifications.dedupeKey, `%${row.saleId}%`))));
    }
    if (paymentRows.length) await db.delete(notifications).where(or(...paymentRows.map((row) => like(notifications.dedupeKey, `%${row.id}%`))));
    await db.delete(customers).where(eq(customers.userId, userId));
    if (cartRows.length) await db.delete(shoppingCarts).where(inArray(shoppingCarts.id, cartRows.map((row) => row.id)));
    await db.delete(productPrices).where(eq(productPrices.id, priceId));
    if (balance) await db.update(inventoryBalances).set({ onHand: balance.onHand, reserved: balance.reserved }).where(eq(inventoryBalances.id, balance.id));
    await db.delete(users).where(eq(users.id, userId));
  }
}

main().then(() => process.exit(0)).catch((error) => {
  console.error("✗ Smoke CP060 falló:", error);
  process.exit(1);
});
