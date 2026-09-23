import { apiError, apiSuccess } from "@/lib/api-errors";
import { ApiAuthorizationError, requireApiUser } from "@/lib/auth";
import { getOrderForUser } from "@/lib/sales-service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { userId } = await requireApiUser();
    const { code } = await params;
    const detail = await getOrderForUser(userId, decodeURIComponent(code));
    if (!detail) return apiError("ORDER_NOT_FOUND", "Pedido no encontrado.", 404);
    return apiSuccess({ success: true, ...detail });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("AUTH_REQUIRED", "Debes iniciar sesión para ver tu pedido.", 401);
    console.error("ColdPower: no se pudo leer el pedido del cliente", error);
    return apiError("ORDER_READ_FAILED", "No se pudo cargar el pedido.", 503);
  }
}
