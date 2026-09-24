"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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

function zonedDateTime(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return value;
  return value.endsWith(":00") ? `${value}-05:00` : `${value}:00-05:00`;
}

function Picker({
  label,
  searchLabel,
  options,
  selected,
  onChange,
}: {
  label: string;
  searchLabel: string;
  options: PromotionPickerOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const pattern = query.trim().toLocaleLowerCase("es");
    return options
      .filter((option) => !pattern || `${option.label} ${option.secondary ?? ""}`.toLocaleLowerCase("es").includes(pattern))
      .slice(0, 40);
  }, [options, query]);
  const selectedOptions = selected.map((id) => options.find((option) => option.id === id) ?? { id, label: id });
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);

  return (
    <fieldset className="grid gap-2 rounded-md border border-border bg-background p-3">
      <legend className="px-1 text-xs font-extrabold text-dark">{label}</legend>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchLabel}
        aria-label={searchLabel}
        className="h-9 rounded-md border border-border bg-white px-3 text-sm"
      />
      <div className="flex min-h-7 flex-wrap gap-1.5" aria-live="polite">
        {selectedOptions.length ? selectedOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => toggle(option.id)}
            className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700"
            aria-label={`Quitar ${option.label}`}
          >
            {option.label} ×
          </button>
        )) : <span className="text-xs text-gray-text">Sin asociaciones seleccionadas.</span>}
      </div>
      <div className="max-h-36 overflow-y-auto rounded-md border border-border bg-white p-1" aria-label={`Opciones de ${label}`}>
        {visible.length ? visible.map((option) => (
          <label key={option.id} className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-xs hover:bg-background">
            <input type="checkbox" checked={selected.includes(option.id)} onChange={() => toggle(option.id)} className="mt-0.5" />
            <span className="min-w-0">
              <span className="block truncate font-bold text-dark">{option.label}</span>
              {option.secondary ? <span className="block truncate text-gray-text">{option.secondary}</span> : null}
            </span>
          </label>
        )) : <p className="p-2 text-xs text-gray-text">No hay coincidencias.</p>}
      </div>
      <input type="hidden" name={label === "Productos" ? "productIds" : "categoryIds"} value={selected.join(",")} />
    </fieldset>
  );
}

export function PromotionForm({
  products = [],
  categories = [],
  initialPromotion,
  editId,
}: {
  products?: PromotionPickerOption[];
  categories?: PromotionPickerOption[];
  initialPromotion?: PromotionDraft;
  editId?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState(initialPromotion?.productIds ?? []);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(initialPromotion?.categoryIds ?? []);
  const isEditing = Boolean(editId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    const data = {
      ...raw,
      status: raw.status || "DRAFT",
      productIds: selectedProductIds,
      categoryIds: selectedCategoryIds,
      startsAt: zonedDateTime(raw.startsAt),
      endsAt: zonedDateTime(raw.endsAt),
    };
    try {
      const response = await fetch(isEditing ? `/api/admin/promociones/${encodeURIComponent(editId!)}` : "/api/admin/promociones", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json() as { error?: { message?: string } | string };
      const errorMessage = typeof result.error === "string" ? result.error : result.error?.message;
      if (!response.ok) throw new Error(errorMessage || (isEditing ? "No se pudo actualizar." : "No se pudo guardar."));
      if (isEditing) {
        router.push("/admin/promociones");
      } else {
        setMessage("Promoción guardada y auditada.");
        form.reset();
        setSelectedProductIds([]);
        setSelectedCategoryIds([]);
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la promoción.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-6 grid gap-3 rounded-md border border-border bg-white p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">Promociones</p>
        <h2 className="mt-1 font-display text-2xl font-black text-dark">{isEditing ? "Editar promoción" : "Crear promoción gobernada"}</h2>
        <p className="mt-2 text-sm text-gray-text">Asocia registros existentes con búsqueda. La campaña queda auditada y separada del precio base.</p>
      </div>
      <input required name="name" defaultValue={initialPromotion?.name} placeholder="Nombre" className="h-10 rounded-md border border-border px-3 text-sm" />
      <select name="type" defaultValue={initialPromotion?.type ?? "PERCENTAGE"} className="h-10 rounded-md border border-border px-3 text-sm"><option value="PERCENTAGE">Porcentaje</option><option value="AMOUNT">Monto</option><option value="SPECIAL_PRICE">Precio especial</option></select>
      <input required type="number" min="0" step="0.01" name="discountValue" defaultValue={initialPromotion?.discountValue} placeholder="Valor" className="h-10 rounded-md border border-border px-3 text-sm" />
      <input name="description" defaultValue={initialPromotion?.description ?? ""} placeholder="Descripción" className="h-10 rounded-md border border-border px-3 text-sm" />
      <label className="grid gap-1 text-xs font-bold text-gray-text">Inicio (Lima)<input required type="datetime-local" name="startsAt" defaultValue={initialPromotion?.startsAt} className="h-10 rounded-md border border-border px-3 text-sm text-dark" /></label>
      <label className="grid gap-1 text-xs font-bold text-gray-text">Fin (Lima)<input required type="datetime-local" name="endsAt" defaultValue={initialPromotion?.endsAt} className="h-10 rounded-md border border-border px-3 text-sm text-dark" /></label>
      <label className="grid gap-1 text-xs font-bold text-gray-text">Prioridad<input type="number" min="0" max="10000" step="1" name="priority" defaultValue={initialPromotion?.priority ?? 0} className="h-10 rounded-md border border-border px-3 text-sm text-dark" /></label>
      <label className="grid gap-1 text-xs font-bold text-gray-text">Política<select name="policy" defaultValue={initialPromotion?.policy ?? "EXCLUSIVE"} className="h-10 rounded-md border border-border px-3 text-sm text-dark"><option value="EXCLUSIVE">Exclusiva</option><option value="BEST_VALUE">Mejor valor</option><option value="STACKABLE">Combinable</option></select></label>
      <input name="bannerAssetId" defaultValue={initialPromotion?.bannerAssetId ?? ""} placeholder="ID de banner en media (opcional)" className="h-10 rounded-md border border-border px-3 text-sm sm:col-span-2" />
      <Picker label="Productos" searchLabel="Buscar por nombre o SKU" options={products} selected={selectedProductIds} onChange={setSelectedProductIds} />
      <Picker label="Categorías" searchLabel="Buscar categoría" options={categories} selected={selectedCategoryIds} onChange={setSelectedCategoryIds} />
      <input type="hidden" name="status" value={initialPromotion?.status ?? "DRAFT"} />
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={busy} className="rounded-pill bg-dark px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{isEditing ? "Guardar cambios" : "Crear promoción"}</button>
        {isEditing ? <a href="/admin/promociones" className="rounded-pill border border-border px-4 py-2 text-sm font-bold text-dark">Cancelar</a> : null}
        {message ? <p role="status" className="text-sm font-bold text-gray-text">{message}</p> : null}
      </div>
    </form>
  );
}
