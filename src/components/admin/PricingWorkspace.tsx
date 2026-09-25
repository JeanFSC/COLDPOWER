"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  Archive,
  ArrowDownUp,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  Download,
  FileClock,
  Filter,
  History,
  Layers3,
  MoreHorizontal,
  PackageSearch,
  Percent,
  Plus,
  Search,
  Tag,
  Upload,
  X,
} from "lucide-react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminTooltip } from "@/components/admin/AdminTooltip";
import { BulkPricingWorkspace } from "@/components/admin/BulkPricingWorkspace";
import { PricingImportDialog } from "@/components/admin/PricingImportDialog";
import type { PricingFilters, PricingItem, PricingListResponse, PricingPriceRecord, PricingPriceType } from "@/lib/pricing-contract";
import { formatPrice, formatValidity, getPriceEffectiveStatus, getPriceDelta, pricingStatusLabels, pricingTypeLabels } from "@/lib/pricing-domain";
import { resolveProductImage } from "@/lib/product-image";

const panel = "min-w-0 rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(16,42,67,0.035)]";
const muted = "text-slate-400";
const field = "h-10 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

type Rule = { id: string; name: string; maxPercentage: string; approvalAbovePercentage: string; status: string; validFrom?: Date | string | null; validUntil?: Date | string | null };
type HistoryEntry = { id: string; sku: string; productName: string; priceType: string; previousAmount: string | null; newAmount: string; currency: string; reason: string | null; actorName: string | null; createdAt: Date | string };
type Props = {
  items: PricingItem[];
  metrics: PricingListResponse["metrics"];
  historyCount?: number;
  history?: HistoryEntry[];
  rules?: Rule[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  exportHref?: string;
  filters: PricingFilters;
  facets: { categories: Array<{ id: string; name: string }>; families: Array<{ id: string; name: string }>; brands: Array<{ id: string; name: string }>; statuses: string[] };
  canEditPrices?: boolean;
  canManageCost?: boolean;
  canViewMargin?: boolean;
  canManageDiscounts?: boolean;
};

const typeOptions: Array<{ value: PricingPriceType | ""; label: string }> = [
  { value: "", label: "Todos los tipos" },
  { value: "RETAIL", label: "Minorista" },
  { value: "WHOLESALE", label: "Mayorista" },
  { value: "MINIMUM", label: "Mínimo autorizado" },
  { value: "SPECIAL", label: "Precio especial" },
  { value: "COST", label: "Costo" },
];

const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "CURRENT", label: "Vigente" },
  { value: "SCHEDULED", label: "Programado" },
  { value: "EXPIRED", label: "Vencido" },
  { value: "INACTIVE", label: "Inactivo" },
  { value: "ARCHIVED", label: "Archivado" },
  { value: "MISSING", label: "Sin precio" },
];

function iconButton(label: string) {
  void label;
  return `inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600`;
}

function dateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" })
    .format(new Date(value))
    .replace(/[\u00a0\u202f]/g, " ");
}

function dateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (part: string) => parts.find((item) => item.type === part)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function badge(status: string | undefined) {
  const tones: Record<string, string> = {
    CURRENT: "border-emerald-200 bg-emerald-50 text-emerald-700",
    SCHEDULED: "border-blue-200 bg-blue-50 text-blue-600",
    EXPIRED: "border-amber-200 bg-amber-50 text-amber-700",
    INACTIVE: "border-slate-200 bg-slate-50 text-slate-500",
    ARCHIVED: "border-slate-200 bg-slate-50 text-slate-400",
    MISSING: "border-rose-200 bg-rose-50 text-rose-600",
    ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
  return tones[status ?? ""] ?? tones.INACTIVE;
}

function PriceCell({ price, label, accent }: { price: PricingPriceRecord | null | undefined; label: string; accent?: string }) {
  return (
    <div className="min-w-[104px]">
      <p className={`text-[9px] font-extrabold uppercase tracking-[0.08em] ${accent ?? muted}`}>{label}</p>
      <p className="mt-1 text-[12px] font-black text-slate-900">{price ? formatPrice(price.amount, price.currency) : "—"}</p>
      {price?.wholesaleMinQty ? <p className={`mt-0.5 text-[9px] font-semibold ${muted}`}>desde {price.wholesaleMinQty} un.</p> : null}
    </div>
  );
}

function ProductThumb({ item, size = 42 }: { item: PricingItem; size?: number }) {
  const media = resolveProductImage({
    images: item.media?.primaryUrl ? [item.media.primaryUrl] : [],
    family: item.familyName,
    category: item.categoryName,
  });
  const alt = item.media?.altText ?? (media.isReference ? `Imagen referencial: ${item.productName}` : item.productName);
  return <span className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50" style={{ width: size, height: size }} title={media.isReference ? "Imagen referencial" : undefined}><Image src={media.src} alt={alt} fill sizes={`${size}px`} className="object-contain p-1.5" unoptimized={media.src.startsWith("/api/")} />{media.isReference ? <span className="absolute inset-x-0 bottom-0 truncate bg-slate-900/85 px-0.5 text-center text-[7px] font-extrabold leading-3 text-white">Imagen referencial</span> : null}</span>;
}

function SummaryCard({ label, value, note, icon: Icon, tone = "blue", onClick }: { label: string; value: number; note: string; icon: typeof Tag; tone?: "blue" | "orange" | "green" | "red"; onClick?: () => void }) {
  const tones = { blue: "bg-blue-50 text-blue-600", orange: "bg-amber-50 text-amber-600", green: "bg-emerald-50 text-emerald-600", red: "bg-rose-50 text-rose-500" };
  return <button type="button" onClick={onClick} className={`${panel} group p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_8px_20px_rgba(34,119,238,0.08)]`}><div className="flex items-start justify-between gap-3"><span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" aria-hidden="true" /></span><MoreHorizontal className="h-4 w-4 text-slate-400 opacity-0 transition group-hover:opacity-100" aria-hidden="true" /></div><p className={`mt-4 text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>{label}</p><p className="mt-1 text-[25px] font-black tracking-[-0.03em] text-slate-900">{value.toLocaleString("es-PE")}</p><p className="mt-1 text-[10px] font-semibold text-slate-500">{note}</p></button>;
}

function SelectField({ label, value, options, onChange, className = "" }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void; className?: string }) {
  return <label className={`block ${className}`}><span className={`mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>{label}</span><span className="relative block"><select value={value} onChange={(event) => onChange(event.target.value)} className={`${field} has-custom-chevron w-full appearance-none pr-8`}><option value="">Todos</option>{options.filter((option) => option.value !== "").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" /></span></label>;
}

function filterQuery(filters: PricingFilters, changes: Record<string, string | null | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== null && value !== "") next.set(key, String(value));
  for (const [key, value] of Object.entries(changes)) { if (value === undefined || value === null || value === "") next.delete(key); else next.set(key, value); }
  if (!Object.prototype.hasOwnProperty.call(changes, "page")) next.set("page", "1");
  return next.toString();
}

function PriceEditor({ initialPrice, product, canManageCost, onSaved }: { initialPrice: PricingPriceRecord | null; product: PricingItem | null; canManageCost: boolean; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isNew = !initialPrice;
  const [amount, setAmount] = useState(initialPrice?.amount ?? "");
  const [currency, setCurrency] = useState(initialPrice?.currency ?? "PEN");
  const [validFrom, setValidFrom] = useState(() => dateInputValue(initialPrice?.validFrom ?? new Date()));
  const [now] = useState(() => Date.now());
  const scheduleMode = Boolean(initialPrice && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(validFrom) && new Date(`${validFrom}:00-05:00`).getTime() > now);
  const baseline = initialPrice?.amount ?? product?.pricing?.retail?.amount ?? null;
  const delta = amount && baseline ? getPriceDelta(amount, baseline) : null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true); setError("");
    const body = { ...data, amount: String(data.amount ?? ""), wholesaleMinQty: data.wholesaleMinQty ? Number(data.wholesaleMinQty) : undefined, minimumAllowed: data.minimumAllowed || undefined, validFrom: data.validFrom || undefined, validUntil: data.validUntil || undefined, reason: String(data.reason ?? "").trim(), idempotencyKey: crypto.randomUUID() };
    try {
      const response = await fetch(isNew ? "/api/admin/precios" : scheduleMode ? "/api/admin/precios/reemplazar" : `/api/admin/precios/${initialPrice.id}`, { method: isNew ? "POST" : scheduleMode ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(isNew ? { ...body, productId: product?.productId } : scheduleMode ? { ...body, priceId: initialPrice.id } : body) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "No se pudo guardar el precio.");
      onSaved();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo guardar el precio."); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-4"><div className="rounded-xl border border-slate-200 bg-blue-50 p-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blue-600">{isNew ? "Nuevo registro" : scheduleMode ? "Sustitución programada" : "Edición controlada"}</p><p className="mt-1 text-[12px] font-bold text-slate-900">{product?.productName ?? initialPrice?.priceType ?? "Precio"}</p><p className={`mt-0.5 font-mono text-[10px] ${muted}`}>{product?.sku ?? ""}</p></div>{isNew && !product ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold text-amber-800">Selecciona un producto antes de editar un precio.</p> : null}{scheduleMode ? <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-[10px] font-semibold leading-5 text-blue-700">El precio actual se cerrará exactamente cuando empiece esta vigencia y el nuevo registro quedará programado.</p> : null}<div className="grid grid-cols-2 gap-3"><label><span className={`mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Importe</span><input required name="amount" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" className={`${field} w-full`} placeholder="0.00" /></label><label><span className={`mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Moneda</span><select required name="currency" value={currency} onChange={(event) => setCurrency(event.target.value)} className={`${field} w-full`}><option value="PEN">PEN · S/</option><option value="USD">USD · US$</option></select></label></div><SelectField label="Tipo de precio" value={initialPrice?.priceType ?? "RETAIL"} options={typeOptions} onChange={() => {}} className="hidden" /><label><span className={`mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Tipo de precio</span><span className="relative block"><select required name="priceType" defaultValue={initialPrice?.priceType ?? "RETAIL"} className={`${field} has-custom-chevron w-full appearance-none pr-8`}>{typeOptions.filter((option) => option.value && (option.value !== "COST" || canManageCost)).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" /></span></label><div className="grid grid-cols-2 gap-3"><label><span className={`mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Válido desde</span><input required name="validFrom" type="datetime-local" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} className={`${field} w-full`} /></label><label><span className={`mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Válido hasta</span><input name="validUntil" type="datetime-local" defaultValue={dateInputValue(initialPrice?.validUntil)} className={`${field} w-full`} /></label></div><div className="grid grid-cols-2 gap-3"><label><span className={`mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Mínimo mayorista</span><input name="wholesaleMinQty" type="number" min="1" step="1" defaultValue={initialPrice?.wholesaleMinQty ?? ""} className={`${field} w-full`} placeholder="Solo mayorista" /></label><label><span className={`mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Mínimo autorizado</span><input name="minimumAllowed" inputMode="decimal" defaultValue={initialPrice?.minimumAllowed ?? ""} className={`${field} w-full`} placeholder="Opcional" /></label></div><label><span className={`mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Motivo del cambio</span><textarea required name="reason" minLength={3} rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Describe por qué cambia este precio…" /></label><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="flex items-center justify-between"><span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">Vista previa</span><span className="text-[10px] font-bold text-slate-400">{currency}</span></div><div className="mt-1 flex items-end justify-between gap-3"><strong className="text-[17px] font-black text-slate-900">{amount || "0.00"}</strong><span className={`text-[11px] font-extrabold ${delta === null ? "text-slate-400" : delta > 0 ? "text-rose-600" : delta < 0 ? "text-emerald-600" : "text-slate-400"}`}>{delta === null ? "Ingresa un importe" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}% vs. referencia`}</span></div></div>{error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-bold text-rose-600">{error}</p> : null}<button type="submit" disabled={busy || (isNew && !product)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-[11px] font-extrabold text-white shadow-[0_6px_14px_rgba(37,99,235,0.18)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Check className="h-4 w-4" aria-hidden="true" />{busy ? "Guardando…" : scheduleMode ? "Programar sustitución" : "Guardar precio"}</button></form>;
}

function ProductSearch({ onSelect }: { onSelect: (item: PricingItem) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(false);
  async function search(value: string) {
    setQuery(value);
    if (value.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try { const response = await fetch(`/api/admin/precios/productos?q=${encodeURIComponent(value.trim())}`); const payload = await response.json(); setResults(payload.items ?? []); } catch { setResults([]); } finally { setLoading(false); }
  }
  return <div className="relative"><label><span className={`mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Producto</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" /><input value={query} onChange={(event) => void search(event.target.value)} className={`${field} w-full pl-9`} placeholder="Buscar por SKU, nombre o marca…" /></span></label>{loading ? <p className={`mt-2 text-[10px] ${muted}`}>Buscando productos…</p> : null}{results.length ? <div className="absolute inset-x-0 top-[68px] z-10 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(16,42,67,0.12)]">{results.map((item) => <button type="button" key={item.productId} onClick={() => { onSelect(item); setQuery(`${item.sku} · ${item.productName}`); setResults([]); }} className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-blue-50"><ProductThumb item={item} size={30} /><span className="min-w-0"><strong className="block truncate text-[11px] text-slate-900">{item.productName}</strong><span className={`font-mono text-[9px] ${muted}`}>{item.sku}</span></span></button>)}</div> : null}</div>;
}

function DiscountEditor({ rule, onSaved }: { rule: Rule | null; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/descuentos", { method: rule ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, ...(rule ? { id: rule.id, status: rule.status } : {}), reason: String(data.reason ?? "").trim() }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "No se pudo guardar la regla.");
      onSaved();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo guardar la regla."); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-4"><div className="rounded-xl border border-purple-200 bg-purple-50 p-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-purple-600">Gobierno de descuentos</p><p className="mt-1 text-[11px] font-semibold leading-5 text-slate-600">El umbral de aprobación no puede superar el máximo permitido.</p></div><label><span className={`mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Nombre de regla</span><input required name="name" defaultValue={rule?.name ?? ""} className={`${field} w-full`} placeholder="Ej. Canal mayorista" /></label><div className="grid grid-cols-2 gap-3"><label><span className={`mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Máximo permitido</span><input required name="maxPercentage" defaultValue={rule?.maxPercentage ?? ""} inputMode="decimal" className={`${field} w-full`} placeholder="20" /></label><label><span className={`mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Aprobación desde</span><input required name="approvalAbovePercentage" defaultValue={rule?.approvalAbovePercentage ?? ""} inputMode="decimal" className={`${field} w-full`} placeholder="15" /></label></div><label><span className={`mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Motivo obligatorio</span><textarea required name="reason" rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Describe el alcance de la regla…" /></label>{error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-bold text-rose-600">{error}</p> : null}<button type="submit" disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 text-[11px] font-extrabold text-white shadow-[0_6px_14px_rgba(128,87,232,0.18)] disabled:opacity-50"><Check className="h-4 w-4" aria-hidden="true" />{busy ? "Guardando…" : rule ? "Guardar cambios" : "Crear regla"}</button></form>;
}

export function PricingWorkspace({ items, metrics, historyCount = 0, history = [], rules = [], page, pageSize, totalItems, totalPages, exportHref, filters, facets, canEditPrices = false, canManageCost = false, canViewMargin = false, canManageDiscounts = false }: Props) {
  const router = useRouter();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"prices" | "bulk" | "discounts" | "history">("prices");
  const [detail, setDetail] = useState<PricingItem | null>(null);
  const [editor, setEditor] = useState<{ price: PricingPriceRecord | null; product: PricingItem | null } | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<PricingItem | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<PricingPriceRecord | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [discountEditor, setDiscountEditor] = useState<Rule | null | false>(false);
  const [importOpen, setImportOpen] = useState(false);
  const [message, setMessage] = useState("");
  const totalProducts = metrics.totalProducts ?? totalItems;
  const retailPriced = metrics.retailPricedProducts ?? metrics.totalWithPrice;
  const retailMissing = metrics.retailMissingProducts ?? metrics.totalWithoutPrice;
  const coverage = totalProducts ? Math.round((retailPriced / totalProducts) * 100) : 0;
  const detailMargin = detail?.pricing?.retail && detail.pricing.cost && detail.pricing.retail.currency === detail.pricing.cost.currency ? { amount: Number(detail.pricing.retail.amount) - Number(detail.pricing.cost.amount), percentage: Number(detail.pricing.cost.amount) ? ((Number(detail.pricing.retail.amount) - Number(detail.pricing.cost.amount)) / Number(detail.pricing.retail.amount)) * 100 : null } : null;
  const activeFilterCount = [filters.categoryId, filters.familyId, filters.brandId, filters.priceType, filters.effectiveStatus, filters.pricingCoverage, filters.currency, filters.hasWholesale, filters.hasPromotion, filters.hasMinimum, filters.validFrom, filters.validUntil].filter((value) => value !== undefined && value !== "").length;
  const chips = useMemo(() => {
    const values: Array<{ key: string; label: string; value: string }> = [];
    if (filters.categoryId) values.push({ key: "categoryId", label: "Categoría", value: facets.categories.find((item) => item.id === filters.categoryId)?.name ?? filters.categoryId });
    if (filters.familyId) values.push({ key: "familyId", label: "Familia", value: facets.families.find((item) => item.id === filters.familyId)?.name ?? filters.familyId });
    if (filters.brandId) values.push({ key: "brandId", label: "Marca", value: facets.brands.find((item) => item.id === filters.brandId)?.name ?? filters.brandId });
    if (filters.priceType) values.push({ key: "priceType", label: "Tipo", value: pricingTypeLabels[filters.priceType] });
    if (filters.effectiveStatus) values.push({ key: "effectiveStatus", label: "Estado", value: pricingStatusLabels[filters.effectiveStatus] });
    if (filters.pricingCoverage) values.push({ key: "pricingCoverage", label: "Cobertura", value: filters.pricingCoverage === "PRICED" ? "Con minorista" : "Sin minorista" });
    if (filters.currency) values.push({ key: "currency", label: "Moneda", value: filters.currency });
    if (filters.hasWholesale !== undefined) values.push({ key: "hasWholesale", label: "Mayorista", value: filters.hasWholesale ? "Configurado" : "Pendiente" });
    if (filters.hasPromotion !== undefined) values.push({ key: "hasPromotion", label: "Promoción", value: filters.hasPromotion ? "Activa" : "Sin promoción" });
    return values;
  }, [facets, filters]);

  function navigate(changes: Record<string, string | null | undefined>) { router.push(`/admin/precios?${filterQuery(filters, changes)}`); }
  function submitSearch(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); navigate({ query: String(data.get("query") ?? "").trim() || null }); }
  function openNewPrice() { setSelectedProduct(null); setEditor({ price: null, product: null }); }
  function closeEditor() { setEditor(null); setSelectedProduct(null); }
  function afterSaved() { closeEditor(); setMessage("Precio guardado y auditado correctamente."); router.refresh(); }
  function afterDiscountSaved() { setDiscountEditor(false); setMessage("Regla de descuento guardada y auditada correctamente."); router.refresh(); }
  function afterImportSaved(importMessage: string) { setImportOpen(false); setMessage(importMessage); router.refresh(); }
  async function archive() {
    if (!archiveTarget || archiveReason.trim().length < 3) return;
    setArchiveBusy(true);
    try {
      const response = await fetch(`/api/admin/precios/${archiveTarget.id}?reason=${encodeURIComponent(archiveReason.trim())}&idempotencyKey=${encodeURIComponent(crypto.randomUUID())}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "No se pudo archivar el precio.");
      setArchiveTarget(null); setArchiveReason(""); setMessage("Precio archivado y auditado correctamente."); setDetail(null); router.refresh();
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "No se pudo archivar el precio."); } finally { setArchiveBusy(false); }
  }

  return <div className="space-y-5 pb-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-blue-600">Gobierno comercial</p><h1 className="mt-1 font-display text-[26px] font-black tracking-[-0.035em] text-slate-900">Gestión de precios</h1><p className={`mt-1.5 text-[12px] font-semibold ${muted}`}>Controla valores, vigencias y reglas sin perder trazabilidad.</p></div><div className="flex flex-wrap items-center gap-2"><a href={exportHref ?? "#"} download className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[11px] font-extrabold text-slate-700 transition hover:border-blue-400 hover:text-blue-600"><Download className="h-4 w-4" aria-hidden="true" />Exportar</a><button type="button" disabled={!canEditPrices} onClick={() => setImportOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[11px] font-extrabold text-slate-700 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-45"><Upload className="h-4 w-4" aria-hidden="true" />Importar lista</button><button type="button" disabled={!canEditPrices} onClick={openNewPrice} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-[11px] font-extrabold text-white shadow-[0_6px_14px_rgba(37,99,235,0.18)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-45"><Plus className="h-4 w-4" aria-hidden="true" />Nuevo precio</button></div></header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard label="Con precio minorista" value={retailPriced} note={`${coverage}% de cobertura del catálogo`} icon={CircleDollarSign} tone="blue" onClick={() => navigate({ pricingCoverage: "PRICED" })} /><SummaryCard label="Sin precio" value={retailMissing} note="Requieren carga o revisión" icon={CircleAlert} tone="red" onClick={() => navigate({ pricingCoverage: "MISSING" })} /><SummaryCard label="Mayorista configurado" value={metrics.wholesaleConfiguredProducts ?? 0} note="Con cantidad mínima válida" icon={Layers3} tone="green" onClick={() => navigate({ priceType: "WHOLESALE", hasWholesale: "true" })} /><SummaryCard label="Promociones activas" value={metrics.activeSpecialPrices ?? metrics.promotions} note={`${metrics.expiringSoon ?? 0} vencen en 7 días`} icon={Tag} tone="orange" onClick={() => navigate({ priceType: "SPECIAL", effectiveStatus: "CURRENT" })} /></div>
    <section className={panel} aria-label="Filtros de precios"><div className="flex flex-wrap items-center gap-2 p-3"><form onSubmit={submitSearch} className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" /><input name="query" defaultValue={filters.query ?? ""} className={`${field} w-full pl-9`} placeholder="Buscar SKU, producto, marca o familia…" aria-label="Buscar precios" /></form><SelectField label="Tipo" value={filters.priceType ?? ""} options={typeOptions} onChange={(value) => navigate({ priceType: value || null })} className="w-[156px]" /><SelectField label="Estado" value={filters.effectiveStatus ?? ""} options={statusOptions} onChange={(value) => navigate({ effectiveStatus: value || null, status: null })} className="w-[145px]" /><button type="button" onClick={() => setAdvancedOpen((value) => !value)} className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-[11px] font-extrabold transition ${advancedOpen || activeFilterCount ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-200 bg-white text-slate-700 hover:border-blue-400"}`}><Filter className="h-4 w-4" aria-hidden="true" />Más filtros{activeFilterCount ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[9px] text-white">{activeFilterCount}</span> : null}<ChevronDown className={`h-4 w-4 transition ${advancedOpen ? "rotate-180" : ""}`} aria-hidden="true" /></button><AdminTooltip label="Restablecer todos los filtros"><button type="button" onClick={() => router.push("/admin/precios")} className={iconButton("Limpiar filtros")} aria-label="Limpiar filtros"><X className="h-4 w-4" aria-hidden="true" /></button></AdminTooltip></div>{advancedOpen ? <div className="border-t border-slate-100 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="text-[13px] font-black text-slate-900">Refinar resultados</h2><p className={`mt-1 text-[10px] font-semibold ${muted}`}>Combina criterios sin perderlos al cambiar de página.</p></div><button type="button" onClick={() => setAdvancedOpen(false)} className={iconButton("Cerrar filtros")} aria-label="Cerrar filtros"><X className="h-4 w-4" aria-hidden="true" /></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><SelectField label="Categoría" value={filters.categoryId ?? ""} options={facets.categories.map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => navigate({ categoryId: value || null })} /><SelectField label="Familia" value={filters.familyId ?? ""} options={facets.families.map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => navigate({ familyId: value || null })} /><SelectField label="Marca" value={filters.brandId ?? ""} options={facets.brands.map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => navigate({ brandId: value || null })} /><SelectField label="Moneda" value={filters.currency ?? ""} options={[{ value: "PEN", label: "PEN · Soles" }, { value: "USD", label: "USD · Dólares" }]} onChange={(value) => navigate({ currency: value || null })} /><SelectField label="Cobertura minorista" value={filters.pricingCoverage ?? ""} options={[{ value: "PRICED", label: "Con precio vigente" }, { value: "MISSING", label: "Sin precio vigente" }]} onChange={(value) => navigate({ pricingCoverage: value || null })} /><SelectField label="Mayorista" value={filters.hasWholesale === undefined ? "" : String(filters.hasWholesale)} options={[{ value: "true", label: "Configurado" }, { value: "false", label: "Pendiente" }]} onChange={(value) => navigate({ hasWholesale: value || null })} /><SelectField label="Promoción" value={filters.hasPromotion === undefined ? "" : String(filters.hasPromotion)} options={[{ value: "true", label: "Con promoción" }, { value: "false", label: "Sin promoción" }]} onChange={(value) => navigate({ hasPromotion: value || null })} /><div className="grid grid-cols-2 gap-2"><label><span className={`mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Vigente desde</span><input type="date" value={filters.validFrom ?? ""} onChange={(event) => navigate({ validFrom: event.target.value || null })} className={`${field} w-full`} /></label><label><span className={`mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Hasta</span><input type="date" value={filters.validUntil ?? ""} onChange={(event) => navigate({ validUntil: event.target.value || null })} className={`${field} w-full`} /></label></div></div>{chips.length ? <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3"><span className={`text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Activos</span>{chips.map((chip) => <button type="button" key={chip.key} onClick={() => navigate({ [chip.key]: null })} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-blue-600">{chip.label}: {chip.value}<X className="h-3 w-3" aria-hidden="true" /></button>)}<button type="button" onClick={() => router.push("/admin/precios")} className="ml-auto text-[10px] font-extrabold text-blue-600">Limpiar todo</button></div> : null}</div> : null}</section>
    {message ? <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] font-bold text-emerald-700"><Check className="h-4 w-4" aria-hidden="true" />{message}<button type="button" onClick={() => setMessage("")} className="ml-auto"><X className="h-4 w-4" aria-hidden="true" /></button></div> : null}
    <nav className={`${panel} flex gap-1 overflow-x-auto p-1.5`} aria-label="Secciones de precios">{[{ key: "prices", label: "Precios", icon: Tag }, { key: "bulk", label: "Actualización masiva", icon: ArrowDownUp }, { key: "discounts", label: "Descuentos", icon: Percent }, { key: "history", label: "Historial", icon: History }].map(({ key, label, icon: Icon }) => <button type="button" key={key} onClick={() => setActiveTab(key as typeof activeTab)} className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[10px] font-extrabold transition ${activeTab === key ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-blue-600"}`}><Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}{key === "history" ? <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px]">{historyCount}</span> : null}</button>)}</nav>
    {activeTab === "prices" ? <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]"><section className={`${panel} overflow-hidden`}><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4"><div><h2 className="text-[14px] font-black text-slate-900">Lista de precios</h2><p className={`mt-1 text-[10px] font-semibold ${muted}`}>{totalItems.toLocaleString("es-PE")} productos en este alcance · página {page} de {totalPages}</p></div><div className="flex flex-wrap items-end justify-end gap-3"><SelectField label="Por página" value={String(pageSize)} options={[{ value: "12", label: "12 filas" }, { value: "25", label: "25 filas" }, { value: "50", label: "50 filas" }, { value: "100", label: "100 filas" }]} onChange={(value) => navigate({ pageSize: value, page: "1" })} className="w-[108px]" /><span className={`mb-2 text-[10px] font-semibold ${muted}`}>Ordenado por SKU</span><ArrowDownUp className="mb-2 h-4 w-4 text-slate-400" aria-hidden="true" /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[940px] text-left"><thead className="bg-slate-50 text-[9px] font-extrabold uppercase tracking-[0.08em] text-slate-400"><tr><th className="px-4 py-3">SKU / Producto</th><th className="px-3 py-3">Minorista</th><th className="px-3 py-3">Mayorista</th><th className="px-3 py-3">Mínimo</th><th className="px-3 py-3">Promoción</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Actualizado</th><th className="px-2 py-3" aria-label="Acciones" /></tr></thead><tbody>{items.map((item) => { const pricing = item.pricing ?? { retail: item.prices?.find((price) => price.priceType === "RETAIL") ?? null, wholesale: item.prices?.find((price) => price.priceType === "WHOLESALE") ?? null, minimum: item.prices?.find((price) => price.priceType === "MINIMUM") ?? null, special: item.prices?.find((price) => price.priceType === "SPECIAL") ?? null }; const status = item.effectiveStatus ?? getPriceEffectiveStatus(pricing.retail); return <tr key={item.productId} className="group cursor-pointer border-t border-slate-100 transition hover:bg-slate-50" onClick={() => setDetail(item)}><td className="px-4 py-3"><div className="flex min-w-[250px] items-center gap-3"><ProductThumb item={item} /><span className="min-w-0"><strong className="block truncate text-[11px] font-extrabold text-slate-900">{item.productName}</strong><span className={`mt-1 block font-mono text-[9px] ${muted}`}>{item.sku} · {item.familyName ?? "Sin familia"}</span></span></div></td><td className="px-3 py-3"><PriceCell price={pricing.retail} label="PEN / USD" accent="text-blue-600" /></td><td className="px-3 py-3"><PriceCell price={pricing.wholesale} label="Por volumen" accent="text-emerald-600" /></td><td className="px-3 py-3"><PriceCell price={pricing.minimum} label="Piso comercial" /></td><td className="px-3 py-3"><PriceCell price={pricing.special} label="Vigencia" accent="text-amber-600" /></td><td className="px-3 py-3"><span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-[9px] font-extrabold ${badge(status)}`}>{pricingStatusLabels[status]}</span></td><td className={`whitespace-nowrap px-3 py-3 text-[10px] font-semibold ${muted}`}>{dateTime(item.updatedAt)}</td><td className="px-2 py-3"><button type="button" onClick={(event) => { event.stopPropagation(); setDetail(item); }} className={iconButton("Abrir detalle")} aria-label={`Abrir detalle de ${item.productName}`}><MoreHorizontal className="h-4 w-4" aria-hidden="true" /></button></td></tr>; })}</tbody></table></div>{!items.length ? <div className="px-6 py-16 text-center"><PackageSearch className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" /><h3 className="mt-3 text-[13px] font-black text-slate-900">No encontramos precios con estos filtros</h3><p className={`mx-auto mt-1 max-w-sm text-[11px] font-semibold ${muted}`}>Prueba quitando un criterio o carga el primer precio de un producto.</p><button type="button" onClick={() => router.push("/admin/precios")} className="mt-4 text-[11px] font-extrabold text-blue-600">Limpiar filtros</button></div> : null}<div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3"><p className={`text-[10px] font-semibold ${muted}`}>Mostrando {items.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, totalItems)} de {totalItems.toLocaleString("es-PE")}</p><div className="flex items-center gap-1"><a aria-label="Página anterior" className={`${iconButton("Anterior")} ${page <= 1 ? "pointer-events-none opacity-30" : ""}`} href={`/admin/precios?${filterQuery(filters, { page: String(Math.max(1, page - 1)), pageSize: String(pageSize) })}`}><ChevronLeft className="h-4 w-4" aria-hidden="true" /></a><span className="px-2 text-[10px] font-extrabold text-slate-700">{page} / {totalPages}</span><a aria-label="Página siguiente" className={`${iconButton("Siguiente")} ${page >= totalPages ? "pointer-events-none opacity-30" : ""}`} href={`/admin/precios?${filterQuery(filters, { page: String(Math.min(totalPages, page + 1)), pageSize: String(pageSize) })}`}><ChevronRight className="h-4 w-4" aria-hidden="true" /></a></div></div></section><aside className="space-y-4"><section className={`${panel} p-4`}><div className="flex items-center justify-between"><div><h2 className="text-[13px] font-black text-slate-900">Cobertura comercial</h2><p className={`mt-1 text-[10px] font-semibold ${muted}`}>Precio minorista vigente</p></div><CircleDollarSign className="h-5 w-5 text-blue-600" aria-hidden="true" /></div><div className="mt-5 flex items-end justify-between"><strong className="text-[28px] font-black tracking-[-0.04em] text-slate-900">{coverage}%</strong><span className={`text-[10px] font-bold ${muted}`}>{retailPriced} / {totalProducts}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-50"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${Math.min(100, coverage)}%` }} /></div><p className={`mt-3 text-[10px] font-semibold ${muted}`}>{retailMissing ? `${retailMissing} productos todavía requieren un minorista.` : "Todos los productos tienen precio minorista vigente."}</p></section><section className={`${panel} p-4`}><div className="flex items-center justify-between"><h2 className="text-[13px] font-black text-slate-900">Control de vigencias</h2><CalendarClock className="h-5 w-5 text-amber-600" aria-hidden="true" /></div><div className="mt-3 space-y-2.5">{[["Cambios programados", metrics.scheduledPriceChanges ?? 0, "text-blue-600"], ["Vencen en 7 días", metrics.expiringSoon ?? 0, "text-rose-600"], ["Registros vigentes", metrics.activePrices, "text-emerald-600"], ["Historial disponible", historyCount, "text-slate-500"]].map(([label, value, tone]) => <div key={String(label)} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0"><span className={`text-[10px] font-semibold ${muted}`}>{label}</span><strong className={`text-[12px] font-black ${tone}`}>{Number(value).toLocaleString("es-PE")}</strong></div>)}</div></section><section className="rounded-2xl border border-slate-200 bg-blue-50 p-4"><div className="flex gap-3"><FileClock className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" /><div><h2 className="text-[12px] font-black text-slate-900">Reglas en un solo lugar</h2><p className={`mt-1 text-[10px] font-semibold leading-5 ${muted}`}>Los precios especiales no reemplazan al minorista. Cada registro conserva su vigencia y motivo.</p></div></div></section></aside></div> : null}
    {activeTab === "bulk" ? <BulkPricingWorkspace items={items} canEdit={canEditPrices} onSaved={(text) => { setMessage(text); router.refresh(); }} /> : null}
    {activeTab === "discounts" ? <section className={`${panel} p-5`}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-[14px] font-black text-slate-900">Reglas de descuento</h2><p className={`mt-1 text-[10px] font-semibold ${muted}`}>El máximo permitido siempre es mayor o igual al umbral de aprobación.</p></div><button type="button" onClick={() => canManageDiscounts && setDiscountEditor(null)} disabled={!canManageDiscounts} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-extrabold text-purple-600 disabled:cursor-not-allowed disabled:opacity-45"><Plus className="h-3.5 w-3.5" aria-hidden="true" />Nueva regla</button></div><div className="mt-4 grid gap-3 md:grid-cols-2">{rules.map((rule) => <button type="button" key={rule.id} onClick={() => canManageDiscounts && setDiscountEditor(rule)} className="w-full rounded-xl border border-slate-100 p-4 text-left transition hover:border-purple-200 hover:bg-slate-50"><div className="flex items-start justify-between gap-2"><div><h3 className="text-[12px] font-black text-slate-900">{rule.name}</h3><p className={`mt-1 text-[10px] font-semibold ${muted}`}>Hasta {rule.maxPercentage}% · aprobación desde {rule.approvalAbovePercentage}%</p></div><span className={`rounded-md border px-2 py-1 text-[9px] font-extrabold ${rule.status === "ACTIVE" ? badge("CURRENT") : badge("INACTIVE")}`}>{rule.status === "ACTIVE" ? "Activa" : "Inactiva"}</span></div></button>)}</div>{!rules.length ? <p className={`mt-6 text-center text-[11px] font-semibold ${muted}`}>No hay reglas de descuento configuradas.</p> : null}{!canManageDiscounts ? <p className={`mt-4 rounded-xl bg-slate-50 p-3 text-[10px] font-semibold ${muted}`}>Tu rol puede consultar las reglas, pero no administrarlas.</p> : null}</section> : null}
    {activeTab === "history" ? <section className={`${panel} overflow-hidden`}><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-[14px] font-black text-slate-900">Historial de cambios</h2><p className={`mt-1 text-[10px] font-semibold ${muted}`}>Registro inmutable con actor, motivo y variación.</p></div>{history.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-[9px] font-extrabold uppercase tracking-[0.08em] text-slate-400"><tr><th className="px-5 py-3">Fecha</th><th className="px-3 py-3">SKU / Producto</th><th className="px-3 py-3">Tipo</th><th className="px-3 py-3">Antes / después</th><th className="px-3 py-3">Motivo</th><th className="px-3 py-3">Actor</th></tr></thead><tbody>{history.map((entry) => <tr key={entry.id} className="border-t border-slate-100 text-[10px] font-semibold text-slate-500"><td className="whitespace-nowrap px-5 py-3">{dateTime(entry.createdAt)}</td><td className="px-3 py-3"><strong className="block text-slate-900">{entry.productName}</strong><span className="font-mono text-[9px]">{entry.sku}</span></td><td className="px-3 py-3">{pricingTypeLabels[entry.priceType as PricingPriceType] ?? entry.priceType}</td><td className="px-3 py-3">{entry.previousAmount ?? "—"} → <strong className="text-slate-900">{entry.newAmount}</strong> {entry.currency}</td><td className="max-w-[220px] px-3 py-3">{entry.reason ?? "—"}</td><td className="px-3 py-3">{entry.actorName ?? "Sistema"}</td></tr>)}</tbody></table></div> : <div className="px-6 py-16 text-center"><Clock3 className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" /><p className={`mt-3 text-[11px] font-semibold ${muted}`}>Todavía no hay cambios auditados.</p></div>}</section> : null}
    <AdminDrawer open={Boolean(detail)} onClose={() => setDetail(null)} title={detail ? `Detalle de ${detail.sku}` : "Detalle de precio"} footer={detail ? <div className="flex gap-2"><button type="button" onClick={() => { setEditor({ price: null, product: detail }); setDetail(null); }} disabled={!canEditPrices} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 text-[10px] font-extrabold text-white disabled:opacity-45"><Plus className="h-4 w-4" aria-hidden="true" />Nuevo precio</button><button type="button" onClick={() => setDetail(null)} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-[10px] font-extrabold text-slate-700">Cerrar</button></div> : null}>{detail ? <div className="space-y-5"><div className="flex items-center gap-3"><ProductThumb item={detail} size={56} /><div className="min-w-0"><h3 className="truncate text-[14px] font-black text-slate-900">{detail.productName}</h3><p className={`mt-1 font-mono text-[10px] ${muted}`}>{detail.sku} · {detail.categoryName ?? "Sin categoría"}</p></div></div><div className="grid grid-cols-2 gap-2">{([["Minorista", detail.pricing?.retail, "text-blue-600"], ["Mayorista", detail.pricing?.wholesale, "text-emerald-600"], ["Mínimo", detail.pricing?.minimum, "text-slate-500"], ["Especial", detail.pricing?.special, "text-amber-600"]] as const).map(([label, price, tone]) => <button type="button" key={label} onClick={() => price && canEditPrices && (setEditor({ price, product: detail }), setDetail(null))} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-left hover:border-blue-200"><span className={`text-[9px] font-extrabold uppercase tracking-[0.08em] ${tone}`}>{label}</span><strong className="mt-1 block text-[14px] font-black text-slate-900">{price ? formatPrice(price.amount, price.currency) : "—"}</strong><span className={`mt-1 block text-[9px] font-semibold ${muted}`}>{price ? (getPriceEffectiveStatus(price) === "CURRENT" ? "Vigente ahora" : pricingStatusLabels[getPriceEffectiveStatus(price)]) : "Sin registro"}</span></button>)}</div><div className="rounded-xl border border-slate-100 p-4"><div className="flex items-center justify-between"><h3 className="text-[11px] font-black text-slate-900">Rentabilidad</h3><CircleDollarSign className="h-4 w-4 text-emerald-600" aria-hidden="true" /></div>{canViewMargin && detailMargin ? <div className="mt-2 flex items-end justify-between gap-3"><strong className="text-[22px] font-black text-slate-900">{formatPrice(detailMargin.amount, detail.pricing?.retail?.currency)}</strong><span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-extrabold text-emerald-700">{detailMargin.percentage === null ? "N/D" : `${detailMargin.percentage.toFixed(1)}% margen`}</span></div> : <p className={`mt-2 text-[10px] font-semibold leading-5 ${muted}`}>{canViewMargin ? "No hay costo y minorista comparables en la misma moneda." : "Rentabilidad disponible para roles autorizados."}</p>}</div><div className="rounded-xl border border-slate-100 p-4"><div className="flex items-center justify-between"><h3 className="text-[11px] font-black text-slate-900">Vigencia minorista</h3><span className={`rounded-md border px-2 py-1 text-[9px] font-extrabold ${badge(detail.effectiveStatus)}`}>{pricingStatusLabels[detail.effectiveStatus ?? "MISSING"]}</span></div><p className={`mt-2 text-[10px] font-semibold leading-5 ${muted}`}>{detail.pricing?.retail ? formatValidity(detail.pricing.retail.validFrom, detail.pricing.retail.validUntil) : "Este producto no tiene un precio minorista vigente."}</p></div><div><h3 className="text-[11px] font-black text-slate-900">Acciones del registro</h3><div className="mt-2 flex flex-wrap gap-2">{detail.prices?.filter((price) => canEditPrices && price.active).slice(0, 4).map((price) => <button type="button" key={price.id} onClick={() => setArchiveTarget(price)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-2 text-[10px] font-extrabold text-rose-600 hover:bg-rose-50"><Archive className="h-3.5 w-3.5" aria-hidden="true" />Archivar {pricingTypeLabels[price.priceType]}</button>)}</div></div></div> : null}</AdminDrawer>
    <AdminDrawer open={Boolean(editor)} onClose={closeEditor} title={editor?.price ? "Editar precio" : "Nuevo precio"}>{editor ? <>{!editor.price && !editor.product ? <ProductSearch onSelect={setSelectedProduct} /> : null}{editor.price || selectedProduct ? <div className="mt-4"><PriceEditor initialPrice={editor.price} product={editor.product ?? selectedProduct} canManageCost={canManageCost} onSaved={afterSaved} /></div> : null}</> : null}</AdminDrawer>
    <PricingImportDialog open={importOpen} canEdit={canEditPrices} onClose={() => setImportOpen(false)} onSaved={afterImportSaved} />{discountEditor !== false ? <AdminDrawer open onClose={() => setDiscountEditor(false)} title={discountEditor ? "Editar regla" : "Nueva regla"}><DiscountEditor rule={discountEditor || null} onSaved={afterDiscountSaved} /></AdminDrawer> : null}{archiveTarget ? <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/35 p-4"><div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-[0_18px_50px_rgba(16,42,67,0.22)]"><div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Archive className="h-5 w-5" aria-hidden="true" /></span><div><h2 className="text-[14px] font-black text-slate-900">Archivar este precio</h2><p className={`mt-1 text-[11px] font-semibold leading-5 ${muted}`}>Se conserva el historial y deja de estar disponible para la operación.</p></div></div><label className="mt-5 block"><span className={`mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] ${muted}`}>Motivo obligatorio</span><textarea value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Ej. Reemplazo por lista comercial vigente…" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { setArchiveTarget(null); setArchiveReason(""); }} className="h-10 rounded-xl border border-slate-200 px-3 py-2.5 text-[10px] font-extrabold text-slate-700">Cancelar</button><button type="button" disabled={archiveBusy || archiveReason.trim().length < 3} onClick={() => void archive()} className="h-10 rounded-xl bg-rose-600 px-3 text-[10px] font-extrabold text-white disabled:opacity-45">{archiveBusy ? "Archivando…" : "Archivar"}</button></div></div></div> : null}</div>;
}
