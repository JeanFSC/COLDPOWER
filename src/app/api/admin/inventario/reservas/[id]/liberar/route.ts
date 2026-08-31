import { NextResponse } from "next/server";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { releaseInventoryReservation } from "@/lib/inventory";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("inventory:reserve"); } catch (error) { if (error instanceof ApiAuthorizationError) return NextResponse.json({ error: "No tienes permiso para liberar reservas." }, { status: 403 }); return NextResponse.json({ error: "No se pudo validar el acceso al inventario." }, { status: 503 }); }
  const { id } = await params;
  try { return NextResponse.json({ success: true, result: await releaseInventoryReservation(id, actor.userId, actor.role) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo liberar la reserva." }, { status: 409 }); }
}
