import type { Metadata } from "next";
import { Tanda2Cms } from "@/components/admin/AdminTanda2Workspaces";
import { CmsPageEditor } from "@/components/admin/CmsPageEditor";
import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { MediaSlotAssociator } from "@/components/admin/MediaSlotAssociator";
import { requirePermission } from "@/lib/auth";
import { listMediaAssets } from "@/lib/media-repository";
import { listCmsPages } from "@/lib/cms-repository";

export const metadata: Metadata = { title: "CMS y multimedia | Panel admin ColdPower", description: "Contenido editorial y biblioteca multimedia gobernados." };

export default async function AdminCmsPage() {
  await requirePermission("cms.view");
  let assets: Awaited<ReturnType<typeof listMediaAssets>> = [];
  let pages: Awaited<ReturnType<typeof listCmsPages>> = [];
  try { [assets, pages] = await Promise.all([listMediaAssets(), listCmsPages()]); } catch (error) { console.error("ColdPower: no se pudo cargar el contenido editorial", error); }
  return <Tanda2Cms pages={pages} assetsCount={assets.length} controls={<div id="cms-controls" className="space-y-4"><CmsPageEditor /><MediaLibrary /><MediaSlotAssociator assets={assets} /></div>} />;
}
