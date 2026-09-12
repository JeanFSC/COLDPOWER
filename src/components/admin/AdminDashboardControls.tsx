"use client";

import { Badge, CalendarDays, Check, ChevronDown, CircleDollarSign, ClipboardList, Filter, Layers3, LoaderCircle, MapPin, Package, Store, Tag, UserRound, UsersRound, X, type LucideIcon } from "lucide-react";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { dashboardFiltersToQuery, type DashboardFilters, type DashboardGranularity, type DashboardRange } from "@/lib/dashboard-contract";
import { AdminDrawer } from "@/components/admin/AdminDrawer";

export type DashboardFilterOptions = {
  locations: Array<{ id: string; name: string }>;
  sellers: Array<{ id: string; name: string | null; email: string }>;
  customers: Array<{ id: string; name: string; email: string | null }>;
  products: Array<{ id: string; name: string | null; sku: string }>;
  categories: Array<{ id: string; name: string }>;
  families: Array<{ id: string; name: string; categoryId: string | null }>;
  brands: Array<{ id: string; name: string }>;
};

const rangeOptions: Array<{ value: DashboardRange; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "week", label: "Últimos 7 días" },
  { value: "month", label: "Últimos 30 días" },
  { value: "current_month", label: "Mes actual" },
  { value: "previous_month", label: "Mes anterior" },
  { value: "year", label: "Año actual" },
  { value: "custom", label: "Personalizado" },
];

const channelOptions = [
  ["WEB", "Web"],
  ["WHATSAPP", "WhatsApp"],
  ["TELEFONO", "Teléfono"],
  ["LOCAL", "Local"],
  ["REFERIDO", "Referido"],
  ["CLIENTE_RECURRENTE", "Cliente recurrente"],
  ["OTRO", "Otro"],
] as const;

const orderStatusOptions = [
  ["NEW", "Nuevo"],
  ["RECEIVED", "Recibido"],
  ["PAYMENT_PENDING", "Pago pendiente"],
  ["PAID", "Pagado"],
  ["PREPARING", "Preparando"],
  ["READY", "Listo"],
  ["READY_FOR_PICKUP", "Listo para recoger"],
  ["IN_TRANSIT", "En tránsito"],
  ["SHIPPED", "Enviado"],
  ["DELIVERED", "Entregado"],
  ["CANCELLED", "Cancelado"],
] as const;

const filterKeys = ["locationId", "sellerId", "customerId", "productId", "categoryId", "familyId", "brandId", "channel", "orderStatus", "currency"] as const;
type FilterKey = (typeof filterKeys)[number];

function HeaderSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  icon: Icon,
  buttonClassName,
  panelClassName,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  ariaLabel: string;
  icon?: LucideIcon;
  buttonClassName: string;
  panelClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        className={buttonClassName}
      >
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-[#526b84]" aria-hidden="true" /> : null}
        <span className="min-w-0 flex-1 truncate text-left">{selected?.label ?? ""}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#526b84] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} aria-label="Cerrar opciones" />
          <div role="listbox" aria-label={ariaLabel} className={`absolute z-20 mt-1.5 max-h-72 overflow-y-auto rounded-lg border border-[#dce6ee] bg-white p-1 shadow-[0_12px_28px_rgba(16,42,67,0.14)] ${panelClassName}`}>
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-[11px] font-bold whitespace-nowrap ${isSelected ? "bg-[#eaf2fe] text-[#2277ee]" : "text-[#40607c] hover:bg-[#f4f8fb]"}`}
                >
                  {option.label}
                  {isSelected ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

function filterValueMap(filters: DashboardFilters): Record<FilterKey, string> {
  return Object.fromEntries(filterKeys.map((key) => [key, filters[key] ?? ""])) as Record<FilterKey, string>;
}

function optional(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

function labelFor(
  key: FilterKey,
  value: string,
  options: DashboardFilterOptions,
) {
  if (key === "locationId") return options.locations.find((item) => item.id === value)?.name ?? value;
  if (key === "sellerId") {
    const item = options.sellers.find((candidate) => candidate.id === value);
    return item?.name || item?.email || value;
  }
  if (key === "customerId") return options.customers.find((item) => item.id === value)?.name ?? value;
  if (key === "productId") {
    const item = options.products.find((candidate) => candidate.id === value);
    return item ? `${item.sku} · ${item.name ?? "Producto"}` : value;
  }
  if (key === "categoryId") return options.categories.find((item) => item.id === value)?.name ?? value;
  if (key === "familyId") return options.families.find((item) => item.id === value)?.name ?? value;
  if (key === "brandId") return options.brands.find((item) => item.id === value)?.name ?? value;
  if (key === "channel") return channelOptions.find(([code]) => code === value)?.[1] ?? value;
  if (key === "orderStatus") return orderStatusOptions.find(([code]) => code === value)?.[1] ?? value;
  return value;
}

export function AdminDashboardControls({
  filters,
  availableCurrencies,
  options,
}: {
  filters: DashboardFilters;
  availableCurrencies: string[];
  options: DashboardFilterOptions;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formValues, setFormValues] = useState<Record<FilterKey, string>>(() => filterValueMap(filters));
  const [formRange, setFormRange] = useState<DashboardRange>(filters.range ?? "month");
  const [error, setError] = useState("");

  const familyOptions = useMemo(
    () => options.families.filter((item) => !formValues.categoryId || item.categoryId === formValues.categoryId),
    [formValues.categoryId, options.families],
  );

  const advancedFilterCount = filterKeys.reduce((total, key) => total + (filters[key] ? 1 : 0), 0);
  const activeFilters = filterKeys.flatMap((key) => {
    const value = filters[key];
    return value ? [{ key, value, label: labelFor(key, value, options) }] : [];
  });

  function navigate(nextFilters: DashboardFilters) {
    const query = dashboardFiltersToQuery(nextFilters).toString();
    startTransition(() => router.push(`/admin/dashboard${query ? `?${query}` : ""}`, { scroll: false }));
  }

  function changeRange(value: DashboardRange) {
    if (value === "custom") {
      setFormValues(filterValueMap(filters));
      setFormRange("custom");
      setError("");
      setOpen(true);
      return;
    }
    navigate({ ...filters, range: value, from: undefined, to: undefined });
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const next: DashboardFilters = {
      ...filters,
      range: formRange,
      locationId: optional(values.get("locationId")),
      sellerId: optional(values.get("sellerId")),
      customerId: optional(values.get("customerId")),
      productId: optional(values.get("productId")),
      categoryId: optional(values.get("categoryId")),
      familyId: optional(values.get("familyId")),
      brandId: optional(values.get("brandId")),
      channel: optional(values.get("channel")),
      orderStatus: optional(values.get("orderStatus")),
      currency: optional(values.get("currency")),
    };
    if (next.range === "custom") {
      next.from = optional(values.get("from"));
      next.to = optional(values.get("to"));
      if (!next.from || !next.to) {
        setError("Indica una fecha de inicio y una fecha de fin.");
        return;
      }
      if (next.from > next.to) {
        setError("La fecha de inicio no puede ser posterior a la fecha de fin.");
        return;
      }
    } else {
      next.from = undefined;
      next.to = undefined;
    }
    setError("");
    setOpen(false);
    navigate(next);
  }

  function removeFilter(key: FilterKey) {
    navigate({ ...filters, [key]: undefined });
  }

  function openFilters() {
    setFormValues(filterValueMap(filters));
    setFormRange(filters.range ?? "month");
    setError("");
    setOpen(true);
  }

  function setFormValue(key: FilterKey, value: string) {
    setFormValues((current) => ({ ...current, [key]: value }));
  }

  function clearDraftFilters() {
    setFormValues(filterValueMap({}));
    setFormRange(filters.range ?? "month");
    setError("");
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <HeaderSelect
          ariaLabel="Período del dashboard"
          icon={CalendarDays}
          value={open ? formRange : filters.range ?? "month"}
          onChange={(value) => changeRange(value)}
          options={rangeOptions}
          buttonClassName="inline-flex h-10 w-[196px] items-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3 text-[12px] font-extrabold text-[#304b66] shadow-[0_1px_2px_rgba(16,42,67,0.02)] outline-none transition hover:border-[#b9d2eb] focus-visible:border-[#2277ee] focus-visible:ring-2 focus-visible:ring-[#2277ee]/15"
          panelClassName="left-0 min-w-[196px]"
        />
        <button type="button" onClick={openFilters} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3.5 text-[11px] font-extrabold text-[#304b66] transition hover:border-[#2277ee] hover:text-[#2277ee]" aria-haspopup="dialog">
          <Filter className="h-4 w-4" aria-hidden="true" />
          Aplicar filtros
          {advancedFilterCount ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e8f1ff] px-1.5 text-[10px] text-[#2277ee]">{advancedFilterCount}</span> : null}
        </button>
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin text-[#2277ee]" aria-label="Actualizando dashboard" /> : null}
      </div>
      {activeFilters.length ? (
        <div className="flex flex-wrap items-center justify-end gap-1.5" aria-label="Filtros activos">
          {activeFilters.map((item) => <button key={item.key} type="button" onClick={() => removeFilter(item.key)} className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#cfe0f1] bg-[#f3f8fd] px-2.5 py-1 text-[10px] font-bold text-[#40607c] hover:border-[#2277ee] hover:text-[#2277ee]">{item.label}<X className="h-3 w-3 shrink-0" aria-hidden="true" /></button>)}
        </div>
      ) : null}
      <AdminDrawer
        open={open}
        onClose={() => setOpen(false)}
        title="Filtros del dashboard"
        footer={
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
            <button type="button" onClick={clearDraftFilters} className="inline-flex h-11 items-center justify-center rounded-xl border border-[#cfe0f1] bg-white px-4 text-[11px] font-extrabold text-[#2277ee] transition hover:bg-[#f3f8fd]" disabled={!advancedFilterCount}>
              Limpiar
            </button>
            <button type="submit" form="dashboard-filters-form" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2277ee] px-4 text-[11px] font-extrabold text-white shadow-[0_6px_14px_rgba(34,119,238,0.18)] transition hover:bg-[#1769d4]"><Check className="h-4 w-4" aria-hidden="true" />Aplicar filtros</button>
          </div>
        }
      >
        <form id="dashboard-filters-form" onSubmit={submitFilters} className="grid gap-5">
          <div className="rounded-xl border border-[#dceafa] bg-[#f5f9ff] px-3.5 py-3">
            <p className="text-[11px] font-extrabold text-[#304b66]">Define el alcance del dashboard</p>
            <p className="mt-1 text-[10px] font-semibold leading-5 text-[#71869c]">Los mismos filtros se aplican a KPIs, ventas, productos, pipeline y exportación.</p>
          </div>
          {advancedFilterCount ? <section className="grid gap-2.5 border-b border-[#edf2f6] pb-4" aria-label="Filtros activos del dashboard"><div className="flex items-center justify-between gap-3"><h3 className="text-[11px] font-extrabold text-[#304b66]">Filtros activos</h3><span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e8f1ff] px-1.5 text-[10px] font-extrabold text-[#2277ee]">{advancedFilterCount}</span></div><div className="flex flex-wrap gap-1.5">{activeFilters.map((item) => <span key={item.key} className="inline-flex max-w-full items-center rounded-full border border-[#cfe0f1] bg-white px-2.5 py-1 text-[10px] font-bold text-[#40607c]">{item.label}</span>)}</div></section> : null}
          <fieldset className="grid gap-3">
            <legend className="mb-0.5 text-[11px] font-extrabold text-[#173654]">Período</legend>
            <FilterSelect name="range" label="Período del dashboard" icon={CalendarDays} value={formRange} onValueChange={(value) => setFormRange(value as DashboardRange)} options={rangeOptions.map((item) => [item.value, item.label] as const)} emptyLabel={null} />
            {formRange === "custom" ? <div className="grid grid-cols-2 gap-3"><DateField name="from" label="Desde" value={filters.from ?? ""} /><DateField name="to" label="Hasta" value={filters.to ?? ""} /></div> : null}
          </fieldset>
          <fieldset className="grid gap-3 border-t border-[#edf2f6] pt-4">
            <legend className="mb-0.5 text-[11px] font-extrabold text-[#173654]">Contexto comercial</legend>
            <FilterSelect name="locationId" label="Local" icon={MapPin} value={formValues.locationId} onValueChange={(value) => setFormValue("locationId", value)} options={options.locations.map((item) => [item.id, item.name] as const)} />
            <FilterSelect name="sellerId" label="Vendedor" icon={UserRound} value={formValues.sellerId} onValueChange={(value) => setFormValue("sellerId", value)} options={options.sellers.map((item) => [item.id, item.name || item.email] as const)} />
            <FilterSelect name="customerId" label="Cliente" icon={UsersRound} value={formValues.customerId} onValueChange={(value) => setFormValue("customerId", value)} options={options.customers.map((item) => [item.id, item.name] as const)} />
            <FilterSelect name="productId" label="Producto" icon={Package} value={formValues.productId} onValueChange={(value) => setFormValue("productId", value)} options={options.products.map((item) => [item.id, `${item.sku} · ${item.name ?? "Producto"}`] as const)} />
          </fieldset>
          <fieldset className="grid gap-3 border-t border-[#edf2f6] pt-4">
            <legend className="mb-0.5 text-[11px] font-extrabold text-[#173654]">Clasificación</legend>
            <FilterSelect name="categoryId" label="Categoría" icon={Tag} value={formValues.categoryId} onValueChange={(value) => { setFormValue("categoryId", value); if (!value) setFormValue("familyId", ""); }} options={options.categories.map((item) => [item.id, item.name] as const)} />
            <FilterSelect name="familyId" label="Familia" icon={Layers3} value={formValues.familyId} onValueChange={(value) => setFormValue("familyId", value)} options={familyOptions.map((item) => [item.id, item.name] as const)} />
            <FilterSelect name="brandId" label="Marca" icon={Badge} value={formValues.brandId} onValueChange={(value) => setFormValue("brandId", value)} options={options.brands.map((item) => [item.id, item.name] as const)} />
          </fieldset>
          <fieldset className="grid gap-3 border-t border-[#edf2f6] pt-4">
            <legend className="mb-0.5 text-[11px] font-extrabold text-[#173654]">Origen y estado</legend>
            <FilterSelect name="channel" label="Canal" icon={Store} value={formValues.channel} onValueChange={(value) => setFormValue("channel", value)} options={channelOptions} />
            <FilterSelect name="orderStatus" label="Estado de pedido" icon={ClipboardList} value={formValues.orderStatus} onValueChange={(value) => setFormValue("orderStatus", value)} options={orderStatusOptions} />
            {availableCurrencies.length > 1 ? <FilterSelect name="currency" label="Moneda" icon={CircleDollarSign} value={formValues.currency} onValueChange={(value) => setFormValue("currency", value)} options={availableCurrencies.map((currency) => [currency, currency] as const)} /> : null}
          </fieldset>
          {error ? <p role="alert" className="rounded-lg border border-[#ffcaca] bg-[#fff5f5] px-3 py-2 text-[11px] font-semibold text-[#b42318]">{error}</p> : null}
        </form>
      </AdminDrawer>
    </>
  );
}

export function DashboardGranularitySelect({ filters, value, compact = false }: { filters: DashboardFilters; value: DashboardGranularity; compact?: boolean }) {
  const router = useRouter();
  const options: Array<{ value: DashboardGranularity; label: string }> = filters.range === "today" || filters.range === "yesterday"
    ? [{ value: "hour", label: "Por hora" }, { value: "day", label: "Diario" }]
    : [{ value: "day", label: "Diario" }, { value: "week", label: "Semanal" }, { value: "month", label: "Mensual" }];
  const selected = options.some((option) => option.value === value) ? value : options[0].value;
  return (
    <HeaderSelect
      ariaLabel="Agrupar ventas"
      value={selected}
      onChange={(next) => {
        const query = dashboardFiltersToQuery({ ...filters, granularity: next });
        router.push(`/admin/dashboard?${query.toString()}`, { scroll: false });
      }}
      options={options}
      buttonClassName={`shrink-0 items-center gap-1.5 rounded-lg border border-[#dfe8ef] bg-white font-extrabold text-[#304b66] shadow-[0_1px_2px_rgba(16,42,67,0.02)] outline-none transition hover:border-[#b9d2eb] focus-visible:border-[#2277ee] focus-visible:ring-2 focus-visible:ring-[#2277ee]/15 inline-flex ${compact ? "h-8 w-[92px] px-2.5 text-[10px]" : "h-9 w-[112px] px-3 text-[11px]"}`}
      panelClassName={`right-0 min-w-[128px] ${compact ? "text-[10px]" : "text-[11px]"}`}
    />
  );
}

