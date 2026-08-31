import { NextResponse } from "next/server";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { getDb } from "@/db";
import { auditLogs, locations, products, transferItems, transfers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(request: Request) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("inventory:transfer"); } catch (error) { if (error instanceof ApiAuthorizationError) return NextResponse.json({ error: "No tienes permiso para crear transferencias." }, { status: 403 }); return NextResponse.json({ error: "No se pudo validar el acceso al inventario." }, { status: 503 }); }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const input = (body && typeof body === "object" ? body : {}) as { sourceLocationId?: unknown; destinationLocationId?: unknown; productId?: unknown; quantity?: unknown; notes?: unknown };
  if (typeof input.sourceLocationId !== "string" || typeof input.destinationLocationId !== "string" || input.sourceLocationId === input.destinationLocationId || typeof input.productId !== "string" || !Number.isInteger(input.quantity) || (input.quantity as number) <= 0) return NextResponse.json({ error: "Origen, destino distinto, producto y cantidad positiva son obligatorios." }, { status: 400 });
  try {
    const db = getDb();
    const transferId = `transfer-${crypto.randomUUID()}`;
    await db.transaction(async (tx) => {
      const [source] = await tx.select({ id: locations.id }).from(locations).where(and(eq(locations.id, input.sourceLocationId as string), eq(locations.active, true))).limit(1);
      const [destination] = await tx.select({ id: locations.id }).from(locations).where(and(eq(locations.id, input.destinationLocationId as string), eq(locations.active, true))).limit(1);
      const [product] = await tx.select({ id: products.id }).from(products).where(eq(products.id, input.productId as string)).limit(1);
      if (!source || !destination || !product) throw new Error("Origen, destino o producto no encontrado.");
      await tx.insert(transfers).values({ id: transferId, sourceLocationId: source.id, destinationLocationId: destination.id, status: "DRAFT", requestedBy: null, approvedBy: null, notes: typeof input.notes === "string" ? input.notes.slice(0, 500) : null });
      await tx.insert(transferItems).values({ id: `transfer-item-${crypto.randomUUID()}`, transferId, productId: product.id, quantity: input.quantity as number });
      await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "inventory.transfer_created", entityType: "transfer", entityId: transferId, before: null, after: { status: "DRAFT", sourceLocationId: source.id, destinationLocationId: destination.id, productId: product.id, quantity: input.quantity }, metadata: null });
    });
    return NextResponse.json({ success: true, transferId }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear el traslado." }, { status: 409 }); }
}
