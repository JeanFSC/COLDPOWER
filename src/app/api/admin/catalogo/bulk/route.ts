import { eq, inArray } from "drizzle-orm";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getDb } from "@/db";
import { auditLogs, products } from "@/db/schema";
import { canTransitionPublication, type PublicationStatus } from "@/lib/catalog-admin-contract";
import { evaluatePublication } from "@/lib/publication-governance";

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { ids?: unknown; action?: unknown };
    const ids = Array.isArray(body.ids) ? [...new Set(body.ids.filter((id): id is string => typeof id === "string" && id.length > 0))].slice(0, 100) : [];
    const action = body.action;
    if (!ids.length || (action !== "publish" && action !== "review" && action !== "hide")) return apiError("CATALOG_BULK_VALIDATION_ERROR", "Selecciona productos y una acción válida.", 400);
    const requiredPermission = action === "review" ? "catalog.product.review" : "catalog.product.publish";
    const actor = await requireApiPermission(requiredPermission);
    const targetStatus: PublicationStatus = action === "publish" ? "published" : action === "review" ? "review" : "hidden";
    const db = getDb();
    const result = await db.transaction(async (tx) => {
      const rows = await tx.select({ id: products.id, sku: products.sku, normalizedName: products.normalizedName, originalName: products.originalName, productType: products.productType, sourceStatus: products.status, publicationStatus: products.publicationStatus, requiresReview: products.requiresReview, reviewReason: products.reviewReason, possibleDuplicate: products.possibleDuplicate, duplicateDecision: products.duplicateDecision, editorialDescription: products.editorialDescription }).from(products).where(inArray(products.id, ids));
      const byId = new Map(rows.map((row) => [row.id, row]));
      const failed: Array<{ id: string; sku: string; reason: string }> = [];
      let updated = 0;
      for (const id of ids) {
        const product = byId.get(id);
        if (!product) { failed.push({ id, sku: id, reason: "La referencia ya no existe." }); continue; }
        if (product.publicationStatus === targetStatus) { updated += 1; continue; }
        if (!canTransitionPublication(product.publicationStatus, targetStatus)) { failed.push({ id, sku: product.sku, reason: `No existe transición válida desde ${product.publicationStatus}.` }); continue; }
        const nextRequiresReview = action === "review" ? true : product.requiresReview;
        const nextReviewReason = action === "review" ? "Revisión editorial solicitada" : product.reviewReason;
        if (action === "publish") {
          const decision = evaluatePublication({ ...product, publicationStatus: targetStatus, isCommercialLine: Boolean(product.productType.trim()) });
          if (!decision.public) { failed.push({ id, sku: product.sku, reason: decision.reasons.join("; ") }); continue; }
        }
        const before = { publicationStatus: product.publicationStatus, requiresReview: product.requiresReview, reviewReason: product.reviewReason };
        await tx.update(products).set({ publicationStatus: targetStatus, requiresReview: nextRequiresReview, reviewReason: nextReviewReason, publicationChangedBy: actor.userId, publicationChangedAt: new Date(), publicationNote: `Acción masiva: ${action}` }).where(eq(products.id, id));
        await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "PRODUCT_PUBLICATION_CHANGED", entityType: "product", entityId: id, before, after: { publicationStatus: targetStatus, requiresReview: nextRequiresReview, reviewReason: nextReviewReason }, metadata: { bulkAction: action, sku: product.sku } });
        updated += 1;
      }
      await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "CATALOG_BULK_ACTION", entityType: "catalog", entityId: "catalog", before: null, after: { action, requested: ids.length, updated, failed: failed.length }, metadata: { ids } });
      return { action, requested: ids.length, updated, failed };
    });
    const message = result.failed.length ? `${result.updated} productos actualizados; ${result.failed.length} requieren atención.` : `${result.updated} productos actualizados correctamente.`;
    return apiSuccess({ ...result, message });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CATALOG_FORBIDDEN", "No tienes permiso para ejecutar esta acción.", 403);
    return apiError("CATALOG_BULK_UNAVAILABLE", "No se pudo completar la acción masiva. No se aplicaron cambios.", 503);
  }
}
