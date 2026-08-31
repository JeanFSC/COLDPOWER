import { and, asc, count, desc, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, cmsBlocks, cmsPageRevisions, cmsPages, mediaAssets } from "@/db/schema";
import { collectCmsMediaIds, validateCmsBlocks, validateCmsPageSlug, type CmsBlockInput, type ValidatedCmsBlock } from "@/lib/cms-validation";

type CmsAction = "DRAFT" | "PUBLISH" | "UNPUBLISH" | "RESTORE";
type RevisionBlock = { key: string; type: ValidatedCmsBlock["type"]; order: number; status: "draft" | "published"; payload: Record<string, unknown> };
const pageSizeLimit = 100;

function pageBlockInput(block: typeof cmsBlocks.$inferSelect): RevisionBlock { return { key: block.blockKey, type: block.type, order: block.sortOrder, status: block.status === "PUBLISHED" ? "published" : "draft", payload: block.payload }; }
function revisionBlocks(revision: typeof cmsPageRevisions.$inferSelect): RevisionBlock[] { return Array.isArray(revision.payload.blocks) ? revision.payload.blocks as RevisionBlock[] : []; }
function revisionView(revision: typeof cmsPageRevisions.$inferSelect) { return { id: revision.id, version: revision.version, status: revision.status, title: revision.title, summary: revision.summary, createdBy: revision.createdBy, createdAt: revision.createdAt, payload: revision.payload }; }

export async function getCmsPage(slug: string, publishedOnly = false) {
  const pageSlug = validateCmsPageSlug(slug);
  if (!pageSlug) return null;
  const db = getDb();
  const [page] = await db.select().from(cmsPages).where(and(eq(cmsPages.slug, pageSlug), ...(publishedOnly ? [eq(cmsPages.status, "PUBLISHED")] : []))).limit(1);
  if (!page) return null;
  const [blocks, revisions] = await Promise.all([
    db.select().from(cmsBlocks).where(and(eq(cmsBlocks.pageId, page.id), ...(publishedOnly ? [eq(cmsBlocks.status, "PUBLISHED")] : []))).orderBy(asc(cmsBlocks.sortOrder)),
    publishedOnly ? Promise.resolve([]) : db.select().from(cmsPageRevisions).where(eq(cmsPageRevisions.pageId, page.id)).orderBy(desc(cmsPageRevisions.version)).limit(10),
  ]);
  const latestRevision = revisions[0] ?? null;
  const currentBlocks = latestRevision ? revisionBlocks(latestRevision).map((block, index) => ({ id: `revision-${latestRevision.id}-${index}`, pageId: page.id, blockKey: block.key, type: block.type, payload: block.payload, sortOrder: block.order, status: block.status === "published" ? "PUBLISHED" : "DRAFT", updatedBy: latestRevision.createdBy, createdAt: latestRevision.createdAt, updatedAt: latestRevision.createdAt })) : blocks;
  return { page, blocks: currentBlocks, latestRevision: latestRevision ? revisionView(latestRevision) : null, history: revisions.map(revisionView) };
}

async function ensureMediaReferences(tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0], blocks: ValidatedCmsBlock[]) {
  const ids = collectCmsMediaIds(blocks.map((block) => block.payload));
  if (!ids.length) return;
  const active = await tx.select({ id: mediaAssets.id }).from(mediaAssets).where(and(inArray(mediaAssets.id, ids), eq(mediaAssets.status, "ACTIVE"), isNull(mediaAssets.deletedAt)));
  if (active.length !== ids.length) throw new Error("CMS_MEDIA_INVALID");
}

async function synchronizeBlocks(tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0], pageId: string, blocks: ValidatedCmsBlock[], status: "DRAFT" | "PUBLISHED", actorId: string) {
  const current = await tx.select().from(cmsBlocks).where(eq(cmsBlocks.pageId, pageId));
  const keys = blocks.map((block) => block.key);
  if (keys.length) await tx.delete(cmsBlocks).where(and(eq(cmsBlocks.pageId, pageId), notInArray(cmsBlocks.blockKey, keys)));
  else await tx.delete(cmsBlocks).where(eq(cmsBlocks.pageId, pageId));
  if (current.length) await tx.update(cmsBlocks).set({ sortOrder: sql`${cmsBlocks.sortOrder} + 1000000` }).where(eq(cmsBlocks.pageId, pageId));
  const currentByKey = new Map(current.map((block) => [block.blockKey, block]));
  for (const block of blocks) {
    const existing = currentByKey.get(block.key);
    const values = { type: block.type, payload: block.payload, sortOrder: block.order, status, updatedBy: actorId, updatedAt: new Date() };
    if (existing) await tx.update(cmsBlocks).set(values).where(eq(cmsBlocks.id, existing.id));
    else await tx.insert(cmsBlocks).values({ id: `cms-block-${crypto.randomUUID()}`, pageId, blockKey: block.key, ...values });
  }
}

function summarize(action: CmsAction, blocks: ValidatedCmsBlock[], reason?: string) { return `${action}: ${blocks.length} bloques${reason?.trim() ? ` · ${reason.trim().slice(0, 180)}` : ""}`; }

