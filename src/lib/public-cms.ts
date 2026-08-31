import { getCmsPage } from "@/lib/cms-repository";
import { type CmsPageSlug } from "@/lib/cms-validation";

export async function loadPublishedCms(slug: CmsPageSlug) {
  try {
    return await getCmsPage(slug, true);
  } catch (error) {
    console.warn(`[ColdPower] CMS público no disponible para ${slug}.`, error instanceof Error ? error.message : error);
    return null;
  }
}
