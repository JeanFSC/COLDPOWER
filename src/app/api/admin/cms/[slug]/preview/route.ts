import { ApiAuthorizationError, requireApiPermission } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-errors";
import { getCmsPage } from "@/lib/cms-repository";
import { validateCmsPageSlug } from "@/lib/cms-validation";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await requireApiPermission("cms.view");
    const { slug } = await params;
    if (!validateCmsPageSlug(slug)) return apiError("CMS_PAGE_INVALID", "Página CMS inválida.", 400);
    const cms = await getCmsPage(slug, false);
    return cms ? apiSuccess({ preview: true, cms }) : apiError("CMS_PAGE_NOT_FOUND", "Página CMS no encontrada.", 404);
  } catch (error) {
    if (error instanceof ApiAuthorizationError) return apiError("CMS_FORBIDDEN", "No tienes permiso para previsualizar el CMS.", 403);
    return apiError("CMS_PREVIEW_UNAVAILABLE", "No se pudo cargar la previsualización.", 503);
  }
}
