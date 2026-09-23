import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { isNull, lt, ne, or } from "drizzle-orm";
import { auditLogs, inventoryBalances, inventoryMovements, inventoryReservations, products, transfers, transferItems } from "@/db/schema";
import { applyInventoryOperation, availableQuantity, validateInventoryMovementMetadata, type InventoryOperation } from "@/lib/inventory-domain";
import { notifyStaffOnce } from "@/lib/notifications-service";
import { canTransitionTransfer } from "@/lib/inventory-workflow";

type InventoryInput = { productId: string; locationId: string; quantity: number; reason?: string; notes?: string; performedBy?: string; performedByRole?: string; referenceType?: string; referenceId?: string; expiresAt?: Date | null; idempotencyKey?: string | null };
type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

async function updateBalance(tx: Transaction, input: InventoryInput, operation: InventoryOperation) {
  const trace = validateInventoryMovementMetadata({ type: operation.type, reason: input.reason, notes: input.notes, performedBy: input.performedBy });
  if (input.idempotencyKey) {
    const [existing] = await tx.select({ productId: inventoryMovements.productId, locationId: inventoryMovements.locationId, type: inventoryMovements.type, quantity: inventoryMovements.quantity, onHand: inventoryMovements.resultingOnHand, reserved: inventoryMovements.resultingReserved }).from(inventoryMovements).where(eq(inventoryMovements.idempotencyKey, input.idempotencyKey)).limit(1);
    if (existing) {
      if (existing.productId !== input.productId || existing.locationId !== input.locationId || existing.type !== operation.type || existing.quantity !== input.quantity) throw new Error("La clave de idempotencia ya fue usada para otra operación.");
      return { onHand: existing.onHand, reserved: existing.reserved, available: availableQuantity(existing) };
    }
  }
  await tx.insert(inventoryBalances).values({ id: `balance-${input.productId}-${input.locationId}`, productId: input.productId, locationId: input.locationId, onHand: 0, reserved: 0 }).onConflictDoNothing({ target: [inventoryBalances.productId, inventoryBalances.locationId] });
  const [current] = await tx.select({ id: inventoryBalances.id, onHand: inventoryBalances.onHand, reserved: inventoryBalances.reserved }).from(inventoryBalances).where(and(eq(inventoryBalances.productId, input.productId), eq(inventoryBalances.locationId, input.locationId))).for("update").limit(1);
  if (!current) throw new Error("No se pudo abrir el saldo de inventario.");
  if (operation.type === "OPENING_BALANCE") {
    const [opening] = await tx.select({ id: inventoryMovements.id }).from(inventoryMovements).where(and(eq(inventoryMovements.productId, input.productId), eq(inventoryMovements.locationId, input.locationId), eq(inventoryMovements.type, "OPENING_BALANCE"))).limit(1);
    if (opening) throw new Error("Ya existe un saldo inicial para este producto y local.");
  }
  const next = applyInventoryOperation(current, operation);
  await tx.update(inventoryBalances).set({ onHand: next.onHand, reserved: next.reserved, updatedAt: new Date() }).where(eq(inventoryBalances.id, current.id));
  const movementId = `movement-${crypto.randomUUID()}`;
  await tx.insert(inventoryMovements).values({ id: movementId, productId: input.productId, locationId: input.locationId, type: operation.type, quantity: input.quantity, previousOnHand: current.onHand, resultingOnHand: next.onHand, previousReserved: current.reserved, resultingReserved: next.reserved, referenceType: input.referenceType ?? null, referenceId: input.referenceId ?? null, reason: trace.reason, notes: trace.notes, performedBy: trace.performedBy, idempotencyKey: input.idempotencyKey ?? null });
  await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: input.performedBy ?? null, actorRole: input.performedByRole ?? null, action: "inventory.movement_created", entityType: "inventory_movement", entityId: movementId, before: { onHand: current.onHand, reserved: current.reserved }, after: { onHand: next.onHand, reserved: next.reserved, available: availableQuantity(next) }, metadata: { productId: input.productId, locationId: input.locationId, type: operation.type, quantity: input.quantity, referenceType: input.referenceType ?? null, referenceId: input.referenceId ?? null } });
  return { ...next, available: availableQuantity(next) };
}

