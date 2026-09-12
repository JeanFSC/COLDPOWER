import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { getDb } from "@/db";
import { auditLogs, transferItems, transfers } from "@/db/schema";
import { adjustInventoryInTransaction } from "@/lib/inventory-transaction";
import { canTransitionTransfer } from "@/lib/inventory-workflow";
import { notifyStaffOnce } from "@/lib/notifications-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("inventory.transfer"); } catch (error) { if (error instanceof ApiAuthorizationError) return NextResponse.json({ error: "No tienes permiso para gestionar transferencias." }, { status: 403 }); return NextResponse.json({ error: "No se pudo validar el acceso al inventario." }, { status: 503 }); }
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const nextStatus = body && typeof body === "object" && "status" in body ? body.status : undefined;
  if (typeof nextStatus !== "string") return NextResponse.json({ error: "Estado de traslado inválido." }, { status: 400 });
  try {
    const result = await getDb().transaction(async (tx) => {
      const [before] = await tx.select().from(transfers).where(eq(transfers.id, id)).for("update").limit(1);
      if (!before) throw new Error("Traslado no encontrado.");
      if (!canTransitionTransfer(before.status, nextStatus)) throw new Error(`Transición no permitida: ${before.status} → ${nextStatus}.`);
      const items = await tx.select().from(transferItems).where(eq(transferItems.transferId, id));
      if (!items.length) throw new Error("El traslado no tiene productos.");
      if (nextStatus === "IN_TRANSIT") for (const item of items) await adjustInventoryInTransaction(tx, { productId: item.productId, locationId: before.sourceLocationId, quantity: item.quantity, type: "TRANSFER_OUT", reason: "Transferencia enviada a tránsito", notes: `Transferencia ${id} enviada desde el local de origen`, performedBy: actor.userId, performedByRole: actor.role, referenceType: "transfer", referenceId: id });
      if (nextStatus === "RECEIVED") throw new Error("La recepción debe registrarse mediante el endpoint de recepción para evitar duplicar la entrada.");
      if (nextStatus === "CANCELLED" && before.status === "IN_TRANSIT") for (const item of items) await adjustInventoryInTransaction(tx, { productId: item.productId, locationId: before.sourceLocationId, quantity: item.quantity, type: "TRANSFER_IN", reason: "Transferencia cancelada", notes: `Contramovimiento de la transferencia ${id}`, performedBy: actor.userId, performedByRole: actor.role, referenceType: "transfer_cancel", referenceId: id });
      const now = new Date();
      const [after] = await tx.update(transfers).set({ status: nextStatus as typeof before.status, requestedBy: nextStatus === "REQUESTED" ? actor.userId : before.requestedBy, receivedBy: before.receivedBy, receivedAt: before.receivedAt, updatedAt: now }).where(eq(transfers.id, id)).returning();
      await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "inventory.transfer_status_changed", entityType: "transfer", entityId: id, before: { status: before.status }, after: { status: after.status }, metadata: null });
      return after;
    });
    if (nextStatus === "REQUESTED") {
      try { await notifyStaffOnce({ type: "TRANSFER_APPROVAL_PENDING", title: "Transferencia esperando aprobación", body: `La transferencia ${result.id} requiere aprobación.`, link: "/admin/inventario", metadata: { transferId: result.id, status: result.status }, dedupeKey: `transfer:${result.id}:approval` }); }
      catch (notificationError) { console.error("ColdPower: no se pudo notificar la transferencia", notificationError); }
    }
    return NextResponse.json({ success: true, transfer: result });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar el traslado." }, { status: 409 }); }
}



