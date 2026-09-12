import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { CustomerOperationsError, deactivateCustomer } from "@/lib/customer-operations-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("customers.manage");
    const { id } = await params;
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const raw = body && typeof body === "object" ? body as Record<string, unknown> : {};
    if (raw.status !== "INACTIVE") return apiError("CUSTOMER_STATUS_UNSUPPORTED", "Solo se admite desactivar desde este flujo.", 422);
    const result = await deactivateCustomer(id, { reason: typeof raw.reason === "string" ? raw.reason : "", force: raw.force === true }, actor);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CUSTOMERS_FORBIDDEN", "No tienes permiso para desactivar clientes.", 403);
    if (error instanceof CustomerOperationsError) return apiError(error.code, error.message, error.status, error.details);
    return apiError("CUSTOMER_STATUS_FAILED", "No se pudo cambiar el estado del cliente.", 503);
  }
}
