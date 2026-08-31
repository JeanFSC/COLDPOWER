import type { Metadata } from "next";
import { ContentWorkspace } from "@/components/admin/AdminCategoryViews";
import { CmsPageEditor } from "@/components/admin/CmsPageEditor";
import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { MediaSlotAssociator } from "@/components/admin/MediaSlotAssociator";
import { requirePermission } from "@/lib/auth";
import { listMediaAssets } from "@/lib/media-repository";

export const metadata: Metadata = { title: "CMS y multimedia | Panel admin ColdPower", description: "Contenido editorial y biblioteca multimedia gobernados." };

export default async function AdminCmsPage() {
  await requirePermission("cms.view");
  let assets: Awaited<ReturnType<typeof listMediaAssets>> = [];
  try { assets = await listMediaAssets(); } catch (error) { console.error("ColdPower: no se pudo cargar la biblioteca", error); }
  return <ContentWorkspace controls={<div id="cms-controls" className="space-y-4"><CmsPageEditor /><MediaLibrary /><MediaSlotAssociator assets={assets} /></div>} />;
}
