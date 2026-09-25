"use client";

import { Check, LoaderCircle, Search, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatLimaDateTimeLocal, parseLimaDateTimeLocal } from "@/lib/lima-datetime";
import { formatMoney } from "@/lib/order-display";
import type { PromotionDraftPreview } from "@/lib/promotion-repository";

export type PromotionPickerOption = {
  id: string;
  label: string;
  secondary?: string | null;
};

export type PromotionDraft = {
  id?: string;
  name: string;
  description: string | null;
  type: "PERCENTAGE" | "AMOUNT" | "SPECIAL_PRICE";
  discountValue: string | number;
  startsAt: string;
  endsAt: string;
  status?: "DRAFT" | "ACTIVE" | "INACTIVE" | "EXPIRED";
  bannerAssetId?: string | null;
  productIds: string[];
  categoryIds: string[];
  priority: number;
  policy: "EXCLUSIVE" | "STACKABLE" | "BEST_VALUE";
};

type PromotionFormProps = {
  products: PromotionPickerOption[];
  categories: PromotionPickerOption[];
  initialPromotion?: PromotionDraft;
  editId?: string;
  approvalThreshold?: number | null;
  onClose?: () => void;
};

type FormState = {
  name: string;
  description: string;
  type: PromotionDraft["type"];
  discountValue: string;
  startsAt: string;
  endsAt: string;
  bannerAssetId: string;
  policy: PromotionDraft["policy"];
  priorityLevel: string;
};

const labels = {
  PERCENTAGE: "Porcentaje",
  AMOUNT: "Monto fijo",
  SPECIAL_PRICE: "Precio especial",
} as const;

const policies = {
  EXCLUSIVE: "Exclusiva",
  BEST_VALUE: "Mejor valor",
  STACKABLE: "Combinable",
} as const;

function localDateTime(daysFromNow: number, hour: number, minute = 0) {
  const value = new Date(Date.now() + daysFromNow * 86_400_000);
  const date = formatLimaDateTimeLocal(value).slice(0, 10);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date}T${pad(hour)}:${pad(minute)}`;
}

function priorityLevel(priority: number) {
  if (priority >= 5) return 1;
  if (priority >= 4) return 2;
  if (priority >= 3) return 3;
  if (priority >= 2) return 4;
  return 5;
}

function zonedDateTime(value: string) {
  return value ? `${value}:00-05:00` : value;
}

function dateTimeInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? value : formatLimaDateTimeLocal(value);
}

function dateTimeDisplay(value: string) {
  const date = parseLimaDateTimeLocal(value);
  if (Number.isNaN(date.getTime())) return "Fecha no válida";
  const parts = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.day} ${(values.month ?? "").replaceAll(".", "")} ${values.year} · ${values.hour}:${values.minute}`;
}

function formCountLabel(count: number, singular: string, plural: string) {
  return `${count.toLocaleString("es-PE")} ${count === 1 ? singular : plural}`;
}

function previewBenefitLabel(type: PromotionDraft["type"], value: string) {
  if (type === "PERCENTAGE") return `−${Number(value).toLocaleString("es-PE", { maximumFractionDigits: 2 })} %`;
  if (type === "AMOUNT") return `−${formatMoney(value, "PEN")}`;
  return "Precio especial";
}

function initialState(promotion?: PromotionDraft): FormState {
  return {
    name: promotion?.name ?? "",
    description: promotion?.description ?? "",
    type: promotion?.type ?? "PERCENTAGE",
    discountValue: String(promotion?.discountValue ?? "15.00"),
    startsAt: dateTimeInput(promotion?.startsAt ?? localDateTime(0, 0)),
    endsAt: dateTimeInput(promotion?.endsAt ?? localDateTime(21, 23, 59)),
    bannerAssetId: promotion?.bannerAssetId ?? "",
    policy: promotion?.policy ?? "EXCLUSIVE",
    priorityLevel: String(priorityLevel(promotion?.priority ?? 3)),
  };
}

function readApiError(response: Response) {
  return response.json().then((payload: unknown) => {
    if (!payload || typeof payload !== "object") return "No se pudo completar la acción.";
    const error = (payload as { error?: { message?: string } | string }).error;
    return typeof error === "string" ? error : error?.message ?? "No se pudo completar la acción.";
  }).catch(() => "No se pudo completar la acción.");
}

