import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { getCustomer360 } from "@/lib/customer-repository";
import { parseCustomerRelationFilters } from "@/lib/customer-contract";
import { CrmDomainError, updateCustomer } from "@/lib/crm-service";
import { validateCustomerInput } from "@/lib/crm-validation";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { can } from "@/lib/roles";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("customers.view");
    const { id } = await params;
    if (!id.trim()) return apiError("CUSTOMER_ID_REQUIRED", "El id del cliente es obligatorio.", 400);
    const detail = await getCustomer360(id, parseCustomerRelationFilters(new URL(request.url).searchParams), { includeFinancial: can(actor.role, "sales.view") || can(actor.role, "payments.view") });
    if (!detail) return apiError("CUSTOMER_NOT_FOUND", "Cliente no encontrado.", 404);
    return apiSuccess(detail);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CUSTOMERS_FORBIDDEN", "No tienes permiso para ver clientes.", 403);
    return apiError("CUSTOMER_DETAIL_UNAVAILABLE", "No se pudo cargar el cliente.", 503);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("customers.manage");
    const { id } = await params;
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const raw = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const input = validateCustomerInput(body && typeof body === "object" ? body as Record<string, unknown> : {}, true);
    const reason = typeof raw.reason === "string" ? raw.reason : "";
    const customer = await updateCustomer(id, input, actor, reason);
    return apiSuccess({ customer });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CUSTOMERS_FORBIDDEN", "No tienes permiso para editar clientes.", 403);
    if (error instanceof CrmDomainError) return apiError(error.code, error.message, error.status);
    return apiError("CUSTOMER_NOT_UPDATED", error instanceof Error ? error.message : "No se pudo actualizar el cliente.", 400);
  }
}
