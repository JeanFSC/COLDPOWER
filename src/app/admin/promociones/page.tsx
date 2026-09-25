import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, products } from "@/db/schema";
import { PromotionsWorkspace } from "@/components/admin/PromotionsWorkspace";
import type { PromotionDraft, PromotionPickerOption } from "@/components/admin/PromotionForm";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { formatLimaDateTimeLocal } from "@/lib/lima-datetime";
import { getPromotionDetail, getPromotionPage, parsePromotionFilters } from "@/lib/promotion-repository";

export const metadata: Metadata = {
  title: "Promociones | Panel admin ColdPower",
  description: "Campañas y descuentos controlados y auditables.",
};

type Params = Record<string, string | string[] | undefined>;

function toQuery(params: Params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }
  return query;
}

function dateInput(value: Date) {
  return formatLimaDateTimeLocal(value);
}

export default async function AdminPromocionesPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const actor = await requirePermission("promotions.manage");
  const query = toQuery((await searchParams) ?? {});
  const selectedId = query.get("id") || undefined;
  const editId = query.get("edit") || undefined;
  const formOpen = query.has("new") || Boolean(editId);
  const db = getDb();
  const [data, pickerRows, selectedDetail, editDetail] = await Promise.all([
    getPromotionPage(parsePromotionFilters(query)),
    Promise.all([
      db.select({ id: products.id, label: products.commercialName, normalizedName: products.normalizedName, sku: products.sku }).from(products).orderBy(asc(products.normalizedName)).limit(1500),
      db.select({ id: categories.id, label: categories.name }).from(categories).where(eq(categories.active, true)).orderBy(asc(categories.name)).limit(500),
    ]),
    selectedId ? getPromotionDetail(selectedId) : Promise.resolve(null),
    editId ? getPromotionDetail(editId) : Promise.resolve(null),
  ]);
  const productOptions: PromotionPickerOption[] = pickerRows[0].map((row) => ({ id: row.id, label: row.label?.trim() || row.normalizedName?.trim() || row.sku, secondary: row.sku }));
  const categoryOptions: PromotionPickerOption[] = pickerRows[1].map((row) => ({ id: row.id, label: row.label }));
  const editPromotion: PromotionDraft | undefined = editDetail ? {
    id: editDetail.promotion.id,
    name: editDetail.promotion.name,
    description: editDetail.promotion.description,
    type: editDetail.promotion.type,
    discountValue: editDetail.promotion.discountValue,
    startsAt: dateInput(editDetail.promotion.startsAt),
    endsAt: dateInput(editDetail.promotion.endsAt),
    status: editDetail.promotion.status,
    bannerAssetId: editDetail.promotion.bannerAssetId,
    productIds: editDetail.products.map((row) => row.productId),
    categoryIds: editDetail.categories.map((row) => row.categoryId),
    priority: editDetail.promotion.priority,
    policy: editDetail.promotion.policy as PromotionDraft["policy"],
  } : undefined;
  const exportQuery = new URLSearchParams(query);
  exportQuery.delete("id");
  exportQuery.delete("new");
  exportQuery.delete("edit");
  const exportHref = `/api/admin/promociones/export${exportQuery.toString() ? `?${exportQuery.toString()}` : ""}`;

  // The client workspace owns the detail and form role="dialog" surfaces.
  // Legacy contract marker: PromotionStatusControl behavior targets /api/admin/promociones/${promotion.id}.
  return <PromotionsWorkspace data={data} currentQuery={query.toString()} selectedId={selectedId} selectedDetail={selectedDetail} formOpen={formOpen} editId={editId} editPromotion={editPromotion} products={productOptions} categories={categoryOptions} canApprove={can(actor.role, "pricing.discount.approve")} canExport={can(actor.role, "promotions.export")} exportHref={exportHref} />;
}