function FilterSelect({
  name,
  label,
  value,
  options,
  onValueChange,
  emptyLabel = "Todos",
  icon: Icon,
}: {
  name: string;
  label: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  onValueChange?: (value: string) => void;
  emptyLabel?: string | null;
  icon?: LucideIcon;
}) {
  return (
    <label className="grid gap-1.5 text-[10px] font-extrabold text-[#304b66]">
      <span className="flex items-center gap-1.5">{Icon ? <Icon className="h-3.5 w-3.5 text-[#607894]" aria-hidden="true" /> : null}{label}</span>
      <span className="relative">
        <select name={name} value={value} onChange={(event) => onValueChange?.(event.target.value)} className="has-custom-chevron h-11 w-full appearance-none rounded-xl border border-[#dce6ee] bg-white px-3 pr-9 text-[11px] font-semibold text-[#304b66] outline-none transition hover:border-[#b9d2eb] focus:border-[#2277ee] focus:ring-2 focus:ring-[#2277ee]/10">
          {emptyLabel !== null ? <option value="">{emptyLabel}</option> : null}
          {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#607894]" aria-hidden="true" />
      </span>
    </label>
  );
}

function DateField({ name, label, value }: { name: string; label: string; value: string }) {
  return <label className="grid gap-1.5 text-[10px] font-extrabold text-[#304b66]">{label}<input type="date" name={name} defaultValue={value} className="h-11 min-w-0 rounded-xl border border-[#dce6ee] px-2.5 text-[11px] text-[#526b84] outline-none transition focus:border-[#2277ee] focus:ring-2 focus:ring-[#2277ee]/10" /></label>;
}