export async function saveCmsPage(slug: string, title: string, inputBlocks: unknown, status: "DRAFT" | "PUBLISHED", actorId: string, options: { action?: CmsAction; revisionId?: string; reason?: string } = {}) {
  const pageSlug = validateCmsPageSlug(slug);
  if (!pageSlug) throw new Error("CMS_PAGE_INVALID");
  const action = options.action ?? (status === "PUBLISHED" ? "PUBLISH" : "DRAFT");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(cmsPages).where(eq(cmsPages.slug, pageSlug)).limit(1);
    let revisionSource: typeof cmsPageRevisions.$inferSelect | null = null;
    if (action === "RESTORE") {
      if (!existing || !options.revisionId) throw new Error("CMS_REVISION_NOT_FOUND");
      [revisionSource] = await tx.select().from(cmsPageRevisions).where(and(eq(cmsPageRevisions.id, options.revisionId), eq(cmsPageRevisions.pageId, existing.id))).limit(1);
      if (!revisionSource) throw new Error("CMS_REVISION_NOT_FOUND");
    }
    let rawBlocks = action === "RESTORE" ? revisionBlocks(revisionSource!) : inputBlocks;
    if (rawBlocks === undefined || action === "UNPUBLISH") {
      const current = await tx.select().from(cmsBlocks).where(eq(cmsBlocks.pageId, existing?.id ?? "")).orderBy(asc(cmsBlocks.sortOrder));
      rawBlocks = current.map(pageBlockInput);
    }
    const validated = validateCmsBlocks(rawBlocks);
    if (!validated.ok) throw new Error(validated.error);
    await ensureMediaReferences(tx, validated.blocks);
    const nextVersion = (existing?.version ?? 0) + 1;
    const nextTitle = (action === "RESTORE" ? revisionSource?.title : title)?.trim().slice(0, 200) || pageSlug;
    const nextPageStatus: "DRAFT" | "PUBLISHED" = action === "PUBLISH" || (action === "RESTORE" && status === "PUBLISHED") ? "PUBLISHED" : action === "UNPUBLISH" ? "DRAFT" : existing?.status ?? "DRAFT";
    const [page] = existing
      ? await tx.update(cmsPages).set({ title: nextTitle, status: nextPageStatus, version: nextVersion, updatedBy: actorId, updatedAt: new Date() }).where(eq(cmsPages.id, existing.id)).returning()
      : await tx.insert(cmsPages).values({ id: `cms-page-${crypto.randomUUID()}`, slug: pageSlug, title: nextTitle, status: nextPageStatus, version: nextVersion, updatedBy: actorId }).returning();
    const revisionStatus: "DRAFT" | "PUBLISHED" = nextPageStatus === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
    const [revision] = await tx.insert(cmsPageRevisions).values({ id: `cms-revision-${crypto.randomUUID()}`, pageId: page.id, version: nextVersion, title: nextTitle, payload: { blocks: validated.blocks as unknown as Array<Record<string, unknown>> }, status: revisionStatus, summary: summarize(action, validated.blocks, options.reason), createdBy: actorId }).returning();
    const shouldSynchronize = action === "PUBLISH" || action === "UNPUBLISH" || (action === "DRAFT" && nextPageStatus === "DRAFT") || (action === "RESTORE" && nextPageStatus === "PUBLISHED");
    if (shouldSynchronize) await synchronizeBlocks(tx, page.id, validated.blocks, nextPageStatus === "PUBLISHED" ? "PUBLISHED" : "DRAFT", actorId);
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId, actorRole: null, action: action === "PUBLISH" ? "cms.page_published" : action === "UNPUBLISH" ? "cms.page_unpublished" : action === "RESTORE" ? "cms.page_restored" : "cms.page_draft_saved", entityType: "cms_page", entityId: page.id, before: existing ? { status: existing.status, version: existing.version } : null, after: { status: page.status, version: page.version, revisionId: revision.id }, metadata: { reason: options.reason?.trim() || "Cambio editorial" } });
    return { page, blocks: validated.blocks, revision: revisionView(revision) };
  });
}

export async function getCmsRevisions(slug: string, requestedPage = 1, requestedPageSize = 25) {
  const pageSlug = validateCmsPageSlug(slug); if (!pageSlug) throw new Error("CMS_PAGE_INVALID");
  const page = Math.max(1, Math.floor(requestedPage)); const pageSize = Math.min(pageSizeLimit, Math.max(1, Math.floor(requestedPageSize)));
  const db = getDb(); const [cmsPage] = await db.select().from(cmsPages).where(eq(cmsPages.slug, pageSlug)).limit(1); if (!cmsPage) return { items: [], page: 1, pageSize, totalItems: 0, totalPages: 1 };
  const [rows, totalRows] = await Promise.all([db.select().from(cmsPageRevisions).where(eq(cmsPageRevisions.pageId, cmsPage.id)).orderBy(desc(cmsPageRevisions.version)).limit(pageSize).offset((page - 1) * pageSize), db.select({ total: count(cmsPageRevisions.id) }).from(cmsPageRevisions).where(eq(cmsPageRevisions.pageId, cmsPage.id))]);
  const totalItems = Number(totalRows[0]?.total ?? 0); const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return { items: rows.map(revisionView), page: Math.min(page, totalPages), pageSize, totalItems, totalPages };
}
