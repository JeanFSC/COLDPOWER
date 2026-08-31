import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { reserveInventory } from "@/lib/inventory";
import { apiError, apiSuccess } from "@/lib/api-errors";

export async function POST(request: Request) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("inventory:reserve"); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("INVENTORY_FORBIDDEN", "No tienes permiso para reservar inventario.", 403); return apiError("INVENTORY_AUTH_UNAVAILABLE", "No se pudo validar el acceso al inventario.", 503); }
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
  const input = (body && typeof body === "object" ? body : {}) as { productId?: unknown; locationId?: unknown; quantity?: unknown; referenceType?: unknown; referenceId?: unknown; expiresAt?: unknown; idempotencyKey?: unknown };
  if (typeof input.productId !== "string" || typeof input.locationId !== "string" || !Number.isInteger(input.quantity) || (input.quantity as number) <= 0) return apiError("INVALID_RESERVATION", "Producto, local y cantidad positiva son obligatorios.", 400);
  const expiresAt = typeof input.expiresAt === "string" ? new Date(input.expiresAt) : null;
  if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date())) return apiError("INVALID_EXPIRY", "expiresAt debe ser una fecha futura válida.", 400);
  try { const result = await reserveInventory({ productId: input.productId, locationId: input.locationId, quantity: input.quantity as number, referenceType: typeof input.referenceType === "string" ? input.referenceType.slice(0, 80) : undefined, referenceId: typeof input.referenceId === "string" ? input.referenceId.slice(0, 120) : undefined, expiresAt, idempotencyKey: typeof input.idempotencyKey === "string" ? input.idempotencyKey.slice(0, 160) : undefined, performedBy: actor.userId, performedByRole: actor.role }); return apiSuccess({ success: true, result }, 201); } catch (error) { return apiError("RESERVATION_NOT_CREATED", error instanceof Error ? error.message : "No se pudo reservar.", 409); }
}
