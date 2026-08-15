import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, inventoryBalances, inventoryMovements } from "@/db/schema";
import { applyInventoryOperation, availableQuantity, validateInventoryMovementMetadata, type InventoryOperation } from "@/lib/inventory-domain";

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
type Input = { productId: string; locationId: string; quantity: number; type: "OPENING_BALANCE" | "PURCHASE_RECEIPT" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "TRANSFER_IN" | "TRANSFER_OUT" | "RETURN_IN" | "RETURN_OUT"; reason?: string; notes?: string; performedBy?: string; performedByRole?: string; referenceType?: string; referenceId?: string };
export async function adjustInventoryInTransaction(tx: Transaction, input: Input) {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error("La cantidad debe ser positiva.");
  const trace = validateInventoryMovementMetadata({ type: input.type, reason: input.reason, notes: input.notes, performedBy: input.performedBy });
  await tx.insert(inventoryBalances).values({ id: `balance-${input.productId}-${input.locationId}`, productId: input.productId, locationId: input.locationId, onHand: 0, reserved: 0 }).onConflictDoNothing({ target: [inventoryBalances.productId, inventoryBalances.locationId] });
  const [current] = await tx.select({ id: inventoryBalances.id, onHand: inventoryBalances.onHand, reserved: inventoryBalances.reserved }).from(inventoryBalances).where(and(eq(inventoryBalances.productId, input.productId), eq(inventoryBalances.locationId, input.locationId))).for("update").limit(1);
  if (!current) throw new Error("No se pudo abrir el saldo de inventario.");
  const next = applyInventoryOperation(current, { type: input.type as InventoryOperation["type"], quantity: input.quantity });
  await tx.update(inventoryBalances).set({ onHand: next.onHand, reserved: next.reserved, updatedAt: new Date() }).where(eq(inventoryBalances.id, current.id));
  const movementId = `movement-${crypto.randomUUID()}`;
  await tx.insert(inventoryMovements).values({ id: movementId, productId: input.productId, locationId: input.locationId, type: input.type as InventoryOperation["type"], quantity: input.quantity, previousOnHand: current.onHand, resultingOnHand: next.onHand, previousReserved: current.reserved, resultingReserved: next.reserved, referenceType: input.referenceType ?? null, referenceId: input.referenceId ?? null, reason: trace.reason, notes: trace.notes, performedBy: trace.performedBy });
  await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: input.performedBy ?? null, actorRole: input.performedByRole ?? null, action: "inventory.movement_created", entityType: "inventory_movement", entityId: movementId, before: { onHand: current.onHand, reserved: current.reserved }, after: { onHand: next.onHand, reserved: next.reserved, available: availableQuantity(next) }, metadata: { productId: input.productId, locationId: input.locationId, type: input.type, quantity: input.quantity, referenceType: input.referenceType ?? null, referenceId: input.referenceId ?? null } });
  return { ...next, available: availableQuantity(next) };
}
