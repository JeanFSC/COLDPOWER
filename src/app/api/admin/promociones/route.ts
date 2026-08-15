import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { promotionCategories, promotionProducts, promotions } from "@/db/operations-schema";
import { assertPromotionApproval, assertPromotionConflict, promotionRequiresApproval, PromotionDomainError, validatePromotionAssociations } from "@/lib/promotion-service";
import { getPromotionPage, parsePromotionFilters, PromotionInvalidFilterError } from "@/lib/promotion-repository";
import { validatePromotionInput } from "@/lib/operations-validation";

export async function GET(request: Request) {
  try {
    await requireApiPermission("promotions.manage");
    return apiSuccess(await getPromotionPage(parsePromotionFilters(new URL(request.url).searchParams)));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PROMOTIONS_FORBIDDEN", "No tienes permiso para ver promociones.", 403);
    if (error instanceof PromotionInvalidFilterError) return apiError("PROMOTIONS_INVALID_FILTER", "Los filtros de promociones no son válidos.", 400);
    return apiError("PROMOTIONS_UNAVAILABLE", "No se pudieron cargar las promociones.", 503);
  }
}

export async function POST(request: Request) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try {
    actor = await requireApiPermission("promotions.manage");
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PROMOTIONS_FORBIDDEN", "No tienes permiso para crear promociones.", 403);
    return apiError("PROMOTIONS_UNAVAILABLE", "No se pudo validar el acceso.", 503);
  }

  let body: unknown;
  try { body = await request.json(); } catch { return apiError("PROMOTION_INVALID_JSON", "JSON inválido.", 400); }

  try {
    const input = validatePromotionInput(body);
    await validatePromotionAssociations(input);
    const result = await getDb().transaction(async (tx) => {
      const approvalRequired = await promotionRequiresApproval(tx, input);
      const approvalStatus = approvalRequired ? "PENDING" : "NOT_REQUIRED";
      if (input.status === "ACTIVE") { await assertPromotionApproval(tx, input, approvalStatus); await assertPromotionConflict(tx, input); }
      const [promotion] = await tx.insert(promotions).values({
        id: "promotion-" + crypto.randomUUID(),
        name: input.name,
        description: input.description,
        bannerAssetId: input.bannerAssetId,
        type: input.type,
        discountValue: input.discountValue,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        status: input.status,
        priority: input.priority,
        policy: input.policy,
        approvalStatus,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      }).returning();
      if (input.productIds.length) await tx.insert(promotionProducts).values(input.productIds.map((productId) => ({ id: "promotion-product-" + crypto.randomUUID(), promotionId: promotion.id, productId })));
      if (input.categoryIds.length) await tx.insert(promotionCategories).values(input.categoryIds.map((categoryId) => ({ id: "promotion-category-" + crypto.randomUUID(), promotionId: promotion.id, categoryId })));
      await tx.insert(auditLogs).values({ id: "audit-" + crypto.randomUUID(), actorId: actor.userId, actorRole: actor.role, action: "promotions.created", entityType: "promotion", entityId: promotion.id, before: null, after: promotion, metadata: { productIds: input.productIds, categoryIds: input.categoryIds } });
      return promotion;
    });
    return apiSuccess({ promotion: result }, 201);
  } catch (error) {
    if (error instanceof PromotionDomainError) return apiError(error.code, error.message, error.status);
    return apiError("PROMOTION_NOT_SAVED", error instanceof Error ? error.message : "No se pudo guardar la promoción.", 400);
  }
}
