import { and, asc, count, desc, eq, exists, gte, ilike, inArray, isNull, lt, not, or, sum, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, mediaAssetUsages, mediaAssets } from "@/db/schema";
import type { MediaAssetView, MediaFilters, MediaListItem, MediaPageResponse } from "@/lib/media-contract";

const defaultPageSize = 24;
const maxPageSize = 100;
function dayStart(value: string) { return new Date(`${value}T00:00:00-05:00`); }
function dayAfter(value: string) { return new Date(dayStart(value).getTime() + 86_400_000); }
function numberValue(value: unknown) { return Number(value ?? 0); }
function toView(asset: typeof mediaAssets.$inferSelect): MediaAssetView { return { id: asset.id, url: `/api/media/${asset.id}`, originalFilename: asset.originalFilename, mimeType: asset.mimeType, byteSize: asset.byteSize, width: asset.width, height: asset.height, altText: asset.altText, status: asset.status, uploadedBy: asset.uploadedBy, createdAt: asset.createdAt }; }
function whereMedia(filters: MediaFilters) {
  const conditions: SQL[] = [];
  if (filters.query) { const pattern = `%${filters.query.trim()}%`; conditions.push(or(ilike(mediaAssets.originalFilename, pattern), ilike(mediaAssets.altText, pattern))!); }
  if (filters.mimeType) conditions.push(eq(mediaAssets.mimeType, filters.mimeType));
  if (filters.status) conditions.push(eq(mediaAssets.status, filters.status));
  if (!filters.status) conditions.push(eq(mediaAssets.status, "ACTIVE"));
  if (filters.dateFrom) conditions.push(gte(mediaAssets.createdAt, dayStart(filters.dateFrom)));
  if (filters.dateTo) conditions.push(lt(mediaAssets.createdAt, dayAfter(filters.dateTo)));
  const usageExists = exists(getDb().select({ id: mediaAssetUsages.id }).from(mediaAssetUsages).where(eq(mediaAssetUsages.assetId, mediaAssets.id)));
  if (filters.usage === "used") conditions.push(usageExists);
  if (filters.usage === "unused") conditions.push(not(usageExists));
  return conditions.length ? and(...conditions) : undefined;
}

export async function getMediaPage(filters: MediaFilters = {}): Promise<MediaPageResponse> {
  const page = Math.max(1, Math.floor(filters.page ?? 1)); const pageSize = Math.min(maxPageSize, Math.max(1, Math.floor(filters.pageSize ?? defaultPageSize))); const db = getDb(); const where = whereMedia(filters);
  const [rows, totalRows, statusRows, bytesRow, usedRows, mimeFacets, statusFacets] = await Promise.all([
    db.select().from(mediaAssets).where(where).orderBy(desc(mediaAssets.createdAt), asc(mediaAssets.id)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count(mediaAssets.id) }).from(mediaAssets).where(where),
    db.select({ status: mediaAssets.status, total: count(mediaAssets.id) }).from(mediaAssets).where(where).groupBy(mediaAssets.status),
    db.select({ total: sum(mediaAssets.byteSize) }).from(mediaAssets).where(where),
    db.select({ total: count(mediaAssets.id) }).from(mediaAssets).where(where ? and(where, exists(db.select({ id: mediaAssetUsages.id }).from(mediaAssetUsages).where(eq(mediaAssetUsages.assetId, mediaAssets.id)))!) : exists(db.select({ id: mediaAssetUsages.id }).from(mediaAssetUsages).where(eq(mediaAssetUsages.assetId, mediaAssets.id)))),
    db.selectDistinct({ value: mediaAssets.mimeType }).from(mediaAssets).where(where).orderBy(mediaAssets.mimeType),
    db.selectDistinct({ value: mediaAssets.status }).from(mediaAssets).where(where).orderBy(mediaAssets.status),
  ]);
  const ids = rows.map((row) => row.id); const usageRows = ids.length ? await db.select({ assetId: mediaAssetUsages.assetId, total: count(mediaAssetUsages.id) }).from(mediaAssetUsages).where(inArray(mediaAssetUsages.assetId, ids)).groupBy(mediaAssetUsages.assetId) : [];
  const usageMap = new Map(usageRows.map((row) => [row.assetId, numberValue(row.total)])); const totalItems = numberValue(totalRows[0]?.total); const statusMap = new Map(statusRows.map((row) => [row.status, numberValue(row.total)])); const used = numberValue(usedRows[0]?.total);
  return { items: rows.map((row) => ({ ...toView(row), usageCount: usageMap.get(row.id) ?? 0, updatedAt: row.updatedAt })), page: Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))), pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)), metrics: { total: totalItems, active: statusMap.get("ACTIVE") ?? 0, archived: statusMap.get("ARCHIVED") ?? 0, used, unused: Math.max(0, totalItems - used), totalBytes: numberValue(bytesRow[0]?.total) }, facets: { mimeTypes: mimeFacets.map((row) => row.value), statuses: statusFacets.map((row) => row.value) } };
}

