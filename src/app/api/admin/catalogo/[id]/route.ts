import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { auditLogs, products } from "@/db/schema";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { getAdminCatalogProductDetail } from "@/lib/catalog-admin-service";
import { clearPublicCatalogRuntimeCache } from "@/lib/catalog-repository";
import { can } from "@/lib/roles";

function parseProductEditorial(body: unknown) {
  const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const commercialName = value.commercialName === null ? null : typeof value.commercialName === "string" ? value.commercialName.trim().slice(0, 500) || null : undefined;
  const editorialDescription = value.editorialDescription === null ? null : typeof value.editorialDescription === "string" ? value.editorialDescription.trim().slice(0, 4000) || null : undefined;
  const featured = typeof value.featured === "boolean" ? value.featured : undefined;
  const editorialCategoryId = value.editorialCategoryId === null ? null : typeof value.editorialCategoryId === "string" ? value.editorialCategoryId.trim() || null : undefined;
  const editorialFamilyId = value.editorialFamilyId === null ? null : typeof value.editorialFamilyId === "string" ? value.editorialFamilyId.trim() || null : undefined;
  const editorialBrandId = value.editorialBrandId === null ? null : typeof value.editorialBrandId === "string" ? value.editorialBrandId.trim() || null : undefined;
  if (commercialName === undefined && editorialDescription === undefined && featured === undefined && editorialCategoryId === undefined && editorialFamilyId === undefined && editorialBrandId === undefined) return null;
  return { commercialName, editorialDescription, featured, editorialCategoryId, editorialFamilyId, editorialBrandId };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("catalog.product.view");
    const { id } = await params;
    const canViewPricing = can(actor.role, "pricing.cost.view") && can(actor.role, "pricing.margin.view");
    return NextResponse.json({ product: await getAdminCatalogProductDetail(id, canViewPricing) });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CATALOG_FORBIDDEN", "No tienes permiso para ver el producto.", 403);
    if (error instanceof Error && error.message === "CATALOG_PRODUCT_NOT_FOUND") return apiError("CATALOG_PRODUCT_NOT_FOUND", "Producto no encontrado.", 404);
    return apiError("CATALOG_UNAVAILABLE", "No se pudo cargar el producto.", 503);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiPermission("catalog.product.edit");
    const { id } = await params;
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("CATALOG_VALIDATION_ERROR", "JSON inválido.", 400); }
    const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
    if (["sku", "originalName", "normalizedName", "categoryId", "familyId", "brandId"].some((key) => key in value)) return apiError("CATALOG_VALIDATION_ERROR", "La identidad y taxonomía fuente no se modifican desde el editor comercial.", 400);
    const input = parseProductEditorial(body);
    if (!input) return apiError("CATALOG_VALIDATION_ERROR", "No hay campos editoriales válidos.", 400);
    const result = await getDb().transaction(async (tx) => {
      const [before] = await tx.select({ id: products.id, sku: products.sku, originalName: products.originalName, commercialName: products.commercialName, editorialDescription: products.editorialDescription, featured: products.featured, editorialCategoryId: products.editorialCategoryId, editorialFamilyId: products.editorialFamilyId, editorialBrandId: products.editorialBrandId }).from(products).where(eq(products.id, id)).limit(1);
      if (!before) throw new Error("Producto no encontrado.");
      const afterValues: Partial<typeof products.$inferInsert> = { updatedAt: new Date() };
      if (input.commercialName !== undefined) afterValues.commercialName = input.commercialName;
      if (input.editorialDescription !== undefined) afterValues.editorialDescription = input.editorialDescription;
      if (input.featured !== undefined) afterValues.featured = input.featured;
      if (input.editorialCategoryId !== undefined) afterValues.editorialCategoryId = input.editorialCategoryId;
      if (input.editorialFamilyId !== undefined) afterValues.editorialFamilyId = input.editorialFamilyId;
      if (input.editorialBrandId !== undefined) afterValues.editorialBrandId = input.editorialBrandId;
      const [after] = await tx.update(products).set(afterValues).where(eq(products.id, id)).returning({ id: products.id, sku: products.sku, originalName: products.originalName, commercialName: products.commercialName, editorialDescription: products.editorialDescription, featured: products.featured, editorialCategoryId: products.editorialCategoryId, editorialFamilyId: products.editorialFamilyId, editorialBrandId: products.editorialBrandId });
      await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "PRODUCT_EDITORIAL_UPDATED", entityType: "product", entityId: id, before, after, metadata: null });
      return after;
    });
    clearPublicCatalogRuntimeCache();
    return NextResponse.json({ product: result });
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CATALOG_FORBIDDEN", "No tienes permiso para editar productos.", 403);
    const message = error instanceof Error ? error.message : "No se pudo actualizar el producto.";
    if (message.includes("no encontrado")) return apiError("CATALOG_PRODUCT_NOT_FOUND", message, 404);
    return apiError("CATALOG_UNAVAILABLE", message, 409);
  }
}

