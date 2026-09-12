import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { customerOperationTabs, getCustomerOperations } from "@/lib/customer-operations-query";

export async function GET(request: Request) {
  try {
    await requireApiPermission("customers.view");
    const rawTab = new URL(request.url).searchParams.get("tab") ?? "agenda";
    if (!customerOperationTabs.includes(rawTab as (typeof customerOperationTabs)[number])) {
      return apiError("CUSTOMER_OPERATIONS_TAB_INVALID", "La pestaña operativa no es válida.", 400);
    }
    return apiSuccess(await getCustomerOperations(rawTab as (typeof customerOperationTabs)[number]));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CUSTOMERS_FORBIDDEN", "No tienes permiso para ver operaciones CRM.", 403);
    return apiError("CUSTOMER_OPERATIONS_UNAVAILABLE", "No se pudieron cargar las operaciones CRM.", 503);
  }
}
