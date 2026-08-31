import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { PaymentsInvalidFilterError, parsePaymentsFilters } from "@/lib/payments-contract";
import { getPaymentsPage } from "@/lib/payments-repository";

export async function GET(request: Request) {
  try {
    await requireApiPermission("payments.view");
    return apiSuccess(await getPaymentsPage(parsePaymentsFilters(new URL(request.url).searchParams)));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PAYMENTS_FORBIDDEN", "No tienes permiso para ver pagos.", 403);
    if (error instanceof PaymentsInvalidFilterError) return apiError("PAYMENTS_INVALID_FILTER", "Los filtros de pagos no son válidos.", 400);
    return apiError("PAYMENTS_UNAVAILABLE", "No se pudieron cargar los pagos.", 503);
  }
}
