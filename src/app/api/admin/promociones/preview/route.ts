import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getPromotionDraftPreview } from "@/lib/promotion-repository";
import { PromotionDomainError, validatePromotionAssociations } from "@/lib/promotion-service";
import { validatePromotionInput } from "@/lib/operations-validation";

export async function POST(request: Request) {
  try {
    await requireApiPermission("promotions.manage");
    const body = await request.json().catch(() => null);
    const input = validatePromotionInput(body);
    await validatePromotionAssociations(input);
    return apiSuccess(await getPromotionDraftPreview(input));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PROMOTIONS_FORBIDDEN", "No tienes permiso para previsualizar promociones.", 403);
    if (error instanceof PromotionDomainError) return apiError(error.code, error.message, error.status);
    return apiError("PROMOTION_PREVIEW_FAILED", error instanceof Error ? error.message : "No se pudo previsualizar la promoción.", 400);
  }
}
