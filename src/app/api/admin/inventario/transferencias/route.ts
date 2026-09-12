import { NextResponse } from "next/server";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { getDb } from "@/db";
import { auditLogs, inventoryBalances, locations, products, transferItems, transfers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(request: Request) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("inventory.transfer"); } catch (error) { if (error instanceof ApiAuthorizationError) return NextResponse.json({ error: "No tienes permiso para crear transferencias." }, { status: 403 }); return NextResponse.json({ error: "No se pudo validar el acceso al inventario." }, { status: 503 }); }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const input = (body && typeof body === "object" ? body : {}) as { sourceLocationId?: unknown; destinationLocationId?: unknown; productId?: unknown; quantity?: unknown; items?: unknown; notes?: unknown };
  const rawItems = Array.isArray(input.items)
    ? input.items
    : typeof input.productId === "string"
      ? [{ productId: input.productId, quantity: input.quantity }]
      : [];
  const items = rawItems.map((item) => {
    const value = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return { productId: typeof value.productId === "string" ? value.productId : "", quantity: value.quantity };
  });
  if (typeof input.sourceLocationId !== "string" || typeof input.destinationLocationId !== "string" || input.sourceLocationId === input.destinationLocationId || !items.length || items.some((item) => !item.productId || !Number.isInteger(item.quantity) || Number(item.quantity) <= 0)) return NextResponse.json({ error: "Origen, destino distinto y al menos un producto con cantidad positiva son obligatorios." }, { status: 400 });
  if (new Set(items.map((item) => item.productId)).size !== items.length) return NextResponse.json({ error: "No puedes repetir el mismo producto en un traslado." }, { status: 400 });
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() || null;
  try {
    const db = getDb();
    const transferId = `transfer-${crypto.randomUUID()}`;
    await db.transaction(async (tx) => {
      if (idempotencyKey) {
        const [existing] = await tx.select({ id: transfers.id }).from(transfers).where(eq(transfers.idempotencyKey, idempotencyKey)).limit(1);
        if (existing) return;
      }
      const [source] = await tx.select({ id: locations.id }).from(locations).where(and(eq(locations.id, input.sourceLocationId as string), eq(locations.active, true))).limit(1);
      const [destination] = await tx.select({ id: locations.id }).from(locations).where(and(eq(locations.id, input.destinationLocationId as string), eq(locations.active, true))).limit(1);
      if (!source || !destination) throw new Error("Origen o destino no encontrado.");
      await tx.insert(transfers).values({ id: transferId, sourceLocationId: source.id, destinationLocationId: destination.id, status: "DRAFT", requestedBy: null, approvedBy: null, notes: typeof input.notes === "string" ? input.notes.slice(0, 500) : null, idempotencyKey });
      for (const item of items) {
        const [product] = await tx.select({ id: products.id }).from(products).where(eq(products.id, item.productId)).limit(1);
        if (!product) throw new Error(`Producto no encontrado: ${item.productId}.`);
        const [balance] = await tx.select({ onHand: inventoryBalances.onHand, reserved: inventoryBalances.reserved }).from(inventoryBalances).where(and(eq(inventoryBalances.productId, product.id), eq(inventoryBalances.locationId, source.id))).for("update").limit(1);
        if (!balance) throw new Error(`El producto ${item.productId} no tiene saldo registrado en el local de origen.`);
        const available = balance.onHand - balance.reserved;
        if (Number(item.quantity) > available) throw new Error(`No puedes transferir ${item.quantity} unidades de ${item.productId}; solo hay ${available} disponibles.`);
        await tx.insert(transferItems).values({ id: `transfer-item-${crypto.randomUUID()}`, transferId, productId: product.id, quantity: Number(item.quantity) });
      }
      await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "inventory.transfer_created", entityType: "transfer", entityId: transferId, before: null, after: { status: "DRAFT", sourceLocationId: source.id, destinationLocationId: destination.id, items: items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) })) }, metadata: null });
    });
    return NextResponse.json({ success: true, transferId }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear el traslado." }, { status: 409 }); }
}