function OptionPicker({ label, placeholder, options, selected, onChange }: { label: string; placeholder: string; options: PromotionPickerOption[]; selected: string[]; onChange: (next: string[]) => void }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const pattern = query.trim().toLocaleLowerCase("es");
    return options.filter((option) => !pattern || `${option.label} ${option.secondary ?? ""}`.toLocaleLowerCase("es").includes(pattern)).slice(0, 8);
  }, [options, query]);
  const selectedOptions = selected.map((id) => options.find((option) => option.id === id) ?? { id, label: id });
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((entry) => entry !== id) : [...selected, id]);

  return (
    <div className="grid gap-2">
      <span className="text-[10px] font-bold text-slate-500">{label}</span>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
      </label>
      <div className="flex min-h-6 flex-wrap gap-1.5" aria-live="polite">
        {selectedOptions.length ? selectedOptions.map((option) => <button key={option.id} type="button" onClick={() => toggle(option.id)} className="inline-flex max-w-full items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700" aria-label={`Quitar ${option.label}`}><span className="truncate">{option.secondary ? `${option.secondary} · ${option.label}` : option.label}</span><X className="h-3 w-3 shrink-0" aria-hidden="true" /></button>) : <span className="text-[10px] text-slate-400">Sin asociaciones seleccionadas.</span>}
      </div>
      {query.trim() ? <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm" aria-label={`Opciones de ${label}`}>
        {visible.length ? visible.map((option) => <button key={option.id} type="button" onClick={() => toggle(option.id)} className={`flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-[10px] hover:bg-slate-50 ${selected.includes(option.id) ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}><span className="min-w-0 truncate">{option.label}</span><span className="shrink-0 text-[9px] text-slate-400">{selected.includes(option.id) ? "Seleccionado" : option.secondary ?? "Agregar"}</span></button>) : <p className="px-2 py-2 text-[10px] text-slate-500">No hay coincidencias.</p>}
      </div> : null}
    </div>
  );
}

function SectionHeading({ number, title, note }: { number: string; title: string; note?: string }) {
  return <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-bold text-blue-600">{number}</span><h3 className="text-sm font-bold text-slate-900">{title}</h3></div>{note ? <span className="text-[10px] text-slate-400">{note}</span> : null}</div>;
}

function LimaDateTimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-[10px] font-bold text-slate-500">{label}<span className="relative block h-9 rounded-lg border border-slate-200 bg-white transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100"><span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[11px] font-semibold text-slate-800">{dateTimeDisplay(value)}</span><input type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} required aria-label={label} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" /></span></label>;
}

export function PromotionForm({ products, categories, initialPromotion, editId, approvalThreshold, onClose }: PromotionFormProps) {
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<FormState>(() => initialState(initialPromotion));
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(initialPromotion?.productIds ?? []);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(initialPromotion?.categoryIds ?? []);
  const [previewState, setPreview] = useState<PromotionDraftPreview | null>(null);
  const [previewErrorState, setPreviewError] = useState<string | null>(null);
  const [previewLoadingState, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !saving) onClose?.(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  const hasScope = selectedProductIds.length > 0 || selectedCategoryIds.length > 0;
  const parsedValue = Number(state.discountValue);
  const dateRangeValid = Boolean(state.startsAt && state.endsAt && new Date(zonedDateTime(state.endsAt)).getTime() > new Date(zonedDateTime(state.startsAt)).getTime());
  const isCommercialValueValid = Number.isFinite(parsedValue) && parsedValue > 0;
  const priority = Math.max(1, Math.min(5, Number(state.priorityLevel) || 3));
  const needsApproval = state.type === "PERCENTAGE" && approvalThreshold !== null && approvalThreshold !== undefined && parsedValue > approvalThreshold;
  const previewReady = Boolean(state.name && isCommercialValueValid && dateRangeValid && hasScope);
  const preview = previewReady ? previewState : null;
  const previewError = previewReady ? previewErrorState : null;
  const previewLoading = previewReady ? previewLoadingState : false;
  const previewPayload = useMemo(() => ({
    name: state.name || "Previsualización de promoción",
    description: state.description,
    type: state.type,
    discountValue: state.discountValue,
    startsAt: zonedDateTime(state.startsAt),
    endsAt: zonedDateTime(state.endsAt),
    status: "DRAFT",
    bannerAssetId: state.bannerAssetId || null,
    productIds: selectedProductIds,
    categoryIds: selectedCategoryIds,
    priority: 6 - priority,
    policy: state.policy,
  }), [selectedCategoryIds, selectedProductIds, state, priority]);

  useEffect(() => {
    if (!previewReady) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const response = await fetch("/api/admin/promociones/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(previewPayload), signal: controller.signal });
        if (!response.ok) throw new Error(await readApiError(response));
        const payload = await response.json() as PromotionDraftPreview | { data?: PromotionDraftPreview };
        const nextPreview = Object.prototype.hasOwnProperty.call(payload, "data") ? (payload as { data?: PromotionDraftPreview }).data ?? null : payload as PromotionDraftPreview;
        setPreview(nextPreview);
      } catch (reason) {
        if (!controller.signal.aborted) {
          setPreview(null);
          setPreviewError(reason instanceof Error ? reason.message : "No se pudo calcular la previsualización.");
        }
      } finally {
        if (!controller.signal.aborted) setPreviewLoading(false);
      }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [dateRangeValid, hasScope, isCommercialValueValid, previewPayload, previewReady, state.name]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(null);
    if (!state.name.trim()) return setError("Escribe un nombre de campaña.");
    if (!isCommercialValueValid) return setError("El beneficio debe tener un valor válido mayor que cero.");
    if (!dateRangeValid) return setError("La fecha final debe ser posterior a la fecha inicial.");
    if (!hasScope) return setError("Define al menos un producto o una categoría antes de guardar.");
    setSaving(true);
    try {
      const payload = { ...previewPayload, name: state.name.trim(), description: state.description.trim() || null };
      const response = await fetch(editId ? `/api/admin/promociones/${encodeURIComponent(editId)}` : "/api/admin/promociones", { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(await readApiError(response));
      router.refresh();
      onClose?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar la promoción.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-stretch justify-end bg-slate-950/30" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="promotion-form-title" className="flex h-full w-full max-w-[720px] flex-col overflow-hidden bg-white shadow-[-18px_0_38px_rgba(15,23,42,.13)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-7 pb-4 pt-6">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Comercial / Promociones</p><h2 id="promotion-form-title" className="mt-1 text-[24px] font-bold leading-none tracking-[-0.035em] text-slate-900">{editId ? "Editar promoción" : "Nueva promoción"}</h2><p className="mt-2 max-w-[520px] text-[10px] leading-4 text-slate-500">Define el beneficio, su alcance y las reglas antes de publicar.</p></div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar formulario" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"><X className="h-4 w-4" aria-hidden="true" /></button>
        </header>

        <form onSubmit={submit} className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-0 px-7 py-5 lg:grid-cols-[minmax(0,1fr)_214px] lg:gap-5">
            <div className="min-w-0 divide-y divide-slate-200">
              <section className="pb-5"><SectionHeading number="1" title="Beneficio" /><div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px]"><label className="grid gap-1 text-[10px] font-bold text-slate-500">Nombre de campaña<input value={state.name} onChange={(event) => update("name", event.target.value)} maxLength={180} required className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Precio especial capacitores 35 µF" /></label><label className="grid gap-1 text-[10px] font-bold text-slate-500">Valor<input value={state.discountValue} onChange={(event) => update("discountValue", event.target.value)} inputMode="decimal" type="number" min="0.01" step="0.01" required className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label></div><fieldset className="mt-3"><legend className="mb-1 text-[10px] font-bold text-slate-500">Tipo de beneficio</legend><div className="grid grid-cols-3 gap-1.5">{(Object.keys(labels) as Array<PromotionDraft["type"]>).map((type) => <label key={type} className={`flex h-9 cursor-pointer items-center justify-center rounded-lg border text-[10px] font-bold transition ${state.type === type ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}><input type="radio" name="promotion-type" value={type} checked={state.type === type} onChange={() => update("type", type)} className="sr-only" />{labels[type]}</label>)}</div></fieldset></section>

              <section className="py-5"><SectionHeading number="2" title="Alcance" note={formCountLabel(selectedProductIds.length + selectedCategoryIds.length, "asociación", "asociaciones")} /><div className="mt-4 grid gap-4"><OptionPicker label="Productos explícitos" placeholder="Buscar producto por SKU o nombre…" options={products} selected={selectedProductIds} onChange={setSelectedProductIds} /><OptionPicker label="Categorías explícitas" placeholder="Buscar categoría…" options={categories} selected={selectedCategoryIds} onChange={setSelectedCategoryIds} /></div>{hasScope ? <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[10px] leading-4 text-emerald-800"><Check className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />Alcance definido. La promoción no se aplicará fuera de los productos y categorías seleccionados.</p> : <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-800"><TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />Selecciona productos o categorías. Sin alcance, la promoción podría aplicarse a todo el catálogo.</p>}</section>

              <section className="py-5"><SectionHeading number="3" title="Vigencia y reglas" /><div className="mt-4 grid gap-3 sm:grid-cols-2"><LimaDateTimeField label="Inicio · hora de Lima" value={state.startsAt} onChange={(value) => update("startsAt", value)} /><LimaDateTimeField label="Fin · hora de Lima" value={state.endsAt} onChange={(value) => update("endsAt", value)} /><label className="grid gap-1 text-[10px] font-bold text-slate-500">Prioridad 1–5 (1 gana)<select value={state.priorityLevel} onChange={(event) => update("priorityLevel", event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">{[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>Prioridad {level}{level === 1 ? " · máxima" : ""}</option>)}</select><span className="text-[9px] font-normal text-slate-400">Se traduce a la prioridad interna vigente; la prioridad 1 gana.</span></label><label className="grid gap-1 text-[10px] font-bold text-slate-500">Política<select value={state.policy} onChange={(event) => update("policy", event.target.value as PromotionDraft["policy"])} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">{(Object.keys(policies) as Array<PromotionDraft["policy"]>).map((policy) => <option key={policy} value={policy}>{policies[policy]}</option>)}</select></label></div><label className="mt-3 grid gap-1 text-[10px] font-bold text-slate-500">Banner opcional<input value={state.bannerAssetId} onChange={(event) => update("bannerAssetId", event.target.value)} placeholder="Sin banner · usar imagen de media" className="h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label><label className="mt-3 grid gap-1 text-[10px] font-bold text-slate-500">Descripción interna<textarea value={state.description} onChange={(event) => update("description", event.target.value)} maxLength={1000} rows={2} placeholder="Qué problema comercial resuelve esta campaña…" className="resize-none rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label><div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"><div><p className="text-[10px] font-bold text-slate-700">Requiere aprobación</p><p className="text-[9px] text-slate-400">Se activa después de la aprobación autorizada.</p></div><span className={`relative inline-flex h-5 w-9 rounded-full ${needsApproval ? "bg-orange-500" : "bg-blue-600"}`} aria-label={needsApproval ? "Requiere aprobación" : "No requiere aprobación"}><span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm" /></span></div></section>

              <section className="border-t border-slate-200 pt-5"><div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3"><div className="flex items-center gap-2 text-[10px] font-bold text-blue-800"><Check className="h-3.5 w-3.5" aria-hidden="true" />Antes de crear</div><div className="mt-2 grid grid-cols-3 divide-x divide-blue-200 text-[9px] text-slate-500"><span className="pr-2">Precio base intacto</span><span className="px-2">Hora de Lima</span><span className="pl-2">Auditoría incluida</span></div></div>{error ? <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] leading-4 text-rose-800">{error}</p> : null}</section>
            </div>

            <aside className="mt-6 border-t border-slate-200 pt-5 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0"><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Vista previa en vivo</p><div className="mt-2 overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-br from-slate-900 via-blue-700 to-violet-500 p-3 text-white"><p className="text-[10px] font-bold">Así se verá en la tienda</p>{preview?.product ? <div className="mt-5 rounded-lg bg-white p-3 text-slate-800 shadow-sm"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><span className="text-lg">▣</span></div><p className="mt-3 line-clamp-2 text-[10px] font-bold" title={preview.product.name}>{preview.product.name}</p><p className="mt-1 font-mono text-[8px] text-slate-400">{preview.product.sku}</p><div className="mt-3 flex items-baseline gap-2"><span className="text-[10px] text-slate-400 line-through">{formatMoney(preview.product.baseUnitPrice, preview.product.currency)}</span><span className="text-[16px] font-bold">{formatMoney(preview.product.finalUnitPrice, preview.product.currency)}</span></div><span className="mt-2 inline-flex rounded-md bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700">{previewBenefitLabel(state.type, state.discountValue)}</span></div> : <div className="mt-5 rounded-lg border border-dashed border-white/40 p-4 text-[10px] leading-4 text-blue-50">Completa el nombre, valor, fechas y alcance para calcular el precio real.</div>}</div><div className="mt-4"><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900">Validaciones</h3>{previewLoading ? <LoaderCircle className="h-4 w-4 animate-spin text-blue-600" aria-label="Calculando" /> : null}</div><div className="mt-2 grid gap-2 text-[10px]"><ValidationRow ok={dateRangeValid} text={dateRangeValid ? "Fechas coherentes" : "Revisa el rango de fechas"} /><ValidationRow ok={hasScope} text={hasScope ? "Alcance definido" : "Falta definir alcance"} /><ValidationRow ok={!preview?.conflicts.length} text={preview?.conflicts.length ? `${formCountLabel(preview.conflicts.length, "conflicto", "conflictos")} detectado${preview.conflicts.length === 1 ? "" : "s"}` : "Sin conflictos en el alcance"} warning={Boolean(preview?.conflicts.length)} />{needsApproval ? <ValidationRow ok={false} warning text={`Requiere aprobación sobre ${approvalThreshold}%`} /> : <ValidationRow ok text="Aprobación no requerida por porcentaje" />}</div>{previewError ? <p role="alert" className="mt-2 text-[10px] leading-4 text-rose-700">{previewError}</p> : null}</div><div className="mt-5 border-t border-slate-200 pt-4"><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900">Impacto estimado</h3><span className="text-[9px] text-slate-400">precio real</span></div>{preview ? <dl className="mt-2 grid gap-2 text-[10px]"><Metric label="Productos afectados" value={formCountLabel(preview.impact.affectedProducts, "producto", "productos")} /><Metric label="Con precio vigente" value={formCountLabel(preview.impact.pricedProducts, "producto", "productos")} /><Metric label="Ahorro promedio" value={`${preview.impact.averageDiscountPercentage}% · ${formatMoney(preview.impact.averageDiscountAmount, "PEN")}`} /><Metric label="Ahorro total estimado" value={formatMoney(preview.impact.totalDiscountAmount, "PEN")} /></dl> : <p className="mt-2 text-[10px] leading-4 text-slate-500">Se mostrará el número de productos, cobertura de precio y ahorro estimado.</p>}{preview?.conflicts.length ? <div className="mt-2 grid gap-1.5 border-t border-rose-100 pt-2">{preview.conflicts.map((conflict) => <Link key={conflict.promotionId} href={conflict.href} className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 underline"><TriangleAlert className="h-3 w-3" aria-hidden="true" />Ver campaña en choque: {conflict.promotionName} ({formCountLabel(conflict.affectedProductCount, "producto", "productos")})</Link>)}</div> : null}</div></aside>
          </div>
          <div className="sticky bottom-0 flex shrink-0 flex-nowrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-3 py-3 sm:px-7"><p className="hidden text-[10px] text-slate-500 sm:block">Los cambios quedan auditados y el precio base no se modifica.</p><div className="ml-auto flex min-w-0 flex-1 flex-nowrap gap-2 sm:flex-none"><button type="button" onClick={onClose} disabled={saving} className="h-9 min-w-0 flex-1 whitespace-nowrap rounded-lg border border-slate-200 px-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:min-w-[92px] sm:flex-none sm:px-4 sm:text-xs">Cancelar</button><button type="submit" name="intent" value="draft" disabled={saving} className="h-9 min-w-0 flex-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:min-w-[128px] sm:flex-none sm:px-4 sm:text-xs">Guardar borrador</button><button type="submit" name="intent" value="create" disabled={saving} className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-blue-600 px-2 text-[10px] font-bold text-white shadow-[0_3px_7px_rgba(37,99,235,.16)] hover:bg-blue-700 disabled:opacity-50 sm:min-w-[142px] sm:flex-none sm:gap-2 sm:px-4 sm:text-xs">{saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}{editId ? "Guardar cambios" : "Crear promoción"}</button></div></div>
        </form>
      </section>
    </div>
  );
}

function ValidationRow({ ok, warning = false, text }: { ok: boolean; warning?: boolean; text: string }) {
  return <p className={`flex items-start gap-1.5 ${warning ? "text-orange-700" : ok ? "text-emerald-700" : "text-rose-700"}`}>{warning ? <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" /> : <Check className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />}{text}</p>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="text-right font-bold text-slate-700">{value}</dd></div>;
}
