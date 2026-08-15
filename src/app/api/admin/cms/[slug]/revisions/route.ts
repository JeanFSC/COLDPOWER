import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getCmsRevisions } from "@/lib/cms-repository";
import { validateCmsPageSlug } from "@/lib/cms-validation";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await requireApiPermission("cms.view");
    const { slug } = await params;
    if (!validateCmsPageSlug(slug)) return apiError("CMS_PAGE_INVALID", "Página CMS inválida.", 400);
    const query = new URL(request.url).searchParams;
    const page = Number(query.get("page") ?? 1); const pageSize = Number(query.get("pageSize") ?? 25);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1) return apiError("CMS_INVALID_PAGINATION", "La paginación CMS no es válida.", 400);
    return apiSuccess(await getCmsRevisions(slug, page, pageSize));
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CMS_FORBIDDEN", "No tienes permiso para ver revisiones CMS.", 403);
    return apiError("CMS_REVISIONS_UNAVAILABLE", "No se pudieron cargar las revisiones.", 503);
  }
}