export async function notifyInventoryState(productId: string, locationId: string, available?: number) {
  const [product] = await getDb().select({ name: products.commercialName, normalizedName: products.normalizedName, minimumStock: inventoryBalances.minimumStock, computedAvailable: sql<number>`${inventoryBalances.onHand} - ${inventoryBalances.reserved}` }).from(inventoryBalances).innerJoin(products, eq(inventoryBalances.productId, products.id)).where(and(eq(inventoryBalances.productId, productId), eq(inventoryBalances.locationId, locationId))).limit(1);
  if (!product) return [];
  const currentAvailable = available ?? Number(product.computedAvailable);
  const name = product.name || product.normalizedName || productId;
  if (currentAvailable <= 0) return notifyStaffOnce({ type: "PRODUCT_OUT_OF_STOCK", title: "Producto agotado", body: `${name} quedó sin stock disponible.`, link: "/admin/inventario", metadata: { productId, locationId, available: currentAvailable }, dedupeKey: `stock:${productId}:${locationId}:out` });
  if (product.minimumStock !== null && product.minimumStock !== undefined && currentAvailable <= product.minimumStock) return notifyStaffOnce({ type: "STOCK_MINIMUM", title: "Stock mínimo alcanzado", body: `${name} está en o por debajo del stock mínimo.`, link: "/admin/inventario", metadata: { productId, locationId, available: currentAvailable, minimumStock: product.minimumStock }, dedupeKey: `stock:${productId}:${locationId}:minimum:${currentAvailable}` });
  return [];
}export async function adjustInventory(input: InventoryInput & { type: "OPENING_BALANCE" | "PURCHASE_RECEIPT" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "RETURN_IN" | "RETURN_OUT" }) {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error("La cantidad debe ser positiva.");
  const result = await getDb().transaction((tx) => updateBalance(tx, input, { type: input.type, quantity: input.quantity }));
  try { await notifyInventoryState(input.productId, input.locationId, result.available); }
  catch (notificationError) { console.error("ColdPower: no se pudo notificar el estado de stock", notificationError); }
  return result;
}
export async function reserveInventory(input: InventoryInput) {
  const result = await getDb().transaction(async (tx) => {
    const [reservation] = await reserveInventoryBatchInTransaction(tx, [input]);
    const balance = await getBalance(tx, input.productId, input.locationId);
    return { reservationId: reservation.reservationId, ...balance };
  });
  try { await notifyInventoryState(input.productId, input.locationId, result.available); }
  catch (notificationError) { console.error("ColdPower: no se pudo notificar el stock reservado", notificationError); }
  return result;
}

async function getBalance(tx: Transaction, productId: string, locationId: string) {
  const [balance] = await tx.select({ onHand: inventoryBalances.onHand, reserved: inventoryBalances.reserved }).from(inventoryBalances).where(and(eq(inventoryBalances.productId, productId), eq(inventoryBalances.locationId, locationId))).limit(1);
  if (!balance) throw new Error("No se pudo leer el saldo de inventario.");
  return { ...balance, available: availableQuantity(balance) };
}

export type InventoryReservationInput = InventoryInput;
export type InventoryReservationResult = { reservationId: string; productId: string; locationId: string; quantity: number };
export async function reserveInventoryBatchInTransaction(tx: Transaction, inputs: InventoryReservationInput[]) {
  if (!inputs.length) throw new Error("No hay productos para reservar.");
  const seen = new Set<string>();
  const reservations: InventoryReservationResult[] = [];
  for (const input of inputs) {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error("La cantidad a reservar debe ser positiva.");
    const key = `${input.productId}:${input.locationId}`;
    if (seen.has(key)) throw new Error("No se puede repetir un producto en la misma reserva.");
    seen.add(key);
    if (input.idempotencyKey) {
      const [existing] = await tx.select({ id: inventoryReservations.id, productId: inventoryReservations.productId, locationId: inventoryReservations.locationId, quantity: inventoryReservations.quantity }).from(inventoryReservations).where(eq(inventoryReservations.idempotencyKey, input.idempotencyKey)).limit(1);
      if (existing) { reservations.push({ reservationId: existing.id, productId: existing.productId, locationId: existing.locationId, quantity: existing.quantity }); continue; }
    }
    const [registeredBalance] = await tx.select({ id: inventoryBalances.id }).from(inventoryBalances).where(and(eq(inventoryBalances.productId, input.productId), eq(inventoryBalances.locationId, input.locationId))).for("update").limit(1);
    if (!registeredBalance) throw new Error("El producto no tiene saldo registrado en el local. Registra primero un saldo inicial.");
    const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 240) : null;
    if (input.referenceType === "manual" && !reason) throw new Error("El motivo es obligatorio para una reserva manual.");
    await updateBalance(tx, input, { type: "RESERVATION", quantity: input.quantity });
    const reservationId = `reservation-${crypto.randomUUID()}`;
    await tx.insert(inventoryReservations).values({ id: reservationId, productId: input.productId, locationId: input.locationId, quantity: input.quantity, status: "ACTIVE", referenceType: input.referenceType ?? null, referenceId: input.referenceId ?? null, reason, idempotencyKey: input.idempotencyKey ?? null, expiresAt: input.expiresAt ?? null, createdBy: input.performedBy ?? null });
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: input.performedBy ?? null, actorRole: input.performedByRole ?? null, action: "inventory.reservation_created", entityType: "inventory_reservation", entityId: reservationId, before: null, after: { productId: input.productId, locationId: input.locationId, quantity: input.quantity, status: "ACTIVE" }, metadata: { referenceType: input.referenceType ?? null, referenceId: input.referenceId ?? null, reason } });
    reservations.push({ reservationId, productId: input.productId, locationId: input.locationId, quantity: input.quantity });
  }
  return reservations;
}
export async function reserveInventoryBatch(inputs: InventoryReservationInput[]) { return getDb().transaction((tx) => reserveInventoryBatchInTransaction(tx, inputs)); }

