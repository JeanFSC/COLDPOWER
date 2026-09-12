import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { CustomerOperationsError, mergeCustomers, previewCustomerMerge } from "@/lib/customer-operations-service";

function readIds(value: unknown) {
  const body = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    primaryId: typeof body.primaryId === "string" ? body.primaryId.trim() : "",
    secondaryId: typeof body.secondaryId === "string" ? body.secondaryId.trim() : "",
    reason: typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "",
  };
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("customers.manage");
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); }
    const input = readIds(body);
    const previewOnly = body && typeof body === "object" && (body as Record<string, unknown>).preview === true;
    if (previewOnly) return apiSuccess({ preview: await previewCustomerMerge(input.primaryId, input.secondaryId) });
    return apiSuccess(await mergeCustomers(input, actor));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CUSTOMERS_FORBIDDEN", "No tienes permiso para fusionar clientes.", 403);
    if (error instanceof CustomerOperationsError) return apiError(error.code, error.message, error.status, error.details);
    return apiError("CUSTOMER_MERGE_FAILED", "No se pudieron fusionar los clientes.", 503);
  }
}
