import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getCmsPage, saveCmsPage } from "@/lib/cms-repository";
import { cmsContentTypes, cmsPageStatuses, validateCmsPageSlug } from "@/lib/cms-validation";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await requireApiPermission("cms.view");
    const { slug } = await params;
    if (!validateCmsPageSlug(slug))
      return apiError("CMS_PAGE_INVALID", "Página CMS inválida.", 400);
    const cms = await getCmsPage(slug);
    return cms
      ? apiSuccess({ cms })
      : apiError("CMS_PAGE_NOT_FOUND", "Página CMS no encontrada.", 404);
  } catch (error) {
    if (error instanceof ApiAuthorizationError)
      return apiError("CMS_FORBIDDEN", "No tienes permiso para ver el CMS.", 403);
    return apiError("CMS_UNAVAILABLE", "No se pudo cargar la página CMS.", 503);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "JSON inválido.", 400);
  }
  const value = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const action =
    value.action === "UNPUBLISH" ||
    value.action === "RESTORE" ||
    value.action === "SCHEDULE" ||
    value.action === "ARCHIVE" ||
    value.status === "PUBLISHED" ||
    value.status === "SCHEDULED" ||
    value.status === "ARCHIVED"
      ? value.action === "UNPUBLISH"
        ? "UNPUBLISH"
        : value.action === "RESTORE"
          ? "RESTORE"
          : value.action === "SCHEDULE" || value.status === "SCHEDULED"
            ? "SCHEDULE"
            : value.action === "ARCHIVE" || value.status === "ARCHIVED"
              ? "ARCHIVE"
              : "PUBLISH"
      : "DRAFT";
  try {
    const actor = await requireApiPermission(
      action === "PUBLISH" ||
        action === "UNPUBLISH" ||
        action === "SCHEDULE" ||
        action === "ARCHIVE"
        ? "cms.publish"
        : "cms.edit",
    );
    if (!validateCmsPageSlug(slug))
      return apiError("CMS_PAGE_INVALID", "Página CMS inválida.", 400);
    const title = typeof value.title === "string" ? value.title : slug;
    const status = cmsPageStatuses.includes(value.status as (typeof cmsPageStatuses)[number])
      ? (value.status as (typeof cmsPageStatuses)[number])
      : action === "ARCHIVE"
        ? "ARCHIVED"
        : action === "SCHEDULE"
          ? "SCHEDULED"
          : value.status === "PUBLISHED"
            ? "PUBLISHED"
            : "DRAFT";
    const revisionId = typeof value.revisionId === "string" ? value.revisionId : undefined;
    const reason = typeof value.reason === "string" ? value.reason.trim().slice(0, 500) : undefined;
    const contentType = cmsContentTypes.includes(
      value.contentType as (typeof cmsContentTypes)[number],
    )
      ? (value.contentType as (typeof cmsContentTypes)[number])
      : undefined;
    const scheduleAt =
      typeof value.scheduleAt === "string" ? new Date(value.scheduleAt) : undefined;
    if (status === "SCHEDULED" && (!scheduleAt || Number.isNaN(scheduleAt.getTime())))
      return apiError(
        "CMS_SCHEDULE_INVALID",
        "La fecha de publicación programada no es válida.",
        400,
      );
    const cms = await saveCmsPage(slug, title, value.blocks, status, actor.userId, {
      action,
      revisionId,
      reason,
      scheduleAt,
      contentType,
    });
    return apiSuccess({ cms });
  } catch (error) {
    if (error instanceof ApiAuthorizationError)
      return apiError(
        "CMS_FORBIDDEN",
        "No tienes permiso para ejecutar esta operación editorial.",
        403,
      );
    const message = error instanceof Error ? error.message : "No se pudo guardar el CMS.";
    if (["CMS_PAGE_INVALID", "CMS_REVISION_NOT_FOUND", "CMS_MEDIA_INVALID"].includes(message))
      return apiError(
        message,
        "La operación CMS no es válida.",
        message === "CMS_REVISION_NOT_FOUND" ? 404 : 400,
      );
    return apiError("CMS_SAVE_FAILED", message, 400);
  }
}
