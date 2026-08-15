import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { expireInventoryReservations } from "@/lib/inventory";
import { apiError, apiSuccess } from "@/lib/api-errors";

/** Procesa reservas vencidas; puede invocarse desde un job externo con sesión administrativa. */
export async function POST() {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try { actor = await requireApiPermission("inventory.reserve"); } catch (error) { if (error instanceof ApiAuthorizationError) return apiError("INVENTORY_FORBIDDEN", "No tienes permiso para expirar reservas.", 403); return apiError("INVENTORY_AUTH_UNAVAILABLE", "No se pudo validar el acceso al inventario.", 503); }
  try {
    const result = await expireInventoryReservations(actor.userId ?? undefined, actor.role ?? undefined);
    return apiSuccess({ success: true, ...result });
  } catch (error) {
    return apiError("RESERVATION_EXPIRY_FAILED", error instanceof Error ? error.message : "No se pudieron expirar las reservas.", 409);
  }
}
