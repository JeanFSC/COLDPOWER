"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Edit3,
  Eye,
  FileClock,
  Package,
  Pencil,
  Plus,
  Tag,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { ProductMediaManager } from "@/components/admin/ProductMediaManager";
import type { getAdminCatalogProductDetail } from "@/lib/catalog-admin-service";
import type { getProductAnalytics } from "@/lib/product-analytics";
import type { getActivePromotionsForProduct } from "@/lib/promotion-repository";

type ProductDetail = Awaited<ReturnType<typeof getAdminCatalogProductDetail>>;
type ProductAnalytics = NonNullable<Awaited<ReturnType<typeof getProductAnalytics>>>;
type Promotion = Awaited<ReturnType<typeof getActivePromotionsForProduct>>[number];

type Props = {
  productId: string;
  detail: ProductDetail;
  analytics: ProductAnalytics;
  promotions: Promotion[];
  canEdit: boolean;
  canPublish: boolean;
  canEditPricing: boolean;
  canAdjustInventory: boolean;
  canEditMedia: boolean;
};

const card = "rounded-[14px] border border-[#dce6ee] bg-white shadow-[0_1px_2px_rgba(16,42,67,0.03)]";
const primaryButton = "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-3.5 text-[12px] font-extrabold text-white shadow-[0_5px_12px_rgba(37,99,235,0.18)] transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d5e0e9] bg-white px-3.5 text-[12px] font-extrabold text-[#2d4862] transition hover:border-[#9eb7ce] hover:bg-[#f7fafc] disabled:cursor-not-allowed disabled:opacity-50";
const input = "h-10 w-full rounded-lg border border-[#d5e0e9] bg-white px-3 text-[13px] font-semibold text-[#173654] outline-none transition placeholder:text-[#8296a9] focus:border-[#2277ee] focus:ring-2 focus:ring-[#2277ee]/10";

const statusLabel: Record<string, string> = { draft: "Borrador", review: "En revisión", published: "Publicado", hidden: "Oculto", archived: "Archivado" };
const availabilityLabel: Record<string, string> = { in_stock: "Disponible", low_stock: "Stock bajo", out_of_stock: "Agotado", on_request: "Bajo pedido", unknown: "Disponibilidad por confirmar" };

function money(value: { amount: number | null; currency: string } | null | undefined) {
  if (!value || value.amount === null) return "Precio por confirmar";
  if (value.currency === "PEN") return `S/ ${value.amount.toFixed(2)}`;
  return `${value.currency} ${value.amount.toFixed(2)}`;
}

function dateLabel(value: Date | string | null | undefined) {
  if (!value) return "Sin fecha registrada";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Sin fecha registrada" : date.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function display(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.join(" · ") : "No registrado";
  return typeof value === "string" && value.trim() ? value : value === 0 ? "0" : "No registrado";
}

function errorMessage(value: unknown, fallback: string) {
  if (!value || typeof value !== "object") return fallback;
  const result = value as { error?: unknown; errorObject?: { message?: unknown } };
  if (typeof result.error === "string") return result.error;
  if (typeof result.errorObject?.message === "string") return result.errorObject.message;
  return fallback;
}

function Field({ label, value }: { label: string; value: unknown }) {
  return <div className="border-b border-[#edf2f6] py-2.5 last:border-0"><dt className="text-[11px] font-semibold text-[#8296a9]">{label}</dt><dd className="mt-1 text-[13px] font-extrabold text-[#304b66]">{display(value)}</dd></div>;
}

