import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { applyPricingImport, previewPricingImport } from "@/lib/pricing-import-service";
import { clearPublicCatalogRuntimeCache } from "@/lib/catalog-repository";

const maxImportBytes = 15 * 1024 * 1024;

function mapError(error: unknown) {
  if (error instanceof ApiAuthorizationError) return apiError("PRICING_FORBIDDEN", "No tienes permiso para importar precios.", 403);
  const message = error instanceof Error ? error.message : "No se pudo procesar la importación.";
  if (message === "PRICING_IMPORT_EMPTY") return apiError(message, "El archivo no contiene filas para importar.", 400);
  if (message.startsWith("PRICING_IMPORT_PREFLIGHT_FAILED:")) return apiError("PRICING_IMPORT_PREFLIGHT_FAILED", "Corrige las filas bloqueadas antes de aplicar la lista.", 400, { errors: Number(message.split(":")[1]) });
  if (message === "PRICING_IMPORT_STALE") return apiError(message, "Los precios cambiaron mientras revisabas el archivo. Ejecuta el dry-run otra vez.", 409);
  return apiError("PRICING_IMPORT_UNAVAILABLE", "No se pudo procesar la importación.", 503);
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("pricing.edit");
    const formData = await request.formData();
    const file = formData.get("file");
    const mode = formData.get("mode");
    const reason = typeof formData.get("reason") === "string" ? String(formData.get("reason")).trim() : "";
    if (!(file instanceof File) || !file.size) return apiError("PRICING_IMPORT_FILE_REQUIRED", "Selecciona un archivo XLSX o CSV.", 400);
    if (file.size > maxImportBytes) return apiError("PRICING_IMPORT_FILE_TOO_LARGE", "El archivo supera el límite de 15 MB.", 413);
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return apiError("PRICING_IMPORT_UNSUPPORTED_FILE", "El archivo debe ser XLSX, XLS o CSV.", 400);
    if (mode !== "dry-run" && mode !== "apply") return apiError("PRICING_IMPORT_MODE_REQUIRED", "Indica si deseas validar o aplicar la lista.", 400);
    const data = await file.arrayBuffer();
    if (mode === "dry-run") return apiSuccess({ preview: await previewPricingImport(data, file.name, actor, reason) });
    const result = await applyPricingImport(data, file.name, actor, reason);
    clearPublicCatalogRuntimeCache();
    return apiSuccess({ result });
  } catch (error) {
    return mapError(error);
  }
}