export async function listMediaAssets(search?: string) { const result = await getMediaPage({ query: search, page: 1, pageSize: 100 }); return result.items.map((asset) => asset as MediaAssetView); }
export async function getMediaAsset(id: string) { const [asset] = await getDb().select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1); return asset; }
export async function getMediaDetail(id: string) { const db = getDb(); const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1); if (!asset) return null; const [usages, audit] = await Promise.all([db.select().from(mediaAssetUsages).where(eq(mediaAssetUsages.assetId, id)).orderBy(asc(mediaAssetUsages.createdAt)), db.select().from(auditLogs).where(and(eq(auditLogs.entityType, "media_asset"), eq(auditLogs.entityId, id))).orderBy(desc(auditLogs.createdAt))]); return { asset: { ...toView(asset), usageCount: usages.length }, usages, audit }; }
export async function getPublishedMediaForEntities(entityType: string, entityIds: string[]) { if (!entityIds.length) return new Map<string, string[]>(); const rows = await getDb().select({ entityId: mediaAssetUsages.entityId, assetId: mediaAssets.id, sortOrder: mediaAssetUsages.sortOrder }).from(mediaAssetUsages).innerJoin(mediaAssets, eq(mediaAssetUsages.assetId, mediaAssets.id)).where(and(eq(mediaAssetUsages.entityType, entityType), inArray(mediaAssetUsages.entityId, entityIds), eq(mediaAssets.status, "ACTIVE"), isNull(mediaAssets.deletedAt))).orderBy(asc(mediaAssetUsages.sortOrder), asc(mediaAssets.createdAt)); const result = new Map<string, string[]>(); for (const row of rows) result.set(row.entityId, [...(result.get(row.entityId) ?? []), `/api/media/${row.assetId}`]); return result; }

export async function getPublishedMediaSlots(entityType: string, entityId: string) {
  const rows = await getDb()
    .select({ slot: mediaAssetUsages.slot, assetId: mediaAssets.id, sortOrder: mediaAssetUsages.sortOrder })
    .from(mediaAssetUsages)
    .innerJoin(mediaAssets, eq(mediaAssetUsages.assetId, mediaAssets.id))
    .where(
      and(
        eq(mediaAssetUsages.entityType, entityType),
        eq(mediaAssetUsages.entityId, entityId),
        eq(mediaAssets.status, "ACTIVE"),
        isNull(mediaAssets.deletedAt),
      ),
    )
    .orderBy(asc(mediaAssetUsages.slot), asc(mediaAssetUsages.sortOrder), asc(mediaAssets.createdAt));
  const result = new Map<string, string>();
  for (const row of rows) if (!result.has(row.slot)) result.set(row.slot, `/api/media/${row.assetId}`);
  return result;
}
