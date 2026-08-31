export const inventoryMovementTypes = ["OPENING_BALANCE", "PURCHASE_RECEIPT", "SALE", "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "TRANSFER_OUT", "TRANSFER_IN", "RETURN_IN", "RETURN_OUT", "RESERVATION", "RESERVATION_RELEASE"] as const;
export type InventoryMovementType = (typeof inventoryMovementTypes)[number];