export async function expireInventoryReservations(performedBy?: string, performedByRole?: string, now = new Date()) {
  const expired = await getDb().transaction(async (tx) => {
    // Order reservations are never expired here: they are released only by cancelling the
    // order (cancelExpiredUnpaidOrders), which locks the order row like the payment path does.
    // Expiring them independently could release the stock of an order being paid concurrently.
    const rows = await tx.select().from(inventoryReservations).where(and(eq(inventoryReservations.status, "ACTIVE"), lt(inventoryReservations.expiresAt, now), or(isNull(inventoryReservations.referenceType), ne(inventoryReservations.referenceType, "order")))).for("update");
    for (const reservation of rows) {
      await updateBalance(tx, { productId: reservation.productId, locationId: reservation.locationId, quantity: reservation.quantity, performedBy, performedByRole, referenceType: "reservation_expiry", referenceId: reservation.id, reason: "Reserva vencida", notes: "Liberación automática por fecha de expiración" }, { type: "RESERVATION_RELEASE", quantity: reservation.quantity });
      await tx.update(inventoryReservations).set({ status: "EXPIRED", releasedAt: now }).where(eq(inventoryReservations.id, reservation.id));
      await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: performedBy ?? null, actorRole: performedByRole ?? null, action: "inventory.reservation_expired", entityType: "inventory_reservation", entityId: reservation.id, before: { status: "ACTIVE" }, after: { status: "EXPIRED" }, metadata: { quantity: reservation.quantity, expiresAt: reservation.expiresAt } });
    }
    return rows.map((reservation) => reservation.id);
  });
  return { expiredIds: expired, count: expired.length };
}

export async function releaseInventoryReservationInTransaction(tx: Transaction, reservationId: string, performedBy?: string, performedByRole?: string) {
  const [reservation] = await tx.select().from(inventoryReservations).where(eq(inventoryReservations.id, reservationId)).for("update").limit(1);
  if (!reservation || reservation.status !== "ACTIVE") throw new Error("La reserva no está activa.");
  const balance = await updateBalance(tx, { productId: reservation.productId, locationId: reservation.locationId, quantity: reservation.quantity, performedBy, performedByRole, referenceType: "reservation", referenceId: reservationId, reason: "Reserva liberada", notes: "Liberación por cambio de estado del pedido" }, { type: "RESERVATION_RELEASE", quantity: reservation.quantity });
  await tx.update(inventoryReservations).set({ status: "RELEASED", releasedAt: new Date() }).where(eq(inventoryReservations.id, reservationId));
  await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: performedBy ?? null, actorRole: performedByRole ?? null, action: "inventory.reservation_released", entityType: "inventory_reservation", entityId: reservationId, before: { status: "ACTIVE" }, after: { status: "RELEASED" }, metadata: { quantity: reservation.quantity } });
  return balance;
}

export async function consumeInventoryReservationInTransaction(tx: Transaction, reservationId: string, performedBy?: string, performedByRole?: string) {
  const [reservation] = await tx.select().from(inventoryReservations).where(eq(inventoryReservations.id, reservationId)).for("update").limit(1);
  if (!reservation || reservation.status !== "ACTIVE") throw new Error("La reserva no está activa.");
  const balance = await updateBalance(tx, { productId: reservation.productId, locationId: reservation.locationId, quantity: reservation.quantity, performedBy, performedByRole, referenceType: "reservation", referenceId: reservationId, reason: "Reserva consumida", notes: "Consumo por entrega del pedido" }, { type: "SALE", quantity: reservation.quantity, consumeReserved: true });
  await tx.update(inventoryReservations).set({ status: "CONSUMED", releasedAt: new Date() }).where(eq(inventoryReservations.id, reservationId));
  await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: performedBy ?? null, actorRole: performedByRole ?? null, action: "inventory.reservation_consumed", entityType: "inventory_reservation", entityId: reservationId, before: { status: "ACTIVE" }, after: { status: "CONSUMED" }, metadata: { quantity: reservation.quantity } });
  return balance;
}

