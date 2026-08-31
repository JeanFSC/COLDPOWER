import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getDb } from "@/db";
import { auditLogs, mediaAssets } from "@/db/schema";
import { parseMediaFilters, MediaInvalidFilterError } from "@/lib/media-contract";
import { validateAltText, validateMediaUpload } from "@/lib/media-validation";
import { storageKeyFor, writeMediaFile, removeMediaFile } from "@/lib/media-storage";
import { getMediaPage } from "@/lib/media-repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try { await requireApiPermission("media.view"); return apiSuccess(await getMediaPage(parseMediaFilters(new URL(request.url).searchParams))); }
  catch (error) { if (error instanceof ApiAuthorizationError) return apiError("MEDIA_FORBIDDEN", "No tienes permiso para ver media.", 403); if (error instanceof MediaInvalidFilterError) return apiError("MEDIA_INVALID_FILTER", "Los filtros de media no son válidos.", 400); return apiError("MEDIA_UNAVAILABLE", "No se pudo cargar la biblioteca multimedia.", 503); }
}

export async function POST(request: Request) {
  let storageKey = "";
  try {
    const actor = await requireApiPermission("catalog.media.upload");
    let form: FormData; try { form = await request.formData(); } catch { return apiError("MEDIA_INVALID_FORM", "Formulario multipart inválido.", 400); }
    const file = form.get("file"); if (!(file instanceof File)) return apiError("MEDIA_FILE_REQUIRED", "Selecciona un archivo.", 400);
    const bytes = new Uint8Array(await file.arrayBuffer()); const validation = validateMediaUpload({ mimeType: file.type, size: file.size, bytes }); if (!validation.ok) return apiError("MEDIA_INVALID_FILE", validation.error, 400);
    const content = validation.content ? new TextEncoder().encode(validation.content) : bytes; const contentHash = createHash("sha256").update(content).digest("hex");
    const db = getDb(); const [duplicate] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.contentHash, contentHash), eq(mediaAssets.status, "ACTIVE"), isNull(mediaAssets.deletedAt))).limit(1);
    if (duplicate) return apiSuccess({ asset: { ...duplicate, url: `/api/media/${duplicate.id}` }, deduplicated: true });
    const id = `media-${crypto.randomUUID()}`; storageKey = storageKeyFor(id, validation.mimeType); await writeMediaFile(storageKey, content);
    const filename = file.name.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 255) || id; const width = Number(form.get("width")); const height = Number(form.get("height"));
    const [asset] = await db.transaction(async (tx) => { const [created] = await tx.insert(mediaAssets).values({ id, storageKey, originalFilename: filename, mimeType: validation.mimeType, byteSize: content.byteLength, contentHash, width: Number.isInteger(width) && width > 0 ? width : null, height: Number.isInteger(height) && height > 0 ? height : null, altText: validateAltText(form.get("altText")), uploadedBy: actor.userId }).returning(); await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "media.asset_uploaded", entityType: "media_asset", entityId: id, before: null, after: { mimeType: validation.mimeType, byteSize: content.byteLength, originalFilename: filename, contentHash }, metadata: null }); return [created]; });
    return apiSuccess({ asset: { ...asset, url: `/api/media/${asset.id}` }, deduplicated: false }, 201);
  } catch (error) {
    if (storageKey) await removeMediaFile(storageKey).catch(() => undefined);
    if (error instanceof ApiAuthorizationError) return apiError("MEDIA_UPLOAD_FORBIDDEN", "No tienes permiso para subir media.", 403);
    return apiError("MEDIA_UPLOAD_FAILED", error instanceof Error ? error.message : "No se pudo guardar la media.", 500);
  }
}
