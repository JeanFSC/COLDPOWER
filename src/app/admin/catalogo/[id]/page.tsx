import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getProductAnalytics } from "@/lib/product-analytics";
import { getAdminCatalogProductDetail } from "@/lib/catalog-admin-service";
import { getActivePromotionsForProduct } from "@/lib/promotion-repository";
import { ProductDetailWorkspace } from "@/components/admin/ProductDetailWorkspace";

export const metadata: Metadata = {
  title: "Detalle de producto | Panel admin ColdPower",
  description: "Ficha editorial, precios, inventario y publicación de un producto del catálogo.",
};

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("catalog.product.edit");
  const { id } = await params;
  const [detail, analytics] = await Promise.all([
    getAdminCatalogProductDetail(id, { includePricing: true, includeCost: can(actor.role, "pricing.cost.view") }),
    getProductAnalytics(id),
  ]);
  if (!analytics) notFound();
  const promotions = await getActivePromotionsForProduct(id, detail.taxonomy.category.id);

  return (
    <ProductDetailWorkspace
      productId={id}
      detail={detail}
      analytics={analytics}
      promotions={promotions}
      canEdit={can(actor.role, "catalog.product.edit")}
      canPublish={can(actor.role, "catalog.product.publish")}
      canEditPricing={can(actor.role, "pricing.edit")}
      canAdjustInventory={can(actor.role, "inventory.adjust")}
      canEditMedia={can(actor.role, "catalog.media.upload")}
    />
  );
}
