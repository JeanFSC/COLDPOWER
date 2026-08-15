import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { inventoryBalances, inventoryImportBatches, inventoryMovements, inventoryReservations, locations, products, transfers } from "@/db/schema";

export async function getInventoryAdminSnapshot() {
  const db = getDb();
  const [locationRows, balanceRows, movementRows, transferRows, reservationRows, importRows, productRows] = await Promise.all([
    db.select().from(locations).orderBy(asc(locations.code)),
    db.select({ id: inventoryBalances.id, productId: inventoryBalances.productId, sku: products.sku, productName: products.normalizedName, locationId: inventoryBalances.locationId, locationName: locations.name, onHand: inventoryBalances.onHand, reserved: inventoryBalances.reserved, minimumStock: inventoryBalances.minimumStock, updatedAt: inventoryBalances.updatedAt }).from(inventoryBalances).innerJoin(products, eq(inventoryBalances.productId, products.id)).innerJoin(locations, eq(inventoryBalances.locationId, locations.id)).orderBy(desc(inventoryBalances.updatedAt)).limit(200),
    db.select({ id: inventoryMovements.id, sku: products.sku, productName: products.normalizedName, locationName: locations.name, type: inventoryMovements.type, quantity: inventoryMovements.quantity, resultingOnHand: inventoryMovements.resultingOnHand, resultingReserved: inventoryMovements.resultingReserved, performedBy: inventoryMovements.performedBy, createdAt: inventoryMovements.createdAt }).from(inventoryMovements).innerJoin(products, eq(inventoryMovements.productId, products.id)).innerJoin(locations, eq(inventoryMovements.locationId, locations.id)).orderBy(desc(inventoryMovements.createdAt)).limit(100),
    db.select().from(transfers).orderBy(desc(transfers.createdAt)).limit(100),
    db.select().from(inventoryReservations).orderBy(desc(inventoryReservations.createdAt)).limit(100),
    db.select().from(inventoryImportBatches).orderBy(desc(inventoryImportBatches.createdAt)).limit(20),
    db.select({ id: products.id, sku: products.sku, name: products.normalizedName }).from(products).orderBy(asc(products.sku)).limit(2000),
  ]);
  return { locations: locationRows, balances: balanceRows, movements: movementRows, transfers: transferRows, reservations: reservationRows, imports: importRows, products: productRows };
}
