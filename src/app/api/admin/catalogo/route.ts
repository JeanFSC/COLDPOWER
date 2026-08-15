import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { parseCatalogFilters } from "@/lib/catalog-admin-contract";
import { createManualProduct } from "@/lib/catalog-product-service";
import { getAdminCatalogPage } from "@/lib/catalog-admin-service";

export async function GET(request: Request) {
  try {
    await requireApiPermission("catalog.product.view");
    return apiSuccess(await getAdminCatalogPage(parseCatalogFilters(new URL(request.url).searchParams)));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CATALOG_FORBIDDEN", "No tienes permiso para ver el catálogo.", 403);
    if (error instanceof Error && error.message === "CATALOG_INVALID_FILTER") return apiError("CATALOG_INVALID_FILTER", "Los filtros del catálogo no son válidos.", 400);
    return apiError("CATALOG_UNAVAILABLE", "No se pudo cargar el catálogo.", 503);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("catalog.product.create");
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("CATALOG_VALIDATION_ERROR", "JSON inválido.", 400); }
    if (!body || typeof body !== "object") return apiError("CATALOG_VALIDATION_ERROR", "Los datos del producto no son válidos.", 400);
    const value = body as Record<string, unknown>;
    if (["originalName", "normalizedName", "sourcePage", "sourceRow", "sourceStatus"].some((key) => key in value)) return apiError("CATALOG_VALIDATION_ERROR", "La identidad importada no se puede enviar en una creación manual.", 400);
    const result = await createManualProduct({ sku: String(value.sku ?? ""), commercialName: String(value.commercialName ?? ""), categoryId: String(value.categoryId ?? ""), familyId: String(value.familyId ?? ""), brandId: value.brandId == null ? null : String(value.brandId), productType: value.productType == null ? undefined : String(value.productType) }, actor);
    return apiSuccess({ product: result }, 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CATALOG_FORBIDDEN", "No tienes permiso para crear productos.", 403);
    if (error instanceof Error && error.message === "CATALOG_VALIDATION_ERROR") return apiError("CATALOG_VALIDATION_ERROR", "Los datos del producto no son válidos o el SKU ya existe.", 400);
    return apiError("CATALOG_UNAVAILABLE", "No se pudo crear el producto.", 503);
  }
}
