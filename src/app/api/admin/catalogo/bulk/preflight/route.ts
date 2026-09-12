import { inArray } from "drizzle-orm";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { canTransitionPublication } from "@/lib/catalog-admin-contract";
import { evaluatePublication } from "@/lib/publication-governance";

export async function POST(request: Request) {
  try {
    await requireApiPermission("catalog.product.publish");
    const body = await request.json() as { ids?: unknown; action?: unknown };
    const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string" && id.length > 0).slice(0, 100) : [];
    if (!ids.length || body.action !== "publish") return apiError("CATALOG_BULK_VALIDATION_ERROR", "Selecciona productos y una acción de publicación válida.", 400);
    const rows = await getDb().select({ id: products.id, sku: products.sku, normalizedName: products.normalizedName, originalName: products.originalName, productType: products.productType, sourceStatus: products.status, publicationStatus: products.publicationStatus, requiresReview: products.requiresReview, reviewReason: products.reviewReason, possibleDuplicate: products.possibleDuplicate, duplicateDecision: products.duplicateDecision, editorialDescription: products.editorialDescription }).from(products).where(inArray(products.id, ids));
    const byId = new Map(rows.map((row) => [row.id, row]));
    const blocked: Array<{ id: string; sku: string; name: string; reasons: string[] }> = [];
    for (const id of ids) {
      const product = byId.get(id);
      if (!product) { blocked.push({ id, sku: id, name: "Producto no encontrado", reasons: ["La referencia ya no existe."] }); continue; }
      const decision = evaluatePublication({ ...product, publicationStatus: "published", isCommercialLine: Boolean(product.productType.trim()) });
      const transitionAllowed = product.publicationStatus === "published" || canTransitionPublication(product.publicationStatus, "published");
      if (!transitionAllowed) decision.reasons.push(`No existe transición válida desde ${product.publicationStatus}.`);
      if (!decision.public || !transitionAllowed) blocked.push({ id, sku: product.sku, name: product.normalizedName || product.originalName, reasons: decision.reasons });
    }
    return apiSuccess({ totalSelected: ids.length, eligible: ids.length - blocked.length, blocked });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CATALOG_FORBIDDEN", "No tienes permiso para publicar productos.", 403);
    return apiError("CATALOG_BULK_PREFLIGHT_UNAVAILABLE", "No se pudo ejecutar la revisión previa de publicación.", 503);
  }
}
