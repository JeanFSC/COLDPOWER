import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getDb } from "@/db";
import { categories, products } from "@/db/schema";
import { getPromotionDetail, getPromotionPage, parsePromotionFilters } from "@/lib/promotion-repository";
import { formatLimaDateTimeLocal } from "@/lib/lima-datetime";
import { PromotionForm, type PromotionDraft, type PromotionPickerOption } from "@/components/admin/PromotionForm";
import { PromotionStatusControl } from "@/components/admin/PromotionStatusControl";

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

function statusLabel(value: string) {
  return value === "ACTIVE" ? "Activa" : value === "INACTIVE" ? "Inactiva" : value === "EXPIRED" ? "Vencida" : "Borrador";
}

function typeLabel(value: string) {
  return value === "PERCENTAGE" ? "Porcentaje" : value === "AMOUNT" ? "Monto" : "Precio especial";
}

function policyLabel(value: string) {
  return value === "BEST_VALUE" ? "Mejor valor" : value === "STACKABLE" ? "Combinable" : "Exclusiva";
}

function dateInput(value: Date) {
  return formatLimaDateTimeLocal(value);
}

export default async function AdminPromocionesPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const actor = await requirePermission("promotions.manage");
  const query = toQuery((await searchParams) ?? {});
  const db = getDb();
  const editId = query.get("edit") || undefined;
  const [page, pickerRows, editDetail] = await Promise.all([
    getPromotionPage(parsePromotionFilters(query)),
    Promise.all([
      db.select({ id: products.id, label: products.commercialName, normalizedName: products.normalizedName, sku: products.sku }).from(products).orderBy(asc(products.normalizedName)).limit(1500),
      db.select({ id: categories.id, label: categories.name }).from(categories).where(eq(categories.active, true)).orderBy(asc(categories.name)).limit(500),
    ]),
    editId ? getPromotionDetail(editId) : Promise.resolve(null),
  ]);
  const productOptions: PromotionPickerOption[] = pickerRows[0].map((row) => ({ id: row.id, label: row.label ?? row.normalizedName, secondary: row.sku }));
  const categoryOptions: PromotionPickerOption[] = pickerRows[1];
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
  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(nextPage));
    return `?${next.toString()}`;
  };
  const exportHref = `/api/admin/promociones/export${query.toString() ? `?${query.toString()}` : ""}`;
  const canApprove = can(actor.role, "pricing.discount.approve");
  const canExport = can(actor.role, "promotions.export");

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">Comercial</p>
          <h1 className="mt-1 font-display text-3xl font-black text-dark">Promociones</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-text">Campañas con vigencia, prioridad, política de combinación, asociaciones y trazabilidad. El precio base nunca se modifica.</p>
        </div>
        {canExport ? <a href={exportHref} className="rounded-pill border border-border bg-white px-4 py-2 text-sm font-bold text-dark">Exportar CSV</a> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-5">
        {[["Total", page.metrics.total], ["Activas", page.metrics.active], ["Inactivas", page.metrics.inactive], ["Borradores", page.metrics.draft], ["Vencidas", page.metrics.expired]].map(([label, value]) => (
          <div key={String(label)} className="rounded-md border border-border bg-white p-4"><p className="text-xs font-extrabold uppercase tracking-[0.08em] text-gray-text">{label}</p><p className="mt-2 text-2xl font-black text-dark">{value}</p></div>
        ))}
      </div>
      <form method="get" className="grid gap-2 rounded-md border border-border bg-white p-4 sm:grid-cols-[minmax(0,1fr)_180px_180px_auto_auto] sm:items-end">
        <label className="grid gap-1 text-xs font-bold text-gray-text">Buscar<input name="query" defaultValue={query.get("query") ?? ""} placeholder="Nombre o descripción" className="h-9 rounded-md border border-border px-3 text-sm text-dark" /></label>
        <label className="grid gap-1 text-xs font-bold text-gray-text">Estado<select name="status" defaultValue={query.get("status") ?? ""} className="h-9 rounded-md border border-border px-2 text-sm text-dark"><option value="">Todos</option><option value="ACTIVE">Activas</option><option value="INACTIVE">Inactivas</option><option value="DRAFT">Borradores</option><option value="EXPIRED">Vencidas</option></select></label>
        <label className="grid gap-1 text-xs font-bold text-gray-text">Tipo<select name="type" defaultValue={query.get("type") ?? ""} className="h-9 rounded-md border border-border px-2 text-sm text-dark"><option value="">Todos</option><option value="PERCENTAGE">Porcentaje</option><option value="AMOUNT">Monto</option><option value="SPECIAL_PRICE">Precio especial</option></select></label>
        <button className="h-9 rounded-md bg-dark px-4 text-sm font-bold text-white">Filtrar</button>
        <a href="/admin/promociones" className="h-9 rounded-md border border-border px-4 py-2 text-center text-sm font-bold text-dark">Limpiar</a>
      </form>
      {editId && editPromotion ? <div role="dialog" aria-modal="true" aria-label="Editar promoción" className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/30 p-4 sm:p-8"><div className="mx-auto max-w-5xl rounded-xl bg-background p-1 shadow-2xl"><PromotionForm key={editPromotion.id} products={productOptions} categories={categoryOptions} initialPromotion={editPromotion} editId={editId} /></div></div> : <PromotionForm products={productOptions} categories={categoryOptions} />}
      {editId && !editPromotion ? <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">La promoción solicitada no existe. <a className="font-bold underline" href="/admin/promociones">Volver al listado</a>.</div> : null}
      {page.items.length ? (
        <div className="overflow-x-auto rounded-md border border-border bg-white">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="border-b border-border bg-background text-xs font-extrabold uppercase tracking-[0.08em] text-gray-text"><tr><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Tipo / valor</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Aprobación</th><th className="px-4 py-3">Prioridad</th><th className="px-4 py-3">Política</th><th className="px-4 py-3">Alcance</th><th className="px-4 py-3">Periodo</th></tr></thead>
            <tbody>{page.items.map((promotion) => <tr key={promotion.id} className="border-b border-border last:border-0"><td className="px-4 py-3"><p className="font-bold text-dark">{promotion.name}</p><p className="text-xs text-gray-text">{promotion.description ?? "Sin descripción"}</p></td><td className="px-4 py-3 text-gray-text">{typeLabel(promotion.type)} · {promotion.discountValue}</td><td className="px-4 py-3"><PromotionStatusControl id={promotion.id} status={promotion.status} approvalStatus={promotion.approvalStatus} canApprove={canApprove} /><span className="mt-1 block text-xs font-bold text-gray-text">{statusLabel(promotion.effectiveStatus)}</span></td><td className="px-4 py-3 text-xs font-bold text-gray-text">{promotion.approvalStatus === "PENDING" ? "Pendiente" : promotion.approvalStatus === "APPROVED" ? "Aprobada" : promotion.approvalStatus === "REJECTED" ? "Rechazada" : "No requerida"}</td><td className="px-4 py-3 text-gray-text">{promotion.priority}</td><td className="px-4 py-3 text-xs text-gray-text">{policyLabel(promotion.policy)}</td><td className="px-4 py-3 text-xs text-gray-text">{promotion.productCount} productos · {promotion.categoryCount} categorías</td><td className="px-4 py-3 text-xs text-gray-text">{promotion.startsAt.toLocaleDateString("es-PE")} – {promotion.endsAt.toLocaleDateString("es-PE")}</td></tr>)}</tbody>
          </table>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-gray-text"><span>{page.totalItems} promociones · página {page.page} de {page.totalPages}</span><div className="flex gap-2">{page.page > 1 ? <a href={pageHref(page.page - 1)} className="rounded-md border border-border px-3 py-1 font-bold text-dark">Anterior</a> : null}{page.page < page.totalPages ? <a href={pageHref(page.page + 1)} className="rounded-md border border-border px-3 py-1 font-bold text-dark">Siguiente</a> : null}</div></div>
        </div>
      ) : null}
      {!page.items.length ? <div className="rounded-md border border-dashed border-border bg-white p-6 text-sm text-gray-text">No hay promociones guardadas.</div> : null}
    </div>
  );
}
