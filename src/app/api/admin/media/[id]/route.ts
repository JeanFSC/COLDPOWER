import { and, eq, isNull } from "drizzle-orm";
import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getDb } from "@/db";
import { auditLogs, mediaAssetUsages, mediaAssets } from "@/db/schema";
import { validateAltText } from "@/lib/media-validation";
import { getMediaDetail } from "@/lib/media-repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireApiPermission("media.view"); const { id } = await params; const detail = await getMediaDetail(id); return detail ? apiSuccess(detail) : apiError("MEDIA_NOT_FOUND", "Media no encontrada.", 404); }
  catch (error) { if (error instanceof ApiAuthorizationError) return apiError("MEDIA_FORBIDDEN", "No tienes permiso para ver media.", 403); return apiError("MEDIA_DETAIL_UNAVAILABLE", "No se pudo cargar el detalle de media.", 503); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = await requireApiPermission("media.edit"); const { id } = await params; let body: unknown; try { body = await request.json(); } catch { return apiError("INVALID_JSON", "JSON inválido.", 400); } const value = body && typeof body === "object" ? body as Record<string, unknown> : {}; if (!("altText" in value)) return apiError("MEDIA_ALT_REQUIRED", "altText es obligatorio para editar media.", 400); const [asset] = await getDb().select().from(mediaAssets).where(and(eq(mediaAssets.id, id), isNull(mediaAssets.deletedAt))).limit(1); if (!asset) return apiError("MEDIA_NOT_FOUND", "Media no encontrada.", 404); const altText = validateAltText(value.altText); const [updated] = await getDb().transaction(async (tx) => { const [row] = await tx.update(mediaAssets).set({ altText, updatedAt: new Date() }).where(eq(mediaAssets.id, id)).returning(); await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "media.asset_updated", entityType: "media_asset", entityId: id, before: { altText: asset.altText }, after: { altText }, metadata: null }); return [row]; }); return apiSuccess({ asset: { ...updated, url: `/api/media/${updated.id}` } }); }
  catch (error) { if (error instanceof ApiAuthorizationError) return apiError("MEDIA_EDIT_FORBIDDEN", "No tienes permiso para editar media.", 403); return apiError("MEDIA_UPDATE_FAILED", error instanceof Error ? error.message : "No se pudo editar la media.", 400); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = await requireApiPermission("media.delete"); const { id } = await params; const result = await getDb().transaction(async (tx) => { const [asset] = await tx.select().from(mediaAssets).where(and(eq(mediaAssets.id, id), isNull(mediaAssets.deletedAt))).limit(1); if (!asset) throw new Error("MEDIA_NOT_FOUND"); const [usage] = await tx.select({ id: mediaAssetUsages.id }).from(mediaAssetUsages).where(eq(mediaAssetUsages.assetId, id)).limit(1); if (usage) throw new Error("MEDIA_IN_USE"); const [updated] = await tx.update(mediaAssets).set({ status: "ARCHIVED", deletedAt: new Date(), updatedAt: new Date() }).where(eq(mediaAssets.id, id)).returning(); await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "media.asset_archived", entityType: "media_asset", entityId: id, before: { status: asset.status }, after: { status: updated.status }, metadata: null }); return updated; }); return apiSuccess({ asset: result }); }
  catch (error) { if (error instanceof ApiAuthorizationError) return apiError("MEDIA_DELETE_FORBIDDEN", "No tienes permiso para archivar media.", 403); const message = error instanceof Error ? error.message : "No se pudo archivar la media."; if (message === "MEDIA_NOT_FOUND") return apiError(message, "Media no encontrada.", 404); if (message === "MEDIA_IN_USE") return apiError(message, "No se puede archivar media en uso. Desasocia primero sus usos.", 409); return apiError("MEDIA_ARCHIVE_FAILED", message, 409); }
}
