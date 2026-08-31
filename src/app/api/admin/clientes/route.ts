import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { getCustomersPage } from "@/lib/customer-repository";
import { parseCustomerFilters, CustomerInvalidFilterError } from "@/lib/customer-contract";
import { createCustomer, CrmDomainError } from "@/lib/crm-service";
import { validateCustomerInput } from "@/lib/crm-validation";
import { apiError, apiSuccess } from "@/lib/api-errors";

export async function GET(request: Request) {
  try {
    await requireApiPermission("customers.view");
    return apiSuccess(await getCustomersPage(parseCustomerFilters(new URL(request.url).searchParams)));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CUSTOMERS_FORBIDDEN", "No tienes permiso para ver clientes.", 403);
    if (error instanceof CustomerInvalidFilterError) return apiError("CUSTOMER_INVALID_FILTER", "Los filtros de clientes no son válidos.", 400);
    return apiError("CUSTOMERS_UNAVAILABLE", "No se pudieron cargar los clientes.", 503);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("customers.manage");
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const input = validateCustomerInput(body && typeof body === "object" ? body as Record<string, unknown> : {});
    if (!input.name) return apiError("CUSTOMER_NAME_REQUIRED", "El nombre del cliente es obligatorio.", 400);
    const customer = await createCustomer({ ...input, name: input.name }, actor);
    return apiSuccess({ customer }, 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CUSTOMERS_FORBIDDEN", "No tienes permiso para crear clientes.", 403);
    if (error instanceof CrmDomainError) return apiError(error.code, error.message, error.status);
    return apiError("CUSTOMER_NOT_SAVED", error instanceof Error ? error.message : "No se pudo guardar el cliente.", 400);
  }
}
