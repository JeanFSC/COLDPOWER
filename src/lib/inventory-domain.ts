import type { InventoryMovementType } from "@/lib/inventory-types";

export type InventoryBalance = { onHand: number; reserved: number };
export type InventoryOperation = { type: InventoryMovementType; quantity: number; consumeReserved?: boolean };
export const inventoryStatuses = ["SIN_SALDO", "SIN_MINIMO", "AGOTADO", "CRITICO", "BAJO", "OPTIMO"] as const;
export type InventoryStatus = (typeof inventoryStatuses)[number];

/**
 * BAJO remains part of the public status vocabulary for a future explicit
 * reorder threshold. The current schema only has minimumStock, so the
 * deterministic status derivation intentionally never invents a second
 * threshold and returns OPTIMO above the configured minimum.
 */
export function deriveInventoryStatus(input: { onHand: number | null; reserved: number | null; minimumStock: number | null; hasBalance?: boolean }): InventoryStatus {
  if (input.hasBalance === false || input.onHand === null || input.reserved === null) return "SIN_SALDO";
  assertValidBalance({ onHand: input.onHand, reserved: input.reserved });
  if (input.minimumStock === null) return "SIN_MINIMO";
  const available = availableQuantity({ onHand: input.onHand, reserved: input.reserved });
  if (available === 0) return "AGOTADO";
  if (available <= input.minimumStock) return "CRITICO";
  return "OPTIMO";
}

export function reservationShouldExpire(status: string, expiresAt: Date | null | undefined, now = new Date()) {
  return status === "ACTIVE" && Boolean(expiresAt) && (expiresAt as Date).getTime() <= now.getTime();
}

export function validateInventoryMovementMetadata(input: { type: InventoryMovementType | string; reason?: unknown; notes?: unknown; performedBy?: unknown }) {
  const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 240) : "";
  const notes = typeof input.notes === "string" ? input.notes.trim().slice(0, 500) : "";
  const performedBy = typeof input.performedBy === "string" ? input.performedBy.trim() : "";
  if (input.type === "ADJUSTMENT_IN" || input.type === "ADJUSTMENT_OUT") {
    if (!reason) throw new Error("El motivo del ajuste es obligatorio.");
    if (!notes) throw new Error("Las notas del ajuste son obligatorias.");
    if (!performedBy) throw new Error("El actor del ajuste es obligatorio.");
  }
  return { reason: reason || null, notes: notes || null, performedBy: performedBy || null };
}

export function availableQuantity(balance: InventoryBalance) {
  assertValidBalance(balance);
  return balance.onHand - balance.reserved;
}

export function assertValidBalance(balance: InventoryBalance) {
  if (!Number.isInteger(balance.onHand) || !Number.isInteger(balance.reserved)) throw new Error("Los saldos deben ser enteros.");
  if (balance.onHand < 0 || balance.reserved < 0) throw new Error("El inventario no puede ser negativo.");
  if (balance.reserved > balance.onHand) throw new Error("El reservado supera el on_hand o el disponible es negativo.");
}

export function applyInventoryOperation(balance: InventoryBalance, operation: InventoryOperation): InventoryBalance {
  assertValidBalance(balance);
  if (!Number.isInteger(operation.quantity) || operation.quantity <= 0) throw new Error("La cantidad debe ser positiva.");
  const next = { ...balance };
  switch (operation.type) {
    case "RESERVATION": next.reserved += operation.quantity; break;
    case "RESERVATION_RELEASE": next.reserved -= operation.quantity; break;
    case "SALE": next.onHand -= operation.quantity; if (operation.consumeReserved) next.reserved -= operation.quantity; break;
    case "ADJUSTMENT_OUT":
    case "TRANSFER_OUT":
    case "RETURN_OUT": next.onHand -= operation.quantity; break;
    case "OPENING_BALANCE":
    case "PURCHASE_RECEIPT":
    case "ADJUSTMENT_IN":
    case "TRANSFER_IN":
    case "RETURN_IN": next.onHand += operation.quantity; break;
    default: throw new Error(`Tipo de movimiento no soportado: ${String(operation.type)}`);
  }
  assertValidBalance(next);
  return next;
}
