import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { auditLogs, inventoryBalances, locations, products } from "@/db/schema";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";

export async function POST(request: Request) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("inventory.adjust"); } catch (error) { if (error instanceof ApiAuthorizationError) return NextResponse.json({ error: "No tienes permiso para gestionar mínimos de inventario." }, { status: 403 }); return NextResponse.json({ error: "No se pudo validar el acceso al inventario." }, { status: 503 }); }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const productId = typeof input.productId === "string" ? input.productId : "";
  const locationId = typeof input.locationId === "string" ? input.locationId : "";
  const minimumStock = Number(input.minimumStock);
  if (!productId || !locationId || !Number.isInteger(minimumStock) || minimumStock < 0) return NextResponse.json({ error: "Producto, local y mínimo entero no negativo son obligatorios." }, { status: 400 });
  try {
    const result = await getDb().transaction(async (tx) => {
      const [product] = await tx.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
      const [location] = await tx.select({ id: locations.id }).from(locations).where(and(eq(locations.id, locationId), eq(locations.active, true))).limit(1);
      if (!product || !location) throw new Error("Producto o local no encontrado.");
      const [before] = await tx.select().from(inventoryBalances).where(and(eq(inventoryBalances.productId, productId), eq(inventoryBalances.locationId, locationId))).limit(1);
      if (!before) throw new Error("INVENTORY_BALANCE_NOT_REGISTERED");
      const [after] = await tx.update(inventoryBalances).set({ minimumStock, updatedAt: new Date() }).where(eq(inventoryBalances.id, before.id)).returning();
      await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "inventory.minimum_stock_updated", entityType: "inventory_balance", entityId: after.id, before: { minimumStock: before.minimumStock, onHand: before.onHand, reserved: before.reserved }, after: { minimumStock: after.minimumStock, onHand: after.onHand, reserved: after.reserved }, metadata: { productId, locationId } });
      return after;
    });
    return NextResponse.json({ balance: result });
  } catch (error) { return NextResponse.json({ error: error instanceof Error && error.message === "INVENTORY_BALANCE_NOT_REGISTERED" ? "Este producto no tiene saldo registrado en el local. Registra primero un saldo inicial." : error instanceof Error ? error.message : "No se pudo guardar el mínimo." }, { status: 409 }); }
}
