"use client";

import {
  Archive,
  ArrowDownToLine,
  Check,
  ChevronDown,
  ChevronRight,
  Edit3,
  Layers3,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Tag,
  TriangleAlert,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import type { TaxonomyEntity, TaxonomyItem, TaxonomyPage } from "@/lib/taxonomy-admin";

type NodeSelection = { entity: TaxonomyEntity; id: string };

type Props = {
  categories: TaxonomyPage;
  families: TaxonomyPage;
  brands: TaxonomyPage;
  canManageCategories: boolean;
  canManageFamilies: boolean;
  canManageBrands: boolean;
};

const card = "rounded-[14px] border border-[#dce6ee] bg-white shadow-[0_1px_2px_rgba(16,42,67,0.03)]";
const input = "h-10 w-full rounded-lg border border-[#d5e0e9] bg-white px-3 text-[13px] font-semibold text-[#173654] outline-none transition placeholder:text-[#8296a9] focus:border-[#2277ee] focus:ring-2 focus:ring-[#2277ee]/10";
const primaryButton = "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-3.5 text-[12px] font-extrabold text-white shadow-[0_5px_12px_rgba(37,99,235,0.18)] transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d5e0e9] bg-white px-3.5 text-[12px] font-extrabold text-[#2d4862] transition hover:border-[#9eb7ce] hover:bg-[#f7fafc] disabled:cursor-not-allowed disabled:opacity-50";

function countLabel(value: number) {
  return new Intl.NumberFormat("es-PE").format(value);
}

function entityLabel(entity: TaxonomyEntity) {
  return entity === "categories" ? "categoría" : entity === "families" ? "familia" : "marca";
}

function statusLabel(active: boolean) {
  return active ? "Activa" : "Inactiva";
}

function statusClass(active: boolean) {
  return active ? "bg-[#e8f8ef] text-[#087443]" : "bg-[#f1f4f7] text-[#647789]";
}

function getErrorMessage(value: unknown, fallback: string) {
  if (!value || typeof value !== "object") return fallback;
  const record = value as { error?: unknown; errorObject?: { message?: unknown } };
  if (typeof record.error === "string") return record.error;
  if (typeof record.errorObject?.message === "string") return record.errorObject.message;
  return fallback;
}

function StatCard({ label, value, hint, tone = "blue", icon: Icon }: { label: string; value: number; hint: string; tone?: "blue" | "green" | "purple" | "amber"; icon: typeof Layers3 }) {
  const tones = {
    blue: "bg-[#e8f1ff] text-[#2563eb]",
    green: "bg-[#e7f8ef] text-[#0b8f5a]",
    purple: "bg-[#f0ebff] text-[#7856d8]",
    amber: "bg-[#fff3df] text-[#b45309]",
  };
  return (
    <article className={`${card} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#70869a]">{label}</p>
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-[24px] font-black tracking-[-0.04em] text-[#102a43]">{countLabel(value)}</p>
      <p className="mt-1 text-[11px] font-semibold text-[#8296a9]">{hint}</p>
    </article>
  );
}

function EmptyState({ children }: { children: string }) {
  return <p className="rounded-lg border border-dashed border-[#dce6ee] bg-[#fbfcfd] p-4 text-center text-[13px] font-semibold text-[#71869c]">{children}</p>;
}

export function TaxonomyWorkspace({ categories, families, brands, canManageCategories, canManageFamilies, canManageBrands }: Props) {
  const router = useRouter();
  const [treeQuery, setTreeQuery] = useState("");
  const [brandQuery, setBrandQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ "category-refrigeracion": true });
  const [selection, setSelection] = useState<NodeSelection>(() => ({
    entity: "categories",
    id: categories.items.find((item) => item.id === "category-refrigeracion")?.id ?? categories.items[0]?.id ?? "",
  }));
  const [drawer, setDrawer] = useState<"edit" | "create" | "brand" | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formEntity, setFormEntity] = useState<TaxonomyEntity>("categories");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, startTransition] = useTransition();
  const [mobilePanel, setMobilePanel] = useState<"tree" | "detail" | "brands">("tree");

  const allItems = useMemo(() => ({ categories: categories.items, families: families.items, brands: brands.items }), [categories.items, families.items, brands.items]);
  const familyMap = useMemo(() => {
    const result = new Map<string, TaxonomyItem[]>();
    for (const family of families.items) {
      if (!family.categoryId) continue;
      const current = result.get(family.categoryId) ?? [];
      current.push(family);
      result.set(family.categoryId, current);
    }
    return result;
  }, [families.items]);
  const selectedItem = allItems[selection.entity].find((item) => item.id === selection.id) ?? categories.items[0] ?? null;
  const selectedFamilies = selectedItem?.id && selection.entity === "categories" ? familyMap.get(selectedItem.id) ?? [] : [];
  const filteredCategories = categories.items.filter((category) => {
    const query = treeQuery.trim().toLocaleLowerCase();
    if (!query) return true;
    const children = familyMap.get(category.id) ?? [];
    return `${category.name} ${category.slug} ${children.map((family) => family.name).join(" ")}`.toLocaleLowerCase().includes(query);
  });
  const filteredBrands = brands.items.filter((brand) => `${brand.name} ${brand.slug}`.toLocaleLowerCase().includes(brandQuery.trim().toLocaleLowerCase()));
  const reviewTotal = categories.items.reduce((sum, row) => sum + row.reviewProductCount, 0);
  const activeCategories = categories.items.filter((row) => row.active).length;
  const selectedCanManage = selection.entity === "categories" ? canManageCategories : selection.entity === "families" ? canManageFamilies : canManageBrands;

  function selectNode(entity: TaxonomyEntity, id: string) {
    setSelection({ entity, id });
    setMobilePanel("detail");
  }

  function openEdit(item = selectedItem) {
    if (!item) return;
    setFormEntity(selection.entity);
    setFormName(item.name);
    setFormSlug(item.slug);
    setFormCategoryId(item.categoryId ?? "");
    setMessage(null);
    setDrawer("edit");
  }

  function openCreate() {
    setFormEntity("categories");
    setFormName("");
    setFormSlug("");
    setFormCategoryId(categories.items.find((item) => item.active)?.id ?? "");
    setMessage(null);
    setDrawer("create");
  }

  async function submitTaxonomyForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const isCreate = drawer === "create";
    const entity = isCreate ? formEntity : selection.entity;
    const endpoint = isCreate ? `/api/admin/taxonomia?entity=${entity}` : `/api/admin/taxonomia/${entity}/${encodeURIComponent(selection.id)}`;
    const body = { name: formName, slug: formSlug, ...(entity === "families" ? { categoryId: formCategoryId } : {}) };
    setMessage(null);
    try {
      const response = await fetch(endpoint, { method: isCreate ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(result, "No se pudo guardar la taxonomía."));
      setDrawer(null);
      setMessage({ tone: "success", text: `${entityLabel(entity).replace(/^./, (value) => value.toUpperCase())} ${isCreate ? "creada" : "actualizada"}.` });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "No se pudo guardar la taxonomía." });
    }
  }

  function deactivate() {
    if (!selectedItem) return;
    startTransition(async () => {
      setMessage(null);
      try {
        const response = await fetch(`/api/admin/taxonomia/${selection.entity}/${encodeURIComponent(selection.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: false }) });
        const result = await response.json();
        if (!response.ok) throw new Error(getErrorMessage(result, "No se pudo desactivar la entidad."));
        setConfirmDeactivate(false);
        setMessage({ tone: "success", text: `${entityLabel(selection.entity).replace(/^./, (value) => value.toUpperCase())} desactivada. El cambio quedó auditado.` });
        router.refresh();
      } catch (error) {
        setMessage({ tone: "error", text: error instanceof Error ? error.message : "No se pudo desactivar la entidad." });
      }
    });
  }

  const detailTitle = selectedItem?.name ?? "Selecciona un nodo";
  const selectedCategory = selection.entity === "families" ? categories.items.find((category) => category.id === selectedItem?.categoryId) : null;
  return (
    <div className="space-y-4 pt-5">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2563eb]">Catálogo / Estructura</p>
          <h1 className="mt-2 text-[30px] font-black tracking-[-0.04em] text-[#102a43]">Taxonomía</h1>
          <p className="mt-1 text-[13px] font-semibold text-[#607894]">Organiza categorías, familias y marcas sin perder el control editorial.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/admin/taxonomia/export?entity=categories" className={secondaryButton} download>
            <ArrowDownToLine className="h-4 w-4" aria-hidden="true" /> Exportar
          </a>
          {canManageCategories ? <button type="button" className={primaryButton} onClick={openCreate}><Plus className="h-4 w-4" aria-hidden="true" /> Nueva categoría</button> : null}
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Categorías activas" value={categories.metrics.active} hint={`${countLabel(categories.metrics.total)} registradas · ${countLabel(categories.metrics.inactive)} inactivas`} icon={Layers3} />
        <StatCard label="Familias" value={families.metrics.total} hint={`${countLabel(families.metrics.active)} activas · ${countLabel(families.metrics.unused)} sin productos`} tone="green" icon={Package} />
        <StatCard label="Marcas activas" value={brands.metrics.active} hint={`${countLabel(brands.metrics.used)} con productos relacionados`} tone="purple" icon={Tag} />
        <StatCard label="Productos sin marca" value={categories.metrics.productsWithoutBrand} hint={reviewTotal ? `${countLabel(reviewTotal)} en revisión editorial` : "Relación editorial y de origen vacía"} tone="amber" icon={TriangleAlert} />
      </div>

      {message ? <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-semibold ${message.tone === "success" ? "border-[#b8e8cf] bg-[#f0fbf5] text-[#087443]" : "border-[#f3c4c4] bg-[#fff6f6] text-[#b42318]"}`} role={message.tone === "error" ? "alert" : "status"} aria-live="polite"><Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{message.text}</div> : null}

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#dce6ee] bg-white p-1 md:hidden" role="tablist" aria-label="Panel de taxonomía">
        {[['tree', 'Árbol'], ['detail', 'Detalle'], ['brands', 'Marcas']].map(([value, label]) => <button type="button" role="tab" aria-selected={mobilePanel === value} key={value} onClick={() => setMobilePanel(value as typeof mobilePanel)} className={`shrink-0 rounded-lg px-3 py-2 text-[12px] font-extrabold ${mobilePanel === value ? "bg-[#eaf2ff] text-[#2563eb]" : "text-[#71869c]"}`}>{label}</button>)}
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-[296px_minmax(0,1fr)_296px]">
        <section className={`${card} p-4 ${mobilePanel !== "tree" ? "hidden md:block" : ""}`} aria-labelledby="taxonomy-tree-title">
          <div className="flex items-start justify-between gap-3">
            <div><h2 id="taxonomy-tree-title" className="text-[16px] font-black text-[#102a43]">Árbol de catálogo</h2><p className="mt-1 text-[11px] font-semibold text-[#7b91a5]">Categoría → familia · {countLabel(categories.metrics.total)} categorías</p></div>
            <span className="rounded-md bg-[#f0f5fa] px-2 py-1 text-[11px] font-extrabold text-[#57718b]">{countLabel(activeCategories)} activas</span>
          </div>
          <label className="relative mt-4 block"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#8296a9]" aria-hidden="true" /><input value={treeQuery} onChange={(event) => setTreeQuery(event.currentTarget.value)} className={`${input} pl-9`} placeholder="Buscar categoría o familia" aria-label="Buscar categoría o familia" /></label>
          <div className="mt-4 space-y-1">
            {filteredCategories.map((category) => {
              const children = familyMap.get(category.id) ?? [];
              const isExpanded = expanded[category.id] ?? false;
              const isSelected = selection.entity === "categories" && selection.id === category.id;
              return <div key={category.id}>
                <div className={`flex items-center gap-1 rounded-lg px-2 py-2 ${isSelected ? "bg-[#eaf2ff]" : "hover:bg-[#f5f8fb]"}`}>
                  <button type="button" aria-label={`${isExpanded ? "Contraer" : "Expandir"} ${category.name}`} onClick={() => setExpanded((current) => ({ ...current, [category.id]: !isExpanded }))} className="inline-flex h-6 w-6 items-center justify-center text-[#7890a8]">{isExpanded ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}</button>
                  <button type="button" onClick={() => selectNode("categories", category.id)} className="min-w-0 flex-1 text-left"><span className={`block truncate text-[13px] font-extrabold ${isSelected ? "text-[#2563eb]" : "text-[#304b66]"}`}>{category.name}</span>{!category.active ? <span className="text-[11px] font-semibold text-[#8799a8]">Inactiva</span> : null}</button>
                  <span className="font-mono text-[11px] font-bold text-[#6f879d]">{countLabel(category.productCount)}</span>
                </div>
                {isExpanded ? <div className="ml-8 border-l border-[#e4ebf2] pl-2">{children.length ? children.map((family) => <button type="button" key={family.id} onClick={() => selectNode("families", family.id)} className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left ${selection.entity === "families" && selection.id === family.id ? "bg-[#f1f6ff] text-[#2563eb]" : "text-[#607894] hover:bg-[#f7fafc]"}`}><span className="flex min-w-0 items-center gap-2"><ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="truncate text-[12px] font-semibold">{family.name}</span></span><span className="font-mono text-[10px] font-bold text-[#8296a9]">{countLabel(family.productCount)}</span></button>) : <p className="px-2 py-2 text-[12px] font-semibold text-[#9aabba]">Sin familias registradas</p>}</div> : null}
              </div>;
            })}
            {!filteredCategories.length ? <EmptyState>No hay coincidencias en la taxonomía actual.</EmptyState> : null}
          </div>
          <div className="mt-4 rounded-lg border border-[#f2d19f] bg-[#fffaf0] p-3"><p className="text-[11px] font-extrabold text-[#9a5c16]">Revisión editorial</p><p className="mt-1 text-[12px] leading-5 text-[#8a6b3f]">{countLabel(reviewTotal)} productos siguen en revisión; la cifra sale del estado editorial persistido.</p></div>
        </section>

        <section className={`${card} p-4 sm:p-5 ${mobilePanel !== "detail" ? "hidden md:block" : ""}`} aria-labelledby="taxonomy-detail-title">
          {selectedItem ? <>
            <div className="flex flex-col justify-between gap-3 border-b border-[#e6edf3] pb-4 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h2 id="taxonomy-detail-title" className="text-[20px] font-black tracking-[-0.03em] text-[#102a43]">{detailTitle}</h2><span className={`rounded-md px-2 py-1 text-[11px] font-extrabold ${statusClass(selectedItem.active)}`}>{statusLabel(selectedItem.active)}</span></div><p className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-[#71869c]"><Edit3 className="h-3.5 w-3.5" aria-hidden="true" /> /{selectedItem.slug} <span className="font-sans">· origen editorial</span></p>{selection.entity === "families" && selectedCategory ? <p className="mt-1 text-[12px] font-semibold text-[#8296a9]">Familia de {selectedCategory.name}</p> : null}</div><div className="flex gap-2"><button type="button" className={secondaryButton} onClick={() => openEdit()} disabled={!selectedCanManage}><Edit3 className="h-4 w-4" aria-hidden="true" /> Renombrar</button><button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#d5e0e9] text-[#607894] hover:bg-[#f7fafc]" aria-label="Más acciones" onClick={() => setConfirmDeactivate(true)} disabled={!selectedCanManage}><MoreHorizontal className="h-4 w-4" aria-hidden="true" /></button></div></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="rounded-lg border border-[#e3ebf2] bg-[#fbfcfd] p-3"><p className="text-[11px] font-semibold text-[#8296a9]">Productos</p><p className="mt-1 text-[20px] font-black text-[#102a43]">{countLabel(selectedItem.productCount)}</p></div><div className="rounded-lg border border-[#e3ebf2] bg-[#fbfcfd] p-3"><p className="text-[11px] font-semibold text-[#8296a9]">Publicados</p><p className="mt-1 text-[20px] font-black text-[#102a43]">{countLabel(selectedItem.publishedProductCount)}</p></div><div className="rounded-lg border border-[#e3ebf2] bg-[#fbfcfd] p-3"><p className="text-[11px] font-semibold text-[#8296a9]">En revisión</p><p className="mt-1 text-[20px] font-black text-[#102a43]">{countLabel(selectedItem.reviewProductCount)}</p></div></div>
            <section className="mt-5"><div className="flex items-center justify-between gap-3"><h3 className="text-[15px] font-black text-[#173654]">Familias hijas</h3><span className="text-[11px] font-semibold text-[#8296a9]">{selection.entity === "categories" ? `${countLabel(selectedFamilies.length)} registradas` : "No aplica a una familia"}</span></div>{selection.entity === "categories" ? <div className="mt-2 grid gap-x-6 gap-y-1 border-t border-[#e6edf3] pt-2 sm:grid-cols-2">{selectedFamilies.length ? selectedFamilies.map((family) => <button key={family.id} type="button" onClick={() => selectNode("families", family.id)} className="flex items-center justify-between gap-3 border-b border-[#f0f3f6] py-2 text-left text-[12px] font-semibold text-[#607894] hover:text-[#2563eb]"><span className="truncate">{family.name}</span><span className="font-mono text-[11px] font-bold text-[#304b66]">{countLabel(family.productCount)}</span></button>) : <p className="col-span-2 py-3 text-[13px] font-semibold text-[#8296a9]">No hay familias hijas persistidas.</p>}</div> : <p className="mt-2 border-t border-[#e6edf3] pt-3 text-[13px] font-semibold text-[#8296a9]">Esta familia conserva su categoría padre y no contiene nodos hijos.</p>}</section>
            <section className="mt-5"><div className="flex items-center justify-between gap-3"><h3 className="text-[15px] font-black text-[#173654]">Cobertura de marcas</h3><span className="text-[11px] font-semibold text-[#8296a9]">{countLabel(brands.metrics.used)} con productos</span></div><div className="mt-2 grid gap-2 border-t border-[#e6edf3] pt-2 sm:grid-cols-3">{brands.items.filter((brand) => brand.productCount > 0).slice(0, 3).map((brand) => <button key={brand.id} type="button" onClick={() => { setSelection({ entity: "brands", id: brand.id }); setDrawer("brand"); setMobilePanel("brands"); }} className="rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-3 text-left hover:border-[#b8d3f5]"><p className="truncate text-[12px] font-extrabold text-[#304b66]">{brand.name}</p><p className="mt-1 font-mono text-[11px] font-bold text-[#607894]">{countLabel(brand.productCount)} productos</p></button>)}{!brands.items.some((brand) => brand.productCount > 0) ? <p className="col-span-3 py-3 text-[13px] font-semibold text-[#8296a9]">No hay marcas con productos relacionados.</p> : null}</div></section>
            <section className="mt-5"><div className="flex items-center justify-between gap-3"><h3 className="text-[15px] font-black text-[#173654]">Acciones del nodo</h3><span className="text-[11px] font-semibold text-[#8296a9]">Requieren permiso de catálogo</span></div><div className="mt-2 grid gap-2 border-t border-[#e6edf3] pt-2 sm:grid-cols-3"><button type="button" disabled={!selectedCanManage} onClick={() => openEdit()} className="flex min-h-10 items-center gap-2 rounded-lg border border-[#dce6ee] px-3 text-left text-[12px] font-bold text-[#49627d] hover:border-[#b8d3f5] disabled:opacity-45"><Edit3 className="h-4 w-4 text-[#2563eb]" aria-hidden="true" /> Editar nombre y slug</button><button type="button" onClick={() => setMessage({ tone: "success", text: "Mover familia se ejecuta desde la ficha con validación de categoría padre." })} className="flex min-h-10 items-center gap-2 rounded-lg border border-[#dce6ee] px-3 text-left text-[12px] font-bold text-[#49627d] hover:border-[#b8d3f5]"><Layers3 className="h-4 w-4 text-[#2563eb]" aria-hidden="true" /> Ver relación editorial</button><button type="button" disabled={!selectedCanManage || !selectedItem.active} onClick={() => setConfirmDeactivate(true)} className="flex min-h-10 items-center gap-2 rounded-lg border border-[#f1d0d0] px-3 text-left text-[12px] font-bold text-[#b42318] hover:bg-[#fff8f8] disabled:opacity-45"><Archive className="h-4 w-4" aria-hidden="true" /> Desactivar</button></div></section>
            <section className="mt-5 rounded-lg border border-[#f2d19f] bg-[#fffaf0] p-3"><div className="flex items-start gap-2"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#b45309]" aria-hidden="true" /><div><p className="text-[12px] font-extrabold text-[#8a5a19]">Impacto antes de desactivar</p><p className="mt-1 text-[12px] leading-5 text-[#8a6b3f]">Este nodo tiene {countLabel(selectedItem.publishedProductCount)} productos publicados relacionados. El servidor volverá a calcular el impacto y rechazará la operación si rompe familias activas.</p></div></div></section>
          </> : <EmptyState>Selecciona una categoría o familia para ver el detalle editorial.</EmptyState>}
        </section>

        <section className={`${card} p-4 ${mobilePanel !== "brands" ? "hidden md:block" : ""}`} aria-labelledby="taxonomy-brands-title">
          <div className="flex items-start justify-between gap-3"><div><h2 id="taxonomy-brands-title" className="text-[16px] font-black text-[#102a43]">Marcas</h2><p className="mt-1 text-[11px] font-semibold text-[#7b91a5]">Visibilidad y cobertura del catálogo</p></div><button type="button" disabled={!canManageBrands} onClick={() => { setFormEntity("brands"); setFormName(""); setFormSlug(""); setDrawer("create"); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#d5e0e9] text-[#2563eb] hover:bg-[#f3f7fc] disabled:opacity-45" aria-label="Nueva marca"><Plus className="h-4 w-4" aria-hidden="true" /></button></div>
          <label className="relative mt-4 block"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#8296a9]" aria-hidden="true" /><input value={brandQuery} onChange={(event) => setBrandQuery(event.currentTarget.value)} className={`${input} pl-9`} placeholder="Buscar marca" aria-label="Buscar marca" /></label>
          <div className="mt-3 divide-y divide-[#edf2f6]">{filteredBrands.map((brand) => <button type="button" key={brand.id} onClick={() => { setSelection({ entity: "brands", id: brand.id }); setDrawer("brand"); }} className="flex w-full items-center gap-2 py-3 text-left hover:bg-[#fbfcfd]"><span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${brand.active ? "bg-[#eaf2ff] text-[#2563eb]" : "bg-[#f2f4f6] text-[#8296a9]"}`}><Tag className="h-3.5 w-3.5" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-extrabold text-[#304b66]">{brand.name}</span><span className="mt-0.5 block truncate text-[11px] font-semibold text-[#8296a9]">{statusLabel(brand.active)} · {brand.reviewProductCount ? `${countLabel(brand.reviewProductCount)} en revisión` : "sin pendientes"}</span></span><span className="font-mono text-[11px] font-bold text-[#607894]">{countLabel(brand.productCount)}</span><ChevronRight className="h-4 w-4 text-[#9aabba]" aria-hidden="true" /></button>)}{!filteredBrands.length ? <EmptyState>No hay marcas que coincidan.</EmptyState> : null}</div>
          <div className="mt-4 rounded-lg border border-[#e3ebf2] bg-[#fbfcfd] p-3"><p className="text-[12px] font-extrabold text-[#49627d]">Cobertura editorial</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e5ebf1]"><div className="h-full rounded-full bg-[#0b9f68]" style={{ width: `${brands.metrics.total ? Math.min(100, (brands.metrics.used / brands.metrics.total) * 100) : 0}%` }} /></div><p className="mt-2 text-[11px] font-semibold text-[#8296a9]">{countLabel(brands.metrics.used)} de {countLabel(brands.metrics.total)} marcas tienen productos relacionados.</p></div>
          <div className="mt-3 grid gap-2 text-[12px]"><div className="flex justify-between rounded-lg bg-[#fbfcfd] px-3 py-2"><span className="font-semibold text-[#71869c]">Productos sin marca</span><span className="font-mono font-extrabold text-[#304b66]">{countLabel(categories.metrics.productsWithoutBrand)}</span></div><div className="flex justify-between rounded-lg bg-[#fbfcfd] px-3 py-2"><span className="font-semibold text-[#71869c]">Marcas inactivas</span><span className="font-mono font-extrabold text-[#304b66]">{countLabel(brands.metrics.inactive)}</span></div></div>
        </section>
      </div>

      <AdminDrawer open={drawer === "edit" || drawer === "create"} onClose={() => setDrawer(null)} title={drawer === "create" ? `Nueva ${entityLabel(formEntity)}` : `Editar ${entityLabel(selection.entity)}`} footer={<div className="flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setDrawer(null)}>Cancelar</button><button type="submit" form="taxonomy-form" className={primaryButton} disabled={busy || !formName.trim()}>{busy ? "Guardando…" : drawer === "create" ? "Crear" : "Guardar cambios"}</button></div>}>
        <form id="taxonomy-form" onSubmit={(event) => { event.preventDefault(); startTransition(() => { void submitTaxonomyForm(event); }); }} className="space-y-4"><div><label className="text-[12px] font-extrabold text-[#304b66]">Tipo de entidad</label><select value={formEntity} onChange={(event) => setFormEntity(event.currentTarget.value as TaxonomyEntity)} disabled={drawer === "edit"} className={`${input} mt-1`}><option value="categories">Categoría</option><option value="families">Familia</option><option value="brands">Marca</option></select></div><label className="block text-[12px] font-extrabold text-[#304b66]">Nombre<input value={formName} onChange={(event) => setFormName(event.currentTarget.value)} className={`${input} mt-1`} required minLength={2} /></label><label className="block text-[12px] font-extrabold text-[#304b66]">Slug<input value={formSlug} onChange={(event) => setFormSlug(event.currentTarget.value)} className={`${input} mt-1 font-mono`} placeholder="Se genera desde el nombre si lo dejas vacío" /></label>{formEntity === "families" ? <label className="block text-[12px] font-extrabold text-[#304b66]">Categoría padre<select value={formCategoryId} onChange={(event) => setFormCategoryId(event.currentTarget.value)} className={`${input} mt-1`} required><option value="">Selecciona una categoría</option>{categories.items.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}{drawer === "edit" ? <p className="rounded-lg bg-[#f7fafc] p-3 text-[12px] leading-5 text-[#71869c]">El SKU y las relaciones de origen no se alteran; solo se cambia la capa editorial.</p> : null}</form>
      </AdminDrawer>

      <AdminDrawer open={drawer === "brand"} onClose={() => setDrawer(null)} title={selectedItem?.name ?? "Marca"} footer={<div className="flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setDrawer(null)}>Cerrar</button><button type="button" className={primaryButton} onClick={() => { setDrawer("edit"); openEdit(selectedItem); }}>Editar marca</button></div>}>
        {selectedItem && selection.entity === "brands" ? <div className="space-y-4"><div className="flex items-center gap-3"><span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0ebff] text-[#7856d8]"><Tag className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-[16px] font-black text-[#102a43]">{selectedItem.name}</p><p className="mt-1 font-mono text-[11px] text-[#71869c]">/{selectedItem.slug}</p></div></div><div className="grid grid-cols-2 gap-2"><div className="rounded-lg bg-[#fbfcfd] p-3"><p className="text-[11px] font-semibold text-[#8296a9]">Productos</p><p className="mt-1 text-[20px] font-black text-[#102a43]">{countLabel(selectedItem.productCount)}</p></div><div className="rounded-lg bg-[#fbfcfd] p-3"><p className="text-[11px] font-semibold text-[#8296a9]">Publicados</p><p className="mt-1 text-[20px] font-black text-[#102a43]">{countLabel(selectedItem.publishedProductCount)}</p></div></div><div className="rounded-lg border border-[#e3ebf2] p-3"><p className="text-[12px] font-extrabold text-[#49627d]">Estado editorial</p><p className="mt-1 text-[13px] font-semibold text-[#71869c]">{selectedItem.reviewProductCount ? `${countLabel(selectedItem.reviewProductCount)} productos requieren revisión.` : "No hay productos en revisión para esta marca."}</p></div></div> : null}
      </AdminDrawer>

      {confirmDeactivate && selectedItem ? <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102a43]/30 px-4" role="presentation"><section className="w-full max-w-md rounded-2xl border border-[#dce6ee] bg-white p-5 shadow-[0_18px_55px_rgba(16,42,67,0.22)]" role="alertdialog" aria-modal="true" aria-labelledby="deactivate-title"><div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff1e7] text-[#b45309]"><TriangleAlert className="h-5 w-5" aria-hidden="true" /></span><div><h2 id="deactivate-title" className="text-[16px] font-black text-[#102a43]">Desactivar {entityLabel(selection.entity)}</h2><p className="mt-2 text-[13px] leading-5 text-[#607894]">{selectedItem.name} tiene {countLabel(selectedItem.publishedProductCount)} productos publicados relacionados. El servidor validará familias activas y mantendrá el cambio reversible.</p></div><button type="button" onClick={() => setConfirmDeactivate(false)} className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8296a9] hover:bg-[#f3f6f8]" aria-label="Cerrar confirmación"><X className="h-4 w-4" aria-hidden="true" /></button></div><div className="mt-5 flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setConfirmDeactivate(false)}>Cancelar</button><button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#b42318] px-3.5 text-[12px] font-extrabold text-white hover:bg-[#991b1b] disabled:opacity-50" onClick={deactivate} disabled={busy || !selectedItem.active}><Archive className="h-4 w-4" aria-hidden="true" />{busy ? "Procesando…" : "Confirmar desactivación"}</button></div></section></div> : null}
    </div>
  );
}
