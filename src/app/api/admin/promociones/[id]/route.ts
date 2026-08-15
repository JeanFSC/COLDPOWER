import { eq } from "drizzle-orm";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { promotionCategories, promotionProducts, promotions } from "@/db/operations-schema";
import { assertPromotionApproval, assertPromotionConflict, promotionRequiresApproval, PromotionDomainError, validatePromotionAssociations } from "@/lib/promotion-service";
import { getPromotionDetail } from "@/lib/promotion-repository";
import { validatePromotionInput } from "@/lib/operations-validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    await requireApiPermission("promotions.manage");
    const { id } = await params;
    const detail = await getPromotionDetail(id);
    if (!detail) return apiError("PROMOTION_NOT_FOUND", "Promoción no encontrada.", 404);
    return apiSuccess(detail);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PROMOTIONS_FORBIDDEN", "No tienes permiso para ver promociones.", 403);
    return apiError("PROMOTION_UNAVAILABLE", "No se pudo cargar la promoción.", 503);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  let actor: Awaited<ReturnType<typeof requireApiPermission>>;
  try {
    actor = await requireApiPermission("promotions.manage");
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("PROMOTIONS_FORBIDDEN", "No tienes permiso para modificar promociones.", 403);
    return apiError("PROMOTIONS_UNAVAILABLE", "No se pudo validar el acceso.", 503);
  }
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("PROMOTION_INVALID_JSON", "JSON inválido.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return apiError("PROMOTION_INVALID", "Los datos de la promoción no son válidos.", 400);

  try {
    const db = getDb();
    const [before] = await db.select().from(promotions).where(eq(promotions.id, id)).limit(1);
    if (!before) return apiError("PROMOTION_NOT_FOUND", "Promoción no encontrada.", 404);
    const [currentProducts, currentCategories] = await Promise.all([
      db.select({ productId: promotionProducts.productId }).from(promotionProducts).where(eq(promotionProducts.promotionId, id)),
      db.select({ categoryId: promotionCategories.categoryId }).from(promotionCategories).where(eq(promotionCategories.promotionId, id)),
    ]);
    const value = body as Record<string, unknown>;
    const input = validatePromotionInput({
      name: value.name ?? before.name,
      description: value.description ?? before.description ?? "",
      type: value.type ?? before.type,
      discountValue: value.discountValue ?? before.discountValue,
      startsAt: value.startsAt ?? before.startsAt.toISOString(),
      endsAt: value.endsAt ?? before.endsAt.toISOString(),
      status: value.status ?? before.status,
      bannerAssetId: value.bannerAssetId ?? before.bannerAssetId,
      productIds: value.productIds ?? currentProducts.map((item) => item.productId),
      categoryIds: value.categoryIds ?? currentCategories.map((item) => item.categoryId),
      priority: value.priority ?? before.priority,
      policy: value.policy ?? before.policy,
    });
    await validatePromotionAssociations(input);
    const after = await db.transaction(async (tx) => {
      const approvalRequired = await promotionRequiresApproval(tx, input);
      const commercialValueChanged = "discountValue" in value || "type" in value;
      const approvalStatus = approvalRequired ? (before.approvalStatus === "APPROVED" && !commercialValueChanged ? "APPROVED" : "PENDING") : "NOT_REQUIRED";
      if (input.status === "ACTIVE") { await assertPromotionApproval(tx, input, approvalStatus); await assertPromotionConflict(tx, input, id); }
      const [updated] = await tx.update(promotions).set({
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
        updatedBy: actor.userId,
        updatedAt: new Date(),
      }).where(eq(promotions.id, id)).returning();
      await tx.delete(promotionProducts).where(eq(promotionProducts.promotionId, id));
      await tx.delete(promotionCategories).where(eq(promotionCategories.promotionId, id));
      if (input.productIds.length) await tx.insert(promotionProducts).values(input.productIds.map((productId) => ({ id: "promotion-product-" + crypto.randomUUID(), promotionId: id, productId })));
      if (input.categoryIds.length) await tx.insert(promotionCategories).values(input.categoryIds.map((categoryId) => ({ id: "promotion-category-" + crypto.randomUUID(), promotionId: id, categoryId })));
      await tx.insert(auditLogs).values({ id: "audit-" + crypto.randomUUID(), actorId: actor.userId, actorRole: actor.role, action: "promotions.updated", entityType: "promotion", entityId: id, before, after: updated, metadata: { productIds: input.productIds, categoryIds: input.categoryIds } });
      return updated;
    });
    return apiSuccess({ promotion: after });
  } catch (error) {
    if (error instanceof PromotionDomainError) return apiError(error.code, error.message, error.status);
    return apiError("PROMOTION_NOT_UPDATED", error instanceof Error ? error.message : "No se pudo actualizar la promoción.", 400);
  }
}
