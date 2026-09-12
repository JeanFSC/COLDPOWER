import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getPurchaseRequestsPage } from "@/lib/purchases-repository";
import { createPurchaseRequest } from "@/lib/purchases-service";
import { validatePurchaseRequestInput } from "@/lib/purchases-validation";

export async function GET(request: Request) {
  try {
    await requireApiPermission("purchases.view");
    const params = new URL(request.url).searchParams;
    return apiSuccess(
      await getPurchaseRequestsPage({
        status: params.get("status") ?? undefined,
        source: params.get("source") ?? undefined,
        page: Number(params.get("page") ?? 1),
        pageSize: Number(params.get("pageSize") ?? 25),
      }),
    );
  } catch (error) {
    if (error instanceof ApiAuthorizationError)
      return apiError(
        "PURCHASE_REQUESTS_FORBIDDEN",
        "No tienes permiso para ver solicitudes.",
        403,
      );
    return apiError(
      "PURCHASE_REQUESTS_UNAVAILABLE",
      "No se pudieron cargar las solicitudes de compra.",
      503,
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("purchases.manage");
    const body = await request.json();
    const input = validatePurchaseRequestInput(body);
    const result = await createPurchaseRequest(
      { ...input, idempotencyKey: request.headers.get("Idempotency-Key") ?? input.idempotencyKey },
      actor,
    );
    return apiSuccess({ result }, result.idempotent ? 200 : 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError)
      return apiError(
        "PURCHASE_REQUESTS_FORBIDDEN",
        "No tienes permiso para crear solicitudes.",
        403,
      );
    return apiError(
      "PURCHASE_REQUEST_NOT_CREATED",
      error instanceof Error ? error.message : "No se pudo crear la solicitud.",
      400,
    );
  }
}
