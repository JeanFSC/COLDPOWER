import { NextResponse } from "next/server";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { adjustInventory } from "@/lib/inventory";
import { apiError } from "@/lib/api-errors";

const adjustmentTypes = ["OPENING_BALANCE", "PURCHASE_RECEIPT", "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "RETURN_IN", "RETURN_OUT"] as const;
export async function POST(request: Request) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("inventory:adjust"); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("INVENTORY_FORBIDDEN", "No tienes permiso para ajustar inventario.", 403); return apiError("INVENTORY_AUTH_UNAVAILABLE", "No se pudo validar el acceso al inventario.", 503); }
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
  const input = (body && typeof body === "object" ? body : {}) as { productId?: unknown; locationId?: unknown; quantity?: unknown; type?: unknown; reason?: unknown; notes?: unknown };
  if (typeof input.productId !== "string" || typeof input.locationId !== "string" || !Number.isInteger(input.quantity) || typeof input.type !== "string" || !(adjustmentTypes as readonly string[]).includes(input.type)) return apiError("INVENTORY_INPUT_INVALID", "Producto, local, cantidad entera y tipo de ajuste son obligatorios.", 400);
  if ((input.type === "ADJUSTMENT_IN" || input.type === "ADJUSTMENT_OUT") && (typeof input.reason !== "string" || !input.reason.trim() || typeof input.notes !== "string" || !input.notes.trim())) return apiError("INVENTORY_TRACE_REQUIRED", "Los ajustes manuales requieren motivo y notas.", 400);
  try { const result = await adjustInventory({ productId: input.productId, locationId: input.locationId, quantity: input.quantity as number, type: input.type as (typeof adjustmentTypes)[number], reason: typeof input.reason === "string" ? input.reason.slice(0, 240) : undefined, notes: typeof input.notes === "string" ? input.notes.slice(0, 500) : undefined, performedBy: actor.userId, performedByRole: actor.role }); return NextResponse.json({ success: true, result }, { status: 201 }); } catch (error) { return apiError("INVENTORY_ADJUSTMENT_FAILED", error instanceof Error ? error.message : "No se pudo registrar el ajuste.", 409); }
}
