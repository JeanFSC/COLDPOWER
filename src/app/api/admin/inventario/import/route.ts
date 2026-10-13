import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { applyStockImport, previewStockImport } from "@/lib/stock-import-service";
import { stockImportErrorMessage } from "@/lib/stock-import-error";

export async function POST(request: Request) {
  try {
    const actor = await requireApiPermission("inventory.adjust");
    const form = await request.formData();
    const file = form.get("file");
    const mode = form.get("mode");
    if (!(file instanceof File) || !file.size || !/\.(xlsx|xls|csv)$/i.test(file.name)) return apiError("STOCK_IMPORT_FILE_REQUIRED", "Selecciona un archivo XLSX, XLS o CSV con contenido.", 400);
    if (file.size > 5 * 1024 * 1024) return apiError("STOCK_IMPORT_TOO_LARGE", "El archivo supera 5 MB.", 413);
    if (mode !== "preview" && mode !== "apply") return apiError("STOCK_IMPORT_MODE_INVALID", "Selecciona validar o aplicar.", 400);
    const bytes = await file.arrayBuffer();
    if (mode === "preview") return apiSuccess({ preview: await previewStockImport(bytes) });
    const fingerprint = form.get("fingerprint");
    if (typeof fingerprint !== "string" || !/^[a-f0-9]{64}$/.test(fingerprint)) return apiError("STOCK_IMPORT_PREVIEW_REQUIRED", "Valida el archivo antes de confirmar.", 400);
    return apiSuccess({ result: await applyStockImport(bytes, file.name, fingerprint, actor) }, 201);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("STOCK_IMPORT_FORBIDDEN", "No tienes permiso para importar stock.", 403);
    return apiError("STOCK_IMPORT_FAILED", stockImportErrorMessage(error), 409);
  }
}
