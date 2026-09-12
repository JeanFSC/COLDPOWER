import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { commitCatalogImport, previewCatalogImport } from "@/lib/catalog-import-service";
import { clearPublicCatalogRuntimeCache } from "@/lib/catalog-repository";

const maxImportBytes = 15 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("catalog.product.create");
    const formData = await request.formData();
    const file = formData.get("file");
    const mode = formData.get("mode");
    if (!(file instanceof File) || !file.size) return apiError("CATALOG_IMPORT_FILE_REQUIRED", "Selecciona un archivo XLSX o CSV.", 400);
    if (file.size > maxImportBytes) return apiError("CATALOG_IMPORT_FILE_TOO_LARGE", "El archivo supera el límite de 15 MB.", 413);
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return apiError("CATALOG_IMPORT_UNSUPPORTED_FILE", "El archivo debe ser XLSX, XLS o CSV.", 400);
    if (mode !== "dry-run" && mode !== "commit") return apiError("CATALOG_IMPORT_MODE_REQUIRED", "Indica si deseas validar o confirmar la importación.", 400);
    const data = await file.arrayBuffer();
    if (mode === "dry-run") return apiSuccess({ preview: await previewCatalogImport(data, file.name) });
    const result = await commitCatalogImport(data, file.name, actor);
    clearPublicCatalogRuntimeCache();
    return apiSuccess({ result }, 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CATALOG_FORBIDDEN", "No tienes permiso para importar productos.", 403);
    if (error instanceof Error && error.message === "CATALOG_IMPORT_EMPTY") return apiError("CATALOG_IMPORT_EMPTY", "El archivo no contiene filas para importar.", 400);
    if (error instanceof Error && error.message.startsWith("CATALOG_IMPORT_INVALID:")) return apiError("CATALOG_IMPORT_INVALID", "Corrige los errores y columnas no mapeadas antes de confirmar.", 400, { invalidRows: Number(error.message.split(":")[1]) });
    if (error instanceof Error && error.message === "CATALOG_IMPORT_TAXONOMY_CHANGED") return apiError("CATALOG_IMPORT_CONFLICT", "La taxonomía cambió mientras validabas el archivo. Ejecuta la previsualización otra vez.", 409);
    return apiError("CATALOG_IMPORT_UNAVAILABLE", "No se pudo procesar la importación.", 503);
  }
}
