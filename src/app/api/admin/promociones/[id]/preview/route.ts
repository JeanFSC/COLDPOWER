import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getPromotionDetail } from "@/lib/promotion-repository";
import { applyPromotionToUnitPrice, PromotionDomainError } from "@/lib/promotion-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiPermission("promotions.manage");
    const { id } = await params;
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("PROMOTION_INVALID_JSON", "JSON inválido.", 400); }
    const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const rawBase = Number(value.baseUnitPrice);
    if (!Number.isFinite(rawBase) || rawBase < 0) return apiError("PROMOTION_BASE_PRICE_INVALID", "El precio base no es válido.", 400);
    const detail = await getPromotionDetail(id);
    if (!detail) return apiError("PROMOTION_NOT_FOUND", "Promoción no encontrada.", 404);
    const price = applyPromotionToUnitPrice(detail.promotion, rawBase);
    return apiSuccess({ promotionId: id, effectiveStatus: detail.promotion.effectiveStatus, type: detail.promotion.type, policy: detail.promotion.policy, priority: detail.promotion.priority, scope: { products: detail.products.length, categories: detail.categories.length }, price });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PROMOTIONS_FORBIDDEN", "No tienes permiso para previsualizar promociones.", 403);
    if (error instanceof PromotionDomainError) return apiError(error.code, error.message, error.status);
    return apiError("PROMOTION_PREVIEW_FAILED", "No se pudo previsualizar la promoción.", 400);
  }
}