export async function releaseInventoryReservation(reservationId: string, performedBy?: string, performedByRole?: string) { return getDb().transaction(async (tx) => { const [reservation] = await tx.select().from(inventoryReservations).where(eq(inventoryReservations.id, reservationId)).for("update").limit(1); if (!reservation || reservation.status !== "ACTIVE") throw new Error("La reserva no está activa."); const balance = await updateBalance(tx, { productId: reservation.productId, locationId: reservation.locationId, quantity: reservation.quantity, performedBy, performedByRole, referenceType: "reservation", referenceId: reservationId }, { type: "RESERVATION_RELEASE", quantity: reservation.quantity }); await tx.update(inventoryReservations).set({ status: "RELEASED", releasedAt: new Date() }).where(eq(inventoryReservations.id, reservationId)); await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: performedBy ?? null, actorRole: performedByRole ?? null, action: "inventory.reservation_released", entityType: "inventory_reservation", entityId: reservationId, before: { status: "ACTIVE" }, after: { status: "RELEASED" }, metadata: { quantity: reservation.quantity } }); return balance; }); }
export async function consumeInventoryReservation(reservationId: string, performedBy?: string, performedByRole?: string) {
  const result = await getDb().transaction(async (tx) => {
    const [reservation] = await tx.select().from(inventoryReservations).where(eq(inventoryReservations.id, reservationId)).for("update").limit(1);
    if (!reservation || reservation.status !== "ACTIVE") throw new Error("La reserva no está activa.");
    const balance = await updateBalance(tx, { productId: reservation.productId, locationId: reservation.locationId, quantity: reservation.quantity, performedBy, performedByRole, referenceType: "reservation", referenceId: reservationId }, { type: "SALE", quantity: reservation.quantity, consumeReserved: true });
    await tx.update(inventoryReservations).set({ status: "CONSUMED", releasedAt: new Date() }).where(eq(inventoryReservations.id, reservationId));
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: performedBy ?? null, actorRole: performedByRole ?? null, action: "inventory.reservation_consumed", entityType: "inventory_reservation", entityId: reservationId, before: { status: "ACTIVE" }, after: { status: "CONSUMED" }, metadata: { quantity: reservation.quantity } });
    return { ...balance, productId: reservation.productId, locationId: reservation.locationId };
  });
  try { await notifyInventoryState(result.productId, result.locationId, result.available); }
  catch (notificationError) { console.error("ColdPower: no se pudo notificar el stock consumido", notificationError); }
  return result;
}
export async function receiveTransfer(transferId: string, performedBy: string, performedByRole?: string) {
  const result = await getDb().transaction(async (tx) => {
    const [transfer] = await tx.select().from(transfers).where(eq(transfers.id, transferId)).for("update").limit(1);
    if (!transfer || !canTransitionTransfer(transfer.status, "RECEIVED")) throw new Error("El traslado no está en tránsito o ya fue recibido.");
    const items = await tx.select().from(transferItems).where(eq(transferItems.transferId, transferId));
    if (!items.length) throw new Error("El traslado no tiene productos.");
    for (const item of items) {
      await updateBalance(tx, { productId: item.productId, locationId: transfer.destinationLocationId, quantity: item.quantity, performedBy, performedByRole, referenceType: "transfer", referenceId: transferId }, { type: "TRANSFER_IN", quantity: item.quantity });
    }
    await tx.update(transfers).set({ status: "RECEIVED", receivedBy: performedBy, receivedAt: new Date(), updatedAt: new Date() }).where(eq(transfers.id, transferId));
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: performedBy, actorRole: performedByRole ?? null, action: "inventory.transfer_received", entityType: "transfer", entityId: transferId, before: { status: "IN_TRANSIT" }, after: { status: "RECEIVED", itemCount: items.length }, metadata: null });
    return { transferId, itemCount: items.length, items, sourceLocationId: transfer.sourceLocationId, destinationLocationId: transfer.destinationLocationId };
  });
  for (const item of result.items) {
    try {
      const [source] = await getDb().select({ available: sql<number>`${inventoryBalances.onHand} - ${inventoryBalances.reserved}` }).from(inventoryBalances).where(and(eq(inventoryBalances.productId, item.productId), eq(inventoryBalances.locationId, result.sourceLocationId))).limit(1);
      if (source) await notifyInventoryState(item.productId, result.sourceLocationId, Number(source.available));
    } catch (notificationError) { console.error("ColdPower: no se pudo notificar el stock de origen", notificationError); }
  }
  return { transferId: result.transferId, itemCount: result.itemCount };
}


