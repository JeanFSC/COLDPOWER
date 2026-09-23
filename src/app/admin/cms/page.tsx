import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Tanda2Cms } from "@/components/admin/AdminTanda2Workspaces";
import { CmsPageEditor } from "@/components/admin/CmsPageEditor";
import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { MediaSlotAssociator } from "@/components/admin/MediaSlotAssociator";
import { requirePermission } from "@/lib/auth";
import { listMediaAssets } from "@/lib/media-repository";
import { countActiveCmsBlocks, listCmsPages } from "@/lib/cms-repository";
import { isHiddenAdminHref } from "@/lib/hidden-admin-modules";

export const metadata: Metadata = { title: "CMS y multimedia | Panel admin ColdPower", description: "Contenido editorial y biblioteca multimedia gobernados." };

export default async function AdminCmsPage() {
  await requirePermission("cms.view");
  if (isHiddenAdminHref("/admin/cms")) redirect("/admin/inicio");
  let assets: Awaited<ReturnType<typeof listMediaAssets>> = [];
  let pages: Awaited<ReturnType<typeof listCmsPages>> = [];
  let activeBlocks = 0;
  try {
    [assets, pages, activeBlocks] = await Promise.all([listMediaAssets(), listCmsPages(), countActiveCmsBlocks()]);
  } catch (error) {
    console.error("ColdPower: no se pudo cargar el contenido editorial", error);
  }
  return (
    <Tanda2Cms
      pages={pages}
      assetsCount={assets.length}
      activeBlocksCount={activeBlocks}
      controls={
        <div id="cms-controls" className="space-y-4">
          <CmsPageEditor pages={pages} />
          <MediaLibrary />
          <MediaSlotAssociator assets={assets} />
        </div>
      }
    />
  );
}
