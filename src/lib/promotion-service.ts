/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, asc, desc, eq, gt, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, categories, discountRules, mediaAssets, products } from "@/db/schema";
import { promotionApplications, promotionCategories, promotionProducts, promotions } from "@/db/operations-schema";
import { effectivePromotionStatus, type PromotionInput } from "@/lib/operations-validation";
import { calculatePromotionalUnitPrice } from "@/lib/promotion-pricing";
import type { PromotionPriceStep } from "@/lib/retail-price";

export { calculatePromotionalUnitPrice } from "@/lib/promotion-pricing";

export class PromotionDomainError extends Error { constructor(public readonly code: string, message: string, public readonly status = 409) { super(message); } }
export const checkoutPromotionApprovalStatuses = ["APPROVED", "NOT_REQUIRED"] as const;
export function isPromotionApprovalAllowedForCheckout(approvalStatus: unknown): approvalStatus is (typeof checkoutPromotionApprovalStatuses)[number] { return checkoutPromotionApprovalStatuses.includes(approvalStatus as (typeof checkoutPromotionApprovalStatuses)[number]); }
export function promotionApprovalChanges(decision: "APPROVED" | "REJECTED", actorId: string, now = new Date()) {
  if (decision === "REJECTED") return { approvalStatus: decision, status: "INACTIVE" as const, approvedBy: null, approvedAt: null, updatedBy: actorId, updatedAt: now };
  return { approvalStatus: decision, approvedBy: actorId, approvedAt: now, updatedBy: actorId, updatedAt: now };
}
export async function promotionRequiresApproval(tx: any, input: PromotionInput) { if (input.type !== "PERCENTAGE") return false; const now = new Date(); const [rule] = await tx.select().from(discountRules).where(and(eq(discountRules.status, "ACTIVE"), or(isNull(discountRules.validFrom), lte(discountRules.validFrom, now)), or(isNull(discountRules.validUntil), gt(discountRules.validUntil, now)))).orderBy(desc(discountRules.approvalAbovePercentage)).limit(1); return Boolean(rule && Number(input.discountValue) >= Number(rule.approvalAbovePercentage)); }
export async function assertPromotionApproval(tx: any, input: PromotionInput, approvalStatus: string) { if (await promotionRequiresApproval(tx, input) && approvalStatus !== "APPROVED") throw new PromotionDomainError("PROMOTION_APPROVAL_REQUIRED", "El descuento supera el umbral de aprobación y debe ser aprobado por un usuario autorizado.", 409); }
export type PromotionPricingContext = { productId: string; baseUnitPrice: string | number; contextType: string; contextId: string; idempotencyKey: string };
export async function recordPromotionalApplicationsInTransaction(tx: any, input: PromotionPricingContext, steps: PromotionPriceStep[]) {
  const keys = steps.map((step) => `${input.idempotencyKey}:${step.promotionId}`);
  const existingRows = keys.length ? await tx.select().from(promotionApplications).where(inArray(promotionApplications.idempotencyKey, keys)) : [];
  const existingByKey = new Map(existingRows.map((row: any) => [row.idempotencyKey, row]));
  const applications: any[] = [];
  for (const step of steps) {
    const key = `${input.idempotencyKey}:${step.promotionId}`;
    const existing = existingByKey.get(key);
    if (existing) {
      applications.push(existing);
      continue;
    }
    const [application] = await tx.insert(promotionApplications).values({ id: "promotion-application-" + crypto.randomUUID(), idempotencyKey: key, promotionId: step.promotionId, productId: input.productId, contextType: input.contextType, contextId: input.contextId, baseUnitPrice: step.baseUnitPrice, discountAmount: step.discountAmount, finalUnitPrice: step.finalUnitPrice }).onConflictDoNothing({ target: promotionApplications.idempotencyKey }).returning();
    const persisted = application ?? (await tx.select().from(promotionApplications).where(eq(promotionApplications.idempotencyKey, key)).limit(1))[0];
    if (!persisted) throw new PromotionDomainError("PROMOTION_APPLICATION_NOT_SAVED", "No se pudo registrar la aplicacion de la promocion.", 503);
    applications.push(persisted);
    if (application) await tx.insert(auditLogs).values({ id: "audit-" + crypto.randomUUID(), actorId: null, actorRole: "SYSTEM", action: "promotions.applied", entityType: "promotion_application", entityId: application.id, before: { baseUnitPrice: step.baseUnitPrice }, after: { discountAmount: step.discountAmount, finalUnitPrice: step.finalUnitPrice, promotionId: step.promotionId }, metadata: { contextType: input.contextType, contextId: input.contextId } });
  }
  const baseUnitPrice = Number(input.baseUnitPrice).toFixed(2);
  const finalUnitPrice = steps.length ? steps[steps.length - 1].finalUnitPrice : baseUnitPrice;
  const discountAmount = Math.max(0, Math.round((Number(baseUnitPrice) - Number(finalUnitPrice)) * 100) / 100).toFixed(2);
  return { baseUnitPrice, discountAmount, finalUnitPrice, promotionIds: steps.map((step) => step.promotionId), applications };
}
export async function applyPromotionsInTransaction(tx: any, input: PromotionPricingContext) {
  const base = Number(input.baseUnitPrice);
  if (!Number.isFinite(base) || base < 0) throw new PromotionDomainError("PROMOTION_BASE_PRICE_INVALID", "El precio base no es válido.", 400);
  const [product] = await tx.select({ id: products.id, categoryId: products.categoryId }).from(products).where(eq(products.id, input.productId)).limit(1);
  if (!product) throw new PromotionDomainError("PROMOTION_PRODUCT_NOT_FOUND", "El producto no existe.", 404);
  const now = new Date();
  const candidates = await tx.select().from(promotions).where(and(eq(promotions.status, "ACTIVE"), inArray(promotions.approvalStatus, checkoutPromotionApprovalStatuses), lte(promotions.startsAt, now), gt(promotions.endsAt, now))).orderBy(desc(promotions.priority), asc(promotions.startsAt));
  if (!candidates.length) return { baseUnitPrice: base.toFixed(2), discountAmount: "0.00", finalUnitPrice: base.toFixed(2), promotionIds: [], applications: [] };
  const ids = candidates.map((promotion: any) => promotion.id);
  const [directRows, categoryRows] = await Promise.all([
    tx.select({ promotionId: promotionProducts.promotionId }).from(promotionProducts).where(and(eq(promotionProducts.productId, input.productId), inArray(promotionProducts.promotionId, ids))),
    tx.select({ promotionId: promotionCategories.promotionId }).from(promotionCategories).where(and(eq(promotionCategories.categoryId, product.categoryId), inArray(promotionCategories.promotionId, ids))),
  ]);
  const directIds = new Set(directRows.map((row: any) => row.promotionId));
  const categoryIds = new Set(categoryRows.map((row: any) => row.promotionId));
  const scopedRows = await tx.select({ promotionId: promotionProducts.promotionId }).from(promotionProducts).where(inArray(promotionProducts.promotionId, ids));
  const scopedCategoryRows = await tx.select({ promotionId: promotionCategories.promotionId }).from(promotionCategories).where(inArray(promotionCategories.promotionId, ids));
  const scopedIds = new Set([...scopedRows, ...scopedCategoryRows].map((row: any) => row.promotionId));
  const eligible = candidates.filter((promotion: any) => !scopedIds.has(promotion.id) || directIds.has(promotion.id) || categoryIds.has(promotion.id));
  if (!eligible.length) return { baseUnitPrice: base.toFixed(2), discountAmount: "0.00", finalUnitPrice: base.toFixed(2), promotionIds: [], applications: [] };
  const exclusive = eligible.filter((promotion: any) => promotion.policy === "EXCLUSIVE");
  const stackable = eligible.filter((promotion: any) => promotion.policy === "STACKABLE");
  const bestValue = eligible.filter((promotion: any) => promotion.policy === "BEST_VALUE");
  const selected = [...stackable];
  if (exclusive.length) selected.push(exclusive[0]);
  else if (bestValue.length) selected.push(bestValue.map((promotion: any) => ({ promotion, price: applyPromotionToUnitPrice(promotion, base) })).sort((a: any, b: any) => Number(a.price.finalUnitPrice) - Number(b.price.finalUnitPrice))[0].promotion);
  let current = base.toFixed(2);
  const applications: any[] = [];
  for (const promotion of selected) {
    const key = input.idempotencyKey + ":" + promotion.id;
    const [existing] = await tx.select().from(promotionApplications).where(eq(promotionApplications.idempotencyKey, key)).limit(1);
    if (existing) { current = String(existing.finalUnitPrice); applications.push(existing); continue; }
    const price = applyPromotionToUnitPrice(promotion, current);
    const [application] = await tx.insert(promotionApplications).values({ id: "promotion-application-" + crypto.randomUUID(), idempotencyKey: key, promotionId: promotion.id, productId: input.productId, contextType: input.contextType, contextId: input.contextId, ...price }).returning();
    applications.push(application);
    await tx.insert(auditLogs).values({ id: "audit-" + crypto.randomUUID(), actorId: null, actorRole: "SYSTEM", action: "promotions.applied", entityType: "promotion_application", entityId: application.id, before: { baseUnitPrice: price.baseUnitPrice }, after: { discountAmount: price.discountAmount, finalUnitPrice: price.finalUnitPrice, promotionId: promotion.id }, metadata: { contextType: input.contextType, contextId: input.contextId } });
    current = price.finalUnitPrice;
  }
  const discountAmount = Math.max(0, Math.round((base - Number(current)) * 100) / 100).toFixed(2);
  return { baseUnitPrice: base.toFixed(2), discountAmount, finalUnitPrice: Number(current).toFixed(2), promotionIds: selected.map((promotion: any) => promotion.id), applications };
}
export async function validatePromotionAssociations(input: PromotionInput) { const db = getDb(); if (input.productIds.length) { const rows = await db.select({ id: products.id }).from(products).where(inArray(products.id, input.productIds)); if (rows.length !== input.productIds.length) throw new PromotionDomainError("PROMOTION_PRODUCT_NOT_FOUND", "Una promoción referencia un producto inexistente."); } if (input.categoryIds.length) { const rows = await db.select({ id: categories.id }).from(categories).where(and(inArray(categories.id, input.categoryIds), eq(categories.active, true))); if (rows.length !== input.categoryIds.length) throw new PromotionDomainError("PROMOTION_CATEGORY_NOT_FOUND", "Una promoción referencia una categoría inexistente o inactiva."); } if (input.bannerAssetId) { const [banner] = await db.select({ id: mediaAssets.id, status: mediaAssets.status }).from(mediaAssets).where(eq(mediaAssets.id, input.bannerAssetId)).limit(1); if (!banner || banner.status !== "ACTIVE") throw new PromotionDomainError("PROMOTION_BANNER_NOT_ACTIVE", "El banner debe existir y estar activo."); } }
export async function assertPromotionConflict(tx: any, input: PromotionInput, excludeId?: string) { const active = await tx.select().from(promotions).where(and(eq(promotions.status, "ACTIVE"), excludeId ? sql`${promotions.id} <> ${excludeId}` : undefined, lt(promotions.startsAt, new Date(input.endsAt)), sql`${promotions.endsAt} > ${new Date(input.startsAt)}`)); if (!active.length) return; for (const existing of active) { if (input.policy === "STACKABLE" || existing.policy === "STACKABLE" || input.policy === "BEST_VALUE" || existing.policy === "BEST_VALUE") continue; const [productOverlap] = input.productIds.length ? await tx.select({ id: promotionProducts.id }).from(promotionProducts).where(and(eq(promotionProducts.promotionId, existing.id), inArray(promotionProducts.productId, input.productIds))).limit(1) : [null]; const [categoryOverlap] = input.categoryIds.length ? await tx.select({ id: promotionCategories.id }).from(promotionCategories).where(and(eq(promotionCategories.promotionId, existing.id), inArray(promotionCategories.categoryId, input.categoryIds))).limit(1) : [null]; if (productOverlap || categoryOverlap) throw new PromotionDomainError("PROMOTION_CONFLICT", `La promoción entra en conflicto con ${existing.name}. Define una política STACKABLE o cambia la vigencia.`); } }
export function applyPromotionToUnitPrice(promotion: { id: string; type: "PERCENTAGE" | "AMOUNT" | "SPECIAL_PRICE"; discountValue: string }, baseUnitPrice: string | number) { try { return calculatePromotionalUnitPrice(promotion, baseUnitPrice); } catch (error) { if (error instanceof Error && error.message === "PROMOTION_BASE_PRICE_INVALID") throw new PromotionDomainError(error.message, "El precio base no es válido.", 400); throw new PromotionDomainError("PROMOTION_VALUE_INVALID", "El valor de la promoción no es válido.", 400); } }
export async function applyPromotion(input: { promotionId: string; productId: string; contextType: string; contextId: string; baseUnitPrice: string | number; idempotencyKey: string }) { const db = getDb(); const [existing] = await db.select().from(promotionApplications).where(eq(promotionApplications.idempotencyKey, input.idempotencyKey)).limit(1); if (existing) return { application: existing, idempotent: true }; const [promotion] = await db.select().from(promotions).where(and(eq(promotions.id, input.promotionId), inArray(promotions.approvalStatus, checkoutPromotionApprovalStatuses))).limit(1); if (!promotion || effectivePromotionStatus(promotion) !== "ACTIVE") throw new PromotionDomainError("PROMOTION_NOT_ACTIVE", "La promoción no está vigente.", 409); const [product] = await db.select({ id: products.id, categoryId: products.categoryId }).from(products).where(eq(products.id, input.productId)).limit(1); if (!product) throw new PromotionDomainError("PROMOTION_PRODUCT_NOT_FOUND", "El producto no existe.", 404); const [direct] = await db.select({ id: promotionProducts.id }).from(promotionProducts).where(and(eq(promotionProducts.promotionId, input.promotionId), eq(promotionProducts.productId, input.productId))).limit(1); const [category] = await db.select({ id: promotionCategories.id }).from(promotionCategories).where(and(eq(promotionCategories.promotionId, input.promotionId), eq(promotionCategories.categoryId, product.categoryId))).limit(1); const [scopeCount] = await db.select({ value: sql<number>`count(*)` }).from(promotionProducts).where(eq(promotionProducts.promotionId, input.promotionId)); const [categoryCount] = await db.select({ value: sql<number>`count(*)` }).from(promotionCategories).where(eq(promotionCategories.promotionId, input.promotionId)); if (!direct && !category && Number(scopeCount?.value ?? 0) + Number(categoryCount?.value ?? 0) > 0) throw new PromotionDomainError("PROMOTION_PRODUCT_OUT_OF_SCOPE", "El producto no está asociado a la promoción.", 409); const price = applyPromotionToUnitPrice(promotion, input.baseUnitPrice); const [application] = await db.insert(promotionApplications).values({ id: `promotion-application-${crypto.randomUUID()}`, idempotencyKey: input.idempotencyKey, promotionId: input.promotionId, productId: input.productId, contextType: input.contextType, contextId: input.contextId, ...price }).onConflictDoNothing({ target: promotionApplications.idempotencyKey }).returning(); if (!application) { const [retry] = await db.select().from(promotionApplications).where(eq(promotionApplications.idempotencyKey, input.idempotencyKey)).limit(1); return { application: retry, idempotent: true }; } await db.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: null, actorRole: "SYSTEM", action: "promotions.applied", entityType: "promotion_application", entityId: application.id, before: { baseUnitPrice: price.baseUnitPrice }, after: { discountAmount: price.discountAmount, finalUnitPrice: price.finalUnitPrice, promotionId: promotion.id }, metadata: { contextType: input.contextType, contextId: input.contextId } }); return { application, idempotent: false }; }
