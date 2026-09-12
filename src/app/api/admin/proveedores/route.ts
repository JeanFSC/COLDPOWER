import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { createSupplier, findSupplierDuplicates, listSuppliers } from "@/lib/purchases-service";
import { validateSupplierInput } from "@/lib/purchases-validation";

export async function GET(request: Request) {
  try {
    await requireApiPermission("purchases.view");
    const params = new URL(request.url).searchParams;
    if (
      params.has("name") ||
      params.has("country") ||
      params.has("identification") ||
      params.has("email")
    )
      return apiSuccess({
        duplicates: await findSupplierDuplicates({
          name: params.get("name")?.trim() ?? "",
          country: params.get("country")?.trim().toUpperCase() ?? "",
          identification: params.get("identification")?.trim() || null,
          email: params.get("email")?.trim().toLowerCase() || null,
        }),
      });
    return apiSuccess({ suppliers: await listSuppliers() });
  } catch (error) {
    if (error instanceof ApiAuthorizationError)
      return apiError("SUPPLIERS_FORBIDDEN", "No tienes permiso para ver proveedores.", 403);
    return apiError("SUPPLIERS_UNAVAILABLE", "No se pudieron cargar los proveedores.", 503);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("purchases.manage");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("INVALID_JSON", "JSON inválido.", 400);
    }
    return apiSuccess({ supplier: await createSupplier(validateSupplierInput(body), actor) }, 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError)
      return apiError("SUPPLIERS_FORBIDDEN", "No tienes permiso para crear proveedores.", 403);
    return apiError(
      "SUPPLIER_NOT_CREATED",
      error instanceof Error ? error.message : "No se pudo crear el proveedor.",
      400,
    );
  }
}
