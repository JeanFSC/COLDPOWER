import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getPaymentDetail } from "@/lib/payments-repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiPermission("payments.view");
    const { id } = await params;
    const detail = await getPaymentDetail(id);
    return detail ? apiSuccess(detail) : apiError("PAYMENT_NOT_FOUND", "Pago no encontrado.", 404);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PAYMENTS_FORBIDDEN", "No tienes permiso para ver pagos.", 403);
    return apiError("PAYMENT_DETAIL_UNAVAILABLE", "No se pudo cargar el detalle del pago.", 503);
  }
}