function ChecklistRow({ label, done, action }: { label: string; done: boolean; action?: string }) {
  return <li className="flex items-start gap-2.5 border-t border-[#edf2f6] py-2.5 first:border-t-0"><span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${done ? "bg-[#e6f8ef] text-[#0b8f5a]" : "bg-[#fff3df] text-[#b45309]"}`}>{done ? <Check className="h-3 w-3" aria-hidden="true" /> : <AlertTriangle className="h-3 w-3" aria-hidden="true" />}</span><span className="min-w-0 flex-1 text-[12px] font-semibold text-[#607894]">{label}</span>{!done && action ? <span className="text-[11px] font-extrabold text-[#2563eb]">{action}</span> : null}</li>;
}

export function ProductDetailWorkspace({ productId, detail, analytics, promotions, canEdit, canPublish, canEditPricing, canAdjustInventory, canEditMedia }: Props) {
  const router = useRouter();
  const productName = detail.editorialData.commercialName?.trim() || detail.sourceIdentity.normalizedName || detail.sourceIdentity.originalName;
  const primaryMedia = detail.media.find((row) => row.slot === "primary") ?? detail.media[0];
  const previewImage = primaryMedia?.primaryUrl || "/images/products/placeholder-compresores.webp";
  const availability = analytics.inventory.length === 0
    ? "unknown"
    : analytics.inventory.some((row) => row.available > 0)
      ? "in_stock"
      : "out_of_stock";
  const priceRecord = detail.pricing?.find((row) => row.priceType === "RETAIL" && row.active && row.status === "ACTIVE") ?? null;
  const checklist = useMemo(() => [
    { label: "Nombre y SKU", done: Boolean(productName && detail.sourceIdentity.sku) },
    { label: "Categoría y familia", done: Boolean(detail.taxonomy.category.name && detail.taxonomy.family.name) },
    { label: "Precio vigente", done: Boolean(analytics.currentPrice) },
    { label: "Stock por local", done: analytics.inventory.length > 0 },
    { label: "Imagen principal", done: Boolean(primaryMedia), action: "Completar" },
    { label: "Descripción editorial", done: Boolean(detail.editorialData.editorialDescription?.trim()), action: "Completar" },
  ], [analytics.currentPrice, analytics.inventory.length, detail.editorialData.editorialDescription, detail.sourceIdentity.sku, detail.taxonomy.category.name, detail.taxonomy.family.name, primaryMedia, productName]);
  const readyCount = checklist.filter((row) => row.done).length;
  const isPublishReady = readyCount === checklist.length && detail.publication.workflowState !== "PUBLISHED";
  const [tab, setTab] = useState<"ficha" | "precios" | "inventario" | "imagenes" | "historial">("ficha");
  const [drawer, setDrawer] = useState<"editorial" | "price" | "inventory" | "publish" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [commercialName, setCommercialName] = useState(detail.editorialData.commercialName ?? "");
  const [description, setDescription] = useState(detail.editorialData.editorialDescription ?? "");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceReason, setPriceReason] = useState("");
  const [priceDate, setPriceDate] = useState("");
  const [inventoryLocation, setInventoryLocation] = useState(analytics.inventory[0]?.locationId ?? "");
  const [inventoryType, setInventoryType] = useState("ADJUSTMENT_IN");
  const [inventoryQuantity, setInventoryQuantity] = useState("");
  const [inventoryReason, setInventoryReason] = useState("");
  const [inventoryNotes, setInventoryNotes] = useState("");

  function openEditorial() {
    setCommercialName(detail.editorialData.commercialName ?? "");
    setDescription(detail.editorialData.editorialDescription ?? "");
    setMessage(null);
    setDrawer("editorial");
  }

  async function saveEditorial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/catalogo/${encodeURIComponent(productId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commercialName, editorialDescription: description }) });
      const result = await response.json();
      if (!response.ok) throw new Error(errorMessage(result, "No se pudo actualizar la ficha."));
      setDrawer(null);
      setMessage({ tone: "success", text: "Ficha editorial actualizada y auditada." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "No se pudo actualizar la ficha." });
    } finally {
      setBusy(false);
    }
  }

  async function savePrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const isReplacement = Boolean(priceRecord);
      const response = await fetch(isReplacement ? "/api/admin/precios/reemplazar" : "/api/admin/precios", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(isReplacement ? { priceId: priceRecord?.id, amount: priceAmount, currency: priceRecord?.currency ?? "PEN", priceType: "RETAIL", validFrom: priceDate, status: "ACTIVE", reason: priceReason } : { productId, amount: priceAmount, currency: "PEN", priceType: "RETAIL", validFrom: new Date().toISOString(), status: "ACTIVE", reason: priceReason }) });
      const result = await response.json();
      if (!response.ok) throw new Error(errorMessage(result, "No se pudo guardar el precio."));
      setDrawer(null);
      setMessage({ tone: "success", text: isReplacement ? "Nuevo precio programado y versionado." : "Precio creado y auditado." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "No se pudo guardar el precio." });
    } finally {
      setBusy(false);
    }
  }

  async function saveInventory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/inventario/ajustes", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ productId, locationId: inventoryLocation, type: inventoryType, quantity: Number(inventoryQuantity), reason: inventoryReason, notes: inventoryNotes }) });
      const result = await response.json();
      if (!response.ok) throw new Error(errorMessage(result, "No se pudo registrar el movimiento."));
      setDrawer(null);
      setMessage({ tone: "success", text: "Movimiento de inventario registrado y auditado." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "No se pudo registrar el movimiento." });
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/catalogo/${encodeURIComponent(productId)}/publication`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "published", editorialDescription: description || undefined, approveReview: true, note: "Checklist de publicación completado desde la ficha." }) });
      const result = await response.json();
      if (!response.ok) throw new Error(errorMessage(result, "No se pudo publicar el producto."));
      setDrawer(null);
      setMessage({ tone: "success", text: "Producto publicado y auditado." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "No se pudo publicar el producto." });
    } finally {
      setBusy(false);
    }
  }

  const technical = [
    ["Refrigerante", detail.technicalData.refrigerant], ["Voltaje", detail.technicalData.voltage], ["Frecuencia", detail.technicalData.frequency], ["Potencia", detail.technicalData.power], ["Capacitancia", detail.technicalData.capacitance], ["Amperaje", detail.technicalData.amperage], ["Temperatura", detail.technicalData.temperature], ["Dimensiones", detail.technicalData.dimensions], ["Unidad de medida", detail.technicalData.unitOfMeasure], ["Marcas compatibles", detail.technicalData.compatibilityBrands], ["Código de modelo", detail.technicalData.modelCode], ["SKU inmutable", detail.sourceIdentity.sku],
  ] as const;

  return (
    <div className="space-y-4 pt-5" data-a11y-surface="product">
      <style>{`[data-a11y-surface="product"] [class*="text-[#607894]"],[data-a11y-surface="product"] [class*="text-[#70869a]"],[data-a11y-surface="product"] [class*="text-[#71869c]"],[data-a11y-surface="product"] [class*="text-[#7890a8]"],[data-a11y-surface="product"] [class*="text-[#7b91a5]"],[data-a11y-surface="product"] [class*="text-[#8296a9]"],[data-a11y-surface="product"] [class*="text-[#8799a8]"],[data-a11y-surface="product"] [class*="text-[#9aabba]"]{color:#526b84;}`}</style>
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div className="flex min-w-0 items-start gap-3"><div className="relative mt-1 h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#dce6ee] bg-[#f7fafc]"><Image src={previewImage} alt={primaryMedia?.altText || productName} fill sizes="64px" className="object-contain p-2" unoptimized={previewImage.startsWith("/api/")} /></div><div className="min-w-0"><p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2563eb]">Catálogo / Productos / Detalle</p><h1 className="mt-2 truncate text-[28px] font-black tracking-[-0.04em] text-[#102a43]">{productName}</h1><p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-[#607894]"><span>{detail.sourceIdentity.sku}</span><span>·</span><span>Modelo {display(detail.technicalData.modelCode)}</span></p><div className="mt-2 flex flex-wrap gap-2"><span className={`rounded-md px-2 py-1 text-[11px] font-extrabold ${detail.publication.status === "published" ? "bg-[#e8f8ef] text-[#087443]" : "bg-[#fff3df] text-[#9a5c16]"}`}>{statusLabel[detail.publication.status] ?? "Estado editorial"}</span><span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-[11px] font-extrabold text-[#2563eb]">{availabilityLabel[availability]}</span>{!primaryMedia ? <span className="rounded-md bg-[#f1f4f7] px-2 py-1 text-[11px] font-extrabold text-[#607894]">Requiere imagen editorial</span> : null}</div></div></div><div className="flex flex-wrap gap-2"><Link href={`/producto/${detail.sourceIdentity.slug}`} className={secondaryButton}><Eye className="h-4 w-4" aria-hidden="true" /> Ver en tienda</Link><button type="button" className={`${primaryButton} ${!isPublishReady || !canPublish ? "bg-[#dbe5f0] text-[#7b91a5] shadow-none hover:bg-[#dbe5f0]" : ""}`} disabled={!isPublishReady || !canPublish || busy} title={!canPublish ? "No tienes permiso catalog.product.publish" : !isPublishReady ? "Completa el checklist antes de publicar" : "Publicar producto"} onClick={() => setDrawer("publish")}><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Publicar</button><button type="button" className={secondaryButton} onClick={openEditorial} disabled={!canEdit}><Pencil className="h-4 w-4" aria-hidden="true" /> Editar ficha</button></div></header>
      {message ? <div className={`rounded-lg border px-3 py-2.5 text-[13px] font-semibold ${message.tone === "success" ? "border-[#b8e8cf] bg-[#f0fbf5] text-[#087443]" : "border-[#f3c4c4] bg-[#fff6f6] text-[#b42318]"}`} role={message.tone === "error" ? "alert" : "status"}>{message.text}</div> : null}

      <nav className="flex gap-5 overflow-x-auto border-b border-[#dce6ee]" aria-label="Secciones del producto">{([['ficha', 'Ficha'], ['precios', 'Precios'], ['inventario', 'Inventario'], ['imagenes', 'Imágenes'], ['historial', 'Historial']] as const).map(([value, label]) => <button type="button" key={value} onClick={() => setTab(value)} className={`shrink-0 border-b-2 px-1 py-3 text-[12px] font-extrabold ${tab === value ? "border-[#2563eb] text-[#2563eb]" : "border-transparent text-[#607894] hover:text-[#304b66]"}`}>{label}</button>)}</nav>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_332px]">
        <div className="space-y-3">
          {tab === "ficha" ? <><section className={`${card} p-4 sm:p-5`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-black text-[#102a43]">Ficha comercial</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Datos de origen y edición para publicar el producto.</p></div><span className="text-[11px] font-extrabold text-[#7856d8]">● editorial</span></div><dl className="mt-4 grid gap-x-5 sm:grid-cols-2"><Field label="Nombre comercial" value={productName} /><Field label="Marca" value={detail.taxonomy.brand?.name} /><Field label="Categoría" value={detail.taxonomy.category.name} /><Field label="Familia" value={detail.taxonomy.family.name} /><Field label="Aplicación" value={detail.technicalData.application} /><Field label="Descripción editorial" value={detail.editorialData.editorialDescription} /></dl></section><section className={`${card} p-4 sm:p-5`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-black text-[#102a43]">Atributos técnicos</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Valores persistidos para búsqueda y ficha de tienda.</p></div><button type="button" onClick={openEditorial} disabled={!canEdit} className="inline-flex items-center gap-2 text-[12px] font-extrabold text-[#2563eb] disabled:opacity-50"><Edit3 className="h-4 w-4" aria-hidden="true" /> Editar ficha</button></div><dl className="mt-4 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">{technical.map(([label, value]) => <Field key={label} label={label} value={value} />)}</dl></section><section className={`${card} p-4 sm:p-5`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-black text-[#102a43]">Precio e inventario</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Datos vigentes por local y precio minorista actual.</p></div><div className="flex gap-2"><button type="button" disabled={!canAdjustInventory} onClick={() => setDrawer("inventory")} className={secondaryButton}><Package className="h-4 w-4" aria-hidden="true" /> Ajustar stock</button><button type="button" disabled={!canEditPricing} onClick={() => { setPriceAmount(analytics.currentPrice?.amount?.toFixed(2) ?? ""); setPriceReason(""); setPriceDate(""); setDrawer("price"); }} className={secondaryButton}><Pencil className="h-4 w-4" aria-hidden="true" /> Ajustar precio</button></div></div><div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px]"><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead className="border-b border-[#dce6ee]"><tr>{["Local", "Físico", "Reservado", "Disponible", "Mínimo", "Estado"].map((label) => <th key={label} className="px-2 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#7890a8]">{label}</th>)}</tr></thead><tbody>{analytics.inventory.map((row) => <tr key={row.locationId} className="border-b border-[#edf2f6] last:border-0"><td className="px-2 py-3 text-[12px] font-extrabold text-[#304b66]">{row.location}</td><td className="px-2 py-3 font-mono text-[12px] text-[#607894]">{row.onHand}</td><td className="px-2 py-3 font-mono text-[12px] text-[#607894]">{row.reserved}</td><td className="px-2 py-3 font-mono text-[12px] font-extrabold text-[#304b66]">{row.available}</td><td className="px-2 py-3 font-mono text-[12px] text-[#607894]">{row.minimumStock ?? "No definido"}</td><td className="px-2 py-3"><span className={`rounded-md px-2 py-1 text-[11px] font-extrabold ${row.minimumStock !== null && row.available <= row.minimumStock ? "bg-[#fff3df] text-[#9a5c16]" : "bg-[#e8f8ef] text-[#087443]"}`}>{row.minimumStock !== null && row.available <= row.minimumStock ? "Revisar" : "Sobre mínimo"}</span></td></tr>)}</tbody></table>{!analytics.inventory.length ? <p className="py-6 text-center text-[13px] font-semibold text-[#71869c]">No existe saldo de inventario para este producto.</p> : null}</div><div className="rounded-xl bg-[#eaf2ff] p-4"><p className="text-[11px] font-semibold text-[#607894]">Precio minorista</p><p className="mt-2 whitespace-nowrap text-[24px] font-black tracking-[-0.04em] text-[#2563eb]">{money(analytics.currentPrice)}</p><p className="mt-2 text-[11px] font-semibold text-[#607894]">Vigente desde {dateLabel(priceRecord?.validFrom)}</p></div></div></section></> : null}

          {tab === "precios" ? <section className={`${card} p-4 sm:p-5`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-black text-[#102a43]">Precios versionados</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Cada cambio requiere motivo y conserva historial transaccional.</p></div><button type="button" disabled={!canEditPricing} onClick={() => { setPriceAmount(""); setPriceReason(""); setPriceDate(""); setDrawer("price"); }} className={primaryButton}><Plus className="h-4 w-4" aria-hidden="true" /> Nuevo precio</button></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="border-b border-[#dce6ee]"><tr>{["Tipo", "Importe", "Estado", "Vigencia", "Actualizado"].map((label) => <th key={label} className="px-2 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#7890a8]">{label}</th>)}</tr></thead><tbody>{(detail.pricing ?? []).map((row) => <tr key={row.id} className="border-b border-[#edf2f6] last:border-0"><td className="px-2 py-3 text-[12px] font-extrabold text-[#304b66]">{row.priceType === "RETAIL" ? "Minorista" : row.priceType === "WHOLESALE" ? "Mayorista" : row.priceType === "MINIMUM" ? "Mínimo" : row.priceType === "SPECIAL" ? "Especial" : "Costo"}</td><td className="whitespace-nowrap px-2 py-3 font-mono text-[12px] font-extrabold text-[#304b66]">{money({ amount: Number(row.amount), currency: row.currency })}</td><td className="px-2 py-3"><span className={`rounded-md px-2 py-1 text-[11px] font-extrabold ${row.active && row.status === "ACTIVE" ? "bg-[#e8f8ef] text-[#087443]" : "bg-[#f1f4f7] text-[#607894]"}`}>{row.active && row.status === "ACTIVE" ? "Vigente" : row.status}</span></td><td className="px-2 py-3 text-[12px] font-semibold text-[#607894]">{dateLabel(row.validFrom)}{row.validUntil ? ` → ${dateLabel(row.validUntil)}` : " → abierto"}</td><td className="px-2 py-3 text-[12px] font-semibold text-[#607894]">{dateLabel(row.updatedAt)}</td></tr>)}</tbody></table>{!detail.pricing?.length ? <p className="py-8 text-center text-[13px] font-semibold text-[#71869c]">No hay precios persistidos para este producto.</p> : null}</div></section> : null}

          {tab === "inventario" ? <section className={`${card} p-4 sm:p-5`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-black text-[#102a43]">Inventario por local</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">El disponible es físico menos reservado.</p></div><button type="button" disabled={!canAdjustInventory || !analytics.inventory.length} onClick={() => setDrawer("inventory")} className={primaryButton}><Plus className="h-4 w-4" aria-hidden="true" /> Registrar movimiento</button></div><div className="mt-4 grid gap-2">{analytics.inventory.map((row) => <div key={row.locationId} className="grid items-center gap-2 rounded-lg border border-[#edf2f6] p-3 sm:grid-cols-[1.4fr_repeat(4,1fr)]"><div><p className="text-[12px] font-extrabold text-[#304b66]">{row.location}</p><p className="mt-1 text-[11px] font-semibold text-[#8296a9]">Disponible {row.available}</p></div><p className="text-[12px] font-mono text-[#607894]">Físico <strong className="text-[#304b66]">{row.onHand}</strong></p><p className="text-[12px] font-mono text-[#607894]">Reservado <strong className="text-[#304b66]">{row.reserved}</strong></p><p className="text-[12px] font-mono text-[#607894]">Mínimo <strong className="text-[#304b66]">{row.minimumStock ?? "Sin definir"}</strong></p><span className={`justify-self-start rounded-md px-2 py-1 text-[11px] font-extrabold ${row.minimumStock !== null && row.available <= row.minimumStock ? "bg-[#fff3df] text-[#9a5c16]" : "bg-[#e8f8ef] text-[#087443]"}`}>{row.minimumStock !== null && row.available <= row.minimumStock ? "Revisar" : "Sobre mínimo"}</span></div>)}{!analytics.inventory.length ? <p className="py-8 text-center text-[13px] font-semibold text-[#71869c]">No existe saldo de inventario para este producto.</p> : null}</div></section> : null}

          {tab === "imagenes" ? <section className={`${card} p-4 sm:p-5`}><ProductMediaManager key={productId} productId={productId} productName={productName} initialMedia={detail.media} canEdit={canEditMedia} /></section> : null}

          {tab === "historial" ? <section className={`${card} p-4 sm:p-5`}><div><h2 className="text-[16px] font-black text-[#102a43]">Historial de la ficha</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Cambios editoriales auditados y versiones de precio.</p></div><div className="mt-4 space-y-3">{detail.auditHistory.map((entry) => <div key={entry.id} className="flex items-start gap-3 border-t border-[#edf2f6] pt-3"><span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eaf2ff] text-[#2563eb]"><FileClock className="h-4 w-4" aria-hidden="true" /></span><div><p className="text-[12px] font-extrabold text-[#304b66]">{entry.action}</p><p className="mt-1 text-[11px] font-semibold text-[#8296a9]">{dateLabel(entry.createdAt)} · actor {entry.actorId ?? "no identificado"}</p></div></div>)}{analytics.priceHistory.map((entry, index) => <div key={`${entry.createdAt}-${index}`} className="flex items-start gap-3 border-t border-[#edf2f6] pt-3"><span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f0ebff] text-[#7856d8]"><Tag className="h-4 w-4" aria-hidden="true" /></span><div><p className="text-[12px] font-extrabold text-[#304b66]">Precio {entry.priceType === "RETAIL" ? "minorista" : entry.priceType.toLowerCase()}</p><p className="mt-1 text-[11px] font-semibold text-[#8296a9]">{money({ amount: Number(entry.newAmount), currency: entry.currency })} · {entry.reason || "Motivo no registrado"} · {dateLabel(entry.createdAt)}</p></div></div>)}{!detail.auditHistory.length && !analytics.priceHistory.length ? <p className="rounded-lg border border-dashed border-[#dce6ee] bg-[#fbfcfd] p-5 text-center text-[13px] font-semibold text-[#71869c]">No hay eventos de historial para este producto.</p> : null}</div></section> : null}
        </div>

        <aside className="grid items-start gap-3">
          <section className={`${card} p-4`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-black text-[#102a43]">Preparación para publicar</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Completa lo necesario antes de mostrarlo.</p></div><span className="rounded-md bg-[#fff3df] px-2 py-1 text-[11px] font-extrabold text-[#9a5c16]">{readyCount} de {checklist.length}</span></div><div className="mt-4 flex items-center gap-3"><div className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[5px] border-[#cfe1fb] text-[13px] font-black text-[#2563eb]"><span>{Math.round((readyCount / checklist.length) * 100)}%</span></div><div><p className="text-[13px] font-extrabold text-[#304b66]">{readyCount === checklist.length ? "Ficha lista" : "Ficha incompleta"}</p><p className="mt-1 text-[11px] font-semibold text-[#8296a9]">{readyCount === checklist.length ? "Puede pasar a publicación." : "Falta completar campos editoriales."}</p></div></div><ul className="mt-4">{checklist.map((row) => <ChecklistRow key={row.label} {...row} />)}</ul></section>
          <section className={`${card} overflow-hidden`}><div className="flex items-start justify-between gap-3 p-4"><div><h2 className="text-[16px] font-black text-[#102a43]">Vista en tienda</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Así lo verá el cliente.</p></div><Eye className="h-4 w-4 text-[#8296a9]" aria-hidden="true" /></div><div className="mx-4 mb-4 rounded-xl border border-[#edf2f6] bg-[#fbfcfd] p-3"><div className="flex items-start gap-3"><span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white"><Image src={previewImage} alt={primaryMedia?.altText || productName} fill sizes="80px" className="object-contain p-2" unoptimized={previewImage.startsWith("/api/")} /></span><div className="min-w-0"><p className="line-clamp-2 text-[12px] font-extrabold text-[#304b66]">{productName}</p><p className="mt-1 font-mono text-[10px] font-semibold text-[#8296a9]">SKU {detail.sourceIdentity.sku} · {availabilityLabel[availability]}</p><p className="mt-2 whitespace-nowrap text-[20px] font-black tracking-[-0.03em] text-[#102a43]">{money(analytics.currentPrice)}</p></div></div>{!primaryMedia ? <p className="mt-3 text-[11px] font-semibold text-[#9a5c16]">Imagen referencial: aún no hay media propia asociada.</p> : null}</div></section>
          <section className={`${card} p-4`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-black text-[#102a43]">Promociones activas</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Aplicables a este producto.</p></div><span className="rounded-md bg-[#e8f8ef] px-2 py-1 text-[11px] font-extrabold text-[#087443]">{promotions.length} activas</span></div><div className="mt-3 space-y-2">{promotions.map((promotion) => <div key={promotion.id} className="rounded-lg border border-[#b8e8cf] bg-[#f0fbf5] p-3"><div className="flex items-start gap-2"><Tag className="mt-0.5 h-4 w-4 text-[#0b8f5a]" aria-hidden="true" /><div><p className="text-[12px] font-extrabold text-[#087443]">{promotion.name}</p><p className="mt-1 text-[11px] font-semibold text-[#35634b]">{promotion.type} · termina {dateLabel(promotion.endsAt)}</p></div></div></div>)}{!promotions.length ? <p className="rounded-lg border border-dashed border-[#dce6ee] bg-[#fbfcfd] p-4 text-center text-[13px] font-semibold text-[#71869c]">No hay promociones activas aplicables.</p> : null}</div></section>
        </aside>
      </div>

      <AdminDrawer open={drawer === "editorial"} onClose={() => setDrawer(null)} title="Editar ficha comercial" size="wide" footer={<div className="flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setDrawer(null)}>Cancelar</button><button type="submit" form="product-editorial-form" className={primaryButton} disabled={busy}>{busy ? "Guardando…" : "Guardar ficha"}</button></div>}><form id="product-editorial-form" onSubmit={saveEditorial} className="space-y-4"><label className="block text-[12px] font-extrabold text-[#304b66]">Nombre comercial<input value={commercialName} onChange={(event) => setCommercialName(event.currentTarget.value)} className={`${input} mt-1`} maxLength={500} /></label><label className="block text-[12px] font-extrabold text-[#304b66]">Descripción editorial<textarea value={description} onChange={(event) => setDescription(event.currentTarget.value)} className="mt-1 min-h-36 w-full rounded-lg border border-[#d5e0e9] p-3 text-[13px] font-semibold text-[#173654] outline-none focus:border-[#2277ee]" maxLength={4000} /><span className="mt-1 block text-[11px] font-semibold text-[#8296a9]">La publicación exige una descripción suficiente y una imagen principal.</span></label><p className="rounded-lg bg-[#f7fafc] p-3 text-[12px] leading-5 text-[#71869c]">SKU, nombre de origen y taxonomía fuente son inmutables desde este editor.</p></form></AdminDrawer>
      <AdminDrawer open={drawer === "price"} onClose={() => setDrawer(null)} title={priceRecord ? "Programar reemplazo de precio" : "Nuevo precio minorista"} footer={<div className="flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setDrawer(null)}>Cancelar</button><button type="submit" form="product-price-form" className={primaryButton} disabled={busy || !priceAmount || !priceReason.trim() || (Boolean(priceRecord) && !priceDate)}>{busy ? "Guardando…" : "Guardar precio"}</button></div>}><form id="product-price-form" onSubmit={savePrice} className="space-y-4"><div className="rounded-lg bg-[#f7fafc] p-3"><p className="text-[11px] font-semibold text-[#8296a9]">Precio actual</p><p className="mt-1 whitespace-nowrap text-[20px] font-black text-[#102a43]">{money(analytics.currentPrice)}</p></div><label className="block text-[12px] font-extrabold text-[#304b66]">Importe<input value={priceAmount} onChange={(event) => setPriceAmount(event.currentTarget.value)} type="number" min="0.01" step="0.01" className={`${input} mt-1`} required /></label>{priceRecord ? <label className="block text-[12px] font-extrabold text-[#304b66]">Vigente desde<input value={priceDate} onChange={(event) => setPriceDate(event.currentTarget.value)} type="datetime-local" className={`${input} mt-1`} required /><span className="mt-1 block text-[11px] font-semibold text-[#8296a9]">Debe ser una fecha futura para reemplazar la vigencia actual.</span></label> : null}<label className="block text-[12px] font-extrabold text-[#304b66]">Motivo del cambio <span className="text-[#b42318]">*</span><textarea value={priceReason} onChange={(event) => setPriceReason(event.currentTarget.value)} className="mt-1 min-h-24 w-full rounded-lg border border-[#d5e0e9] p-3 text-[13px] font-semibold text-[#173654] outline-none focus:border-[#2277ee]" required placeholder="Ej. actualización de lista del proveedor" /></label></form></AdminDrawer>
      <AdminDrawer open={drawer === "inventory"} onClose={() => setDrawer(null)} title="Registrar movimiento de inventario" footer={<div className="flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setDrawer(null)}>Cancelar</button><button type="submit" form="product-inventory-form" className={primaryButton} disabled={busy || !inventoryLocation || !inventoryQuantity || !inventoryReason.trim() || !inventoryNotes.trim()}>{busy ? "Guardando…" : "Registrar movimiento"}</button></div>}><form id="product-inventory-form" onSubmit={saveInventory} className="space-y-4"><label className="block text-[12px] font-extrabold text-[#304b66]">Local<select value={inventoryLocation} onChange={(event) => setInventoryLocation(event.currentTarget.value)} className={`${input} mt-1`} required><option value="">Selecciona un local</option>{analytics.inventory.map((row) => <option key={row.locationId} value={row.locationId}>{row.location} · actual {row.onHand}</option>)}</select></label><label className="block text-[12px] font-extrabold text-[#304b66]">Tipo<select value={inventoryType} onChange={(event) => setInventoryType(event.currentTarget.value)} className={`${input} mt-1`}><option value="ADJUSTMENT_IN">Entrada por ajuste</option><option value="ADJUSTMENT_OUT">Salida por ajuste</option><option value="PURCHASE_RECEIPT">Recepción de compra</option><option value="RETURN_IN">Devolución de entrada</option><option value="RETURN_OUT">Devolución de salida</option></select></label><label className="block text-[12px] font-extrabold text-[#304b66]">Cantidad<input value={inventoryQuantity} onChange={(event) => setInventoryQuantity(event.currentTarget.value)} type="number" min="1" step="1" className={`${input} mt-1`} required /></label><label className="block text-[12px] font-extrabold text-[#304b66]">Motivo<textarea value={inventoryReason} onChange={(event) => setInventoryReason(event.currentTarget.value)} className="mt-1 min-h-20 w-full rounded-lg border border-[#d5e0e9] p-3 text-[13px] font-semibold text-[#173654] outline-none focus:border-[#2277ee]" required /></label><label className="block text-[12px] font-extrabold text-[#304b66]">Notas de trazabilidad<textarea value={inventoryNotes} onChange={(event) => setInventoryNotes(event.currentTarget.value)} className="mt-1 min-h-20 w-full rounded-lg border border-[#d5e0e9] p-3 text-[13px] font-semibold text-[#173654] outline-none focus:border-[#2277ee]" required /></label></form></AdminDrawer>
      <AdminDrawer open={drawer === "publish"} onClose={() => setDrawer(null)} title="Confirmar publicación" footer={<div className="flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setDrawer(null)}>Cancelar</button><button type="button" className={primaryButton} onClick={() => void publish()} disabled={busy}>{busy ? "Publicando…" : "Publicar producto"}</button></div>}><div className="space-y-3"><div className="flex items-start gap-3 rounded-lg border border-[#b8e8cf] bg-[#f0fbf5] p-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0b8f5a]" aria-hidden="true" /><p className="text-[13px] leading-5 text-[#276349]">El checklist está completo. La transición se guardará junto con su auditoría.</p></div><p className="text-[13px] leading-5 text-[#607894]">Producto: <strong className="text-[#304b66]">{productName}</strong><br />SKU: <span className="font-mono text-[#304b66]">{detail.sourceIdentity.sku}</span></p></div></AdminDrawer>
    </div>
  );
}
