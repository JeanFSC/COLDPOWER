"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  FileClock,
  Filter,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  X,
} from "lucide-react";
import {
  inventoryMovementLabels,
  inventoryPageSizes,
  inventoryStatusLabels,
  type InventoryAdminFilters,
} from "@/lib/inventory-admin-contract";
import type { InventoryMovementType } from "@/lib/inventory-types";

type LocationSummary = {
  id: string;
  code: string;
  name: string;
  type: string;
  referencesWithBalance: number;
  onHandUnits: number;
  reservedUnits: number;
  availableUnits: number;
  criticalBalances: number;
};

type InventoryItem = {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  categoryName: string;
  familyName: string;
  brandName: string | null;
  locationId: string;
  locationCode: string;
  locationName: string;
  locationType: string;
  onHand: number;
  reserved: number;
  available: number;
  minimumStock: number | null;
  updatedAt: string | null;
  lastMovementAt: string | null;
  lastMovementType: string | null;
  lastMovementLabel: string | null;
  lastMovementQuantity: number | null;
  status: keyof typeof inventoryStatusLabels;
  mediaUrl: string | null;
};

type InventoryAdminPageData = {
  items: InventoryItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  summary: {
    referencesWithBalance: number;
    onHandUnits: number;
    reservedUnits: number;
    availableUnits: number;
    criticalBalances: number;
    outOfStockBalances: number;
    balancesWithoutMinimum: number;
    stockUnknownProducts: number;
    activeLocations: number;
  };
  facets: {
    locations: Array<{ id: string; code: string; name: string; type: string }>;
    categories: Array<{ id: string; name: string }>;
    families: Array<{ id: string; name: string; categoryId: string }>;
    brands: Array<{ id: string; name: string }>;
    statuses: Array<keyof typeof inventoryStatusLabels>;
  };
  locations: LocationSummary[];
  alerts: {
    items: Array<
      Pick<
        InventoryItem,
        | "id"
        | "productId"
        | "sku"
        | "productName"
        | "locationId"
        | "locationName"
        | "onHand"
        | "reserved"
        | "available"
        | "minimumStock"
        | "status"
      >
    >;
    counts: {
      critical: number;
      outOfStock: number;
      withoutMinimum: number;
      stockUnknown: number;
      expiringReservations: number;
      pendingTransfers: number;
    };
  };
  operations: {
    movements: Array<{
      id: string;
      type: string;
      label: string;
      quantity: number;
      entry: number;
      exit: number;
      reservedDelta: number;
      referenceLabel: string;
      actorName: string | null;
      reason: string | null;
      notes: string | null;
      sku: string;
      productName: string;
      locationCode: string;
      locationName: string;
      createdAt: string | null;
    }>;
    transfers: Array<{
      id: string;
      status: string;
      sourceCode: string;
      sourceName: string;
      destinationCode: string;
      destinationName: string;
      requestedByName: string | null;
      itemCount: number;
      units: number;
      notes: string | null;
      updatedAt: string | null;
    }>;
    reservations: Array<{
      id: string;
      sku: string;
      productName: string;
      locationCode: string;
      locationName: string;
      quantity: number;
      status: string;
      referenceType: string | null;
      referenceId: string | null;
      reason: string | null;
      expiresAt: string | null;
      createdByName: string | null;
      createdAt: string | null;
    }>;
    minimums: Array<{
      id: string;
      sku: string;
      productName: string;
      locationCode: string;
      locationName: string;
      onHand: number;
      reserved: number;
      minimumStock: number | null;
      available: number;
      status: keyof typeof inventoryStatusLabels;
    }>;
    imports: Array<{
      id: string;
      source: string;
      status: string;
      filename: string | null;
      rowsRead: number;
      matched: number;
      unmatched: number;
      ambiguous: number;
      quantities: number;
      locations: number;
      appliedBy: string | null;
      createdAt: string | null;
      completedAt: string | null;
    }>;
  };
  fetchedAt: string;
};

type ProductOption = { id: string; sku: string; name: string; available: number };
type PermissionSet = {
  canAdjust: boolean;
  canTransfer: boolean;
  canReserve: boolean;
  canKardex: boolean;
};

const movementTypes: Array<{ value: InventoryMovementType; label: string }> = [
  { value: "OPENING_BALANCE", label: "Saldo inicial" },
  { value: "PURCHASE_RECEIPT", label: "Recepción de compra" },
  { value: "ADJUSTMENT_IN", label: "Ajuste de entrada" },
  { value: "ADJUSTMENT_OUT", label: "Ajuste de salida" },
  { value: "RETURN_IN", label: "Devolución recibida" },
  { value: "RETURN_OUT", label: "Devolución enviada" },
];

const panel = "rounded-xl border border-[#e2eaf1] bg-white shadow-[0_1px_3px_rgba(16,42,67,0.035)]";

function number(value: number) {
  return new Intl.NumberFormat("es-PE").format(value);
}

function dateTime(value: string | null) {
  if (!value) return "Sin registro";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function statusClass(status: keyof typeof inventoryStatusLabels) {
  switch (status) {
    case "CRITICO":
      return "border-[#ffd1d1] bg-[#fff2f2] text-[#c94040]";
    case "AGOTADO":
      return "border-[#ffc1c1] bg-[#ffe8e8] text-[#b42318]";
    case "SIN_MINIMO":
      return "border-[#dce6ee] bg-[#f5f8fa] text-[#667d94]";
    case "SIN_SALDO":
      return "border-[#dce6ee] bg-[#f5f8fa] text-[#667d94]";
    case "BAJO":
      return "border-[#ffe0ae] bg-[#fff7e8] text-[#a15c00]";
    case "RESERVADO":
      return "border-[#ddd2ff] bg-[#f2eeff] text-[#8057e8]";
    default:
      return "border-[#b8e6d1] bg-[#e8f8ef] text-[#13895a]";
  }
}

const transferStatusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  REQUESTED: "Solicitada",
  IN_TRANSIT: "En tránsito",
  RECEIVED: "Recibida",
  CANCELLED: "Cancelada",
};
const reservationStatusLabels: Record<string, string> = {
  ACTIVE: "Activa",
  RELEASED: "Liberada",
  CONSUMED: "Consumida",
  CANCELLED: "Cancelada",
  EXPIRED: "Vencida",
};
const reservationReferenceLabels: Record<string, string> = {
  order: "Pedido",
  quote: "Cotización",
  opportunity: "Oportunidad",
  manual: "Manual",
};
const importStatusLabels: Record<string, string> = {
  DRY_RUN: "Vista previa",
  READY_FOR_TRANSACTION: "Listo para aplicar",
  REJECTED_NO_APPLY: "Rechazado",
  APPLIED: "Aplicado",
  FAILED: "Fallido",
};

function transferStatusClass(status: string) {
  if (status === "RECEIVED") return "border-[#b8e6d1] bg-[#e8f8ef] text-[#13895a]";
  if (status === "CANCELLED") return "border-[#dce6ee] bg-[#f5f8fa] text-[#667d94]";
  if (status === "IN_TRANSIT") return "border-[#c9dcff] bg-[#eef4ff] text-[#2277ee]";
  return "border-[#ffe0ae] bg-[#fff7e8] text-[#a15c00]";
}

function reservationStatusClass(status: string) {
  if (status === "ACTIVE") return "border-[#c9dcff] bg-[#eef4ff] text-[#2277ee]";
  if (status === "EXPIRED") return "border-[#ffe0ae] bg-[#fff7e8] text-[#a15c00]";
  return "border-[#dce6ee] bg-[#f5f8fa] text-[#667d94]";
}

function messageFromResponse(payload: unknown) {
  if (!payload || typeof payload !== "object") return "No se pudo completar la operación.";
  const value = payload as { error?: unknown };
  if (typeof value.error === "string") return value.error;
  if (
    value.error &&
    typeof value.error === "object" &&
    "message" in value.error &&
    typeof value.error.message === "string"
  )
    return value.error.message;
  return "No se pudo completar la operación.";
}

async function postJson(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(messageFromResponse(payload));
  return payload;
}

async function patchJson(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(messageFromResponse(payload));
  return payload;
}

function ProductPicker({
  locationId,
  value,
  onChange,
  disabled = false,
  requireLocation = true,
}: {
  locationId?: string;
  value: ProductOption | null;
  onChange: (value: ProductOption | null) => void;
  disabled?: boolean;
  requireLocation?: boolean;
}) {
  const [query, setQuery] = useState(value ? `${value.sku} · ${value.name}` : "");
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || disabled) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ query });
      if (locationId) params.set("locationId", locationId);
      void fetch(`/api/admin/inventario/productos?${params.toString()}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = (await response.json()) as { products?: ProductOption[] };
          if (!response.ok) throw new Error(messageFromResponse(payload));
          setOptions(payload.products ?? []);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setOptions([]);
        })
        .finally(() => setLoading(false));
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [disabled, locationId, open, query, requireLocation]);

  return (
    <div className="relative">
      <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
        Producto
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8aa0b6]"
            aria-hidden="true"
          />
          <input
            value={query}
            disabled={disabled}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              onChange(null);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
            placeholder={
              locationId || !requireLocation
                ? "Buscar por SKU o nombre…"
                : "Selecciona un local primero"
            }
            className="h-10 w-full rounded-lg border border-[#dce6ee] bg-white pl-9 pr-3 text-[11px] font-semibold text-[#304b66] outline-none placeholder:text-[#a1afbd] focus:border-[#2277ee] disabled:cursor-not-allowed disabled:bg-[#f5f8fa]"
            aria-label="Buscar producto de inventario"
            role="combobox"
            aria-expanded={open}
            aria-controls="inventory-product-options"
          />
        </div>
      </label>
      {open && !disabled ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Cerrar resultados de producto"
          />
          <div
            id="inventory-product-options"
            role="listbox"
            className="absolute left-0 right-0 top-[62px] z-20 max-h-56 overflow-y-auto rounded-lg border border-[#dce6ee] bg-white p-1 shadow-[0_12px_28px_rgba(16,42,67,0.14)]"
          >
            {loading ? (
              <p className="px-3 py-3 text-[10px] text-[#8296a9]">Buscando referencias…</p>
            ) : null}
            {!loading && requireLocation && !locationId ? (
              <p className="px-3 py-3 text-[10px] text-[#8296a9]">
                Selecciona un local para consultar referencias.
              </p>
            ) : null}
            {!loading && (locationId || !requireLocation) && !options.length ? (
              <p className="px-3 py-3 text-[10px] text-[#8296a9]">
                No encontramos referencias con esa búsqueda.
              </p>
            ) : null}
            {!loading &&
              options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={value?.id === option.id}
                  onClick={() => {
                    onChange(option);
                    setQuery(`${option.sku} · ${option.name}`);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-[#f4f8fb]"
                >
                  <span className="min-w-0">
                    <strong className="block truncate font-mono text-[10px] text-[#304b66]">
                      {option.sku}
                    </strong>
                    <span className="block truncate text-[10px] text-[#71869c]">{option.name}</span>
                  </span>
                  <span
                    className={`shrink-0 text-[9px] font-black ${option.available > 0 ? "text-[#13895a]" : "text-[#a1afbd]"}`}
                  >
                    {number(option.available)} disp.
                  </span>
                </button>
              ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

type GlobalMovementItem = {
  id: string;
  type: InventoryMovementType;
  label: string;
  quantity: number;
  entry: number;
  exit: number;
  reservedDelta: number;
  availableBefore: number;
  availableAfter: number;
  referenceLabel: string;
  actorName: string | null;
  sku: string;
  productName: string;
  locationCode: string;
  locationName: string;
  reason: string | null;
  notes: string | null;
  createdAt: string | null;
};

type GlobalMovementsPayload = {
  items: GlobalMovementItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

function GlobalMovementsDrawer({
  locations,
  onClose,
}: {
  locations: LocationSummary[];
  onClose: () => void;
}) {
  const [product, setProduct] = useState<ProductOption | null>(null);
  const [locationId, setLocationId] = useState("");
  const [type, setType] = useState<InventoryMovementType | "">("");
  const [actorQuery, setActorQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState<GlobalMovementsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (product) params.set("productId", product.id);
    if (locationId) params.set("locationId", locationId);
    if (type) params.set("type", type);
    if (actorQuery.trim()) params.set("actor", actorQuery.trim());
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    void fetch(`/api/admin/inventario/movimientos?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as GlobalMovementsPayload & { error?: unknown };
        if (!response.ok) throw new Error(messageFromResponse(body));
        setPayload(body);
        setError("");
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setPayload(null);
        setError(
          reason instanceof Error ? reason.message : "No se pudieron cargar los movimientos.",
        );
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [actorQuery, dateFrom, dateTo, locationId, page, product, type]);

  const resetPage = () => {
    setPage(1);
    setLoading(true);
    setError("");
  };
  const goToPage = (nextPage: number) => {
    setLoading(true);
    setPage(nextPage);
  };
  return (
    <DialogFrame
      title="Movimientos globales"
      description="Kardex operativo inmutable con filtros por referencia, local, usuario y periodo."
      onClose={onClose}
    >
      <div className="grid gap-4">
        <div className="grid gap-2 rounded-xl border border-[#edf2f6] bg-[#fbfcfd] p-3 sm:grid-cols-2 lg:grid-cols-3">
          <ProductPicker
            requireLocation={false}
            value={product}
            onChange={(value) => {
              setProduct(value);
              resetPage();
            }}
          />
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Local
            <select
              value={locationId}
              onChange={(event) => {
                setLocationId(event.target.value);
                resetPage();
              }}
              className="h-10 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-semibold text-[#526b84]"
            >
              <option value="">Todos los locales</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code} · {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Tipo de movimiento
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value as InventoryMovementType | "");
                resetPage();
              }}
              className="h-10 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-semibold text-[#526b84]"
            >
              <option value="">Todos los tipos</option>
              {movementTypes.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Usuario
            <input
              value={actorQuery}
              onChange={(event) => {
                setActorQuery(event.target.value);
                resetPage();
              }}
              placeholder="Nombre o correo"
              className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-semibold text-[#526b84]"
            />
          </label>
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Desde
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                resetPage();
              }}
              className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-semibold text-[#526b84]"
            />
          </label>
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Hasta
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                resetPage();
              }}
              className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-semibold text-[#526b84]"
            />
          </label>
        </div>
        {loading ? (
          <div className="rounded-lg border border-dashed border-[#dce6ee] px-4 py-10 text-center text-[10px] text-[#8296a9]">
            Cargando movimientos…
          </div>
        ) : null}
        {error ? (
          <div
            className="rounded-lg border border-[#ffd1d1] bg-[#fff2f2] px-3 py-2 text-[10px] font-bold text-[#c94040]"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        {!loading && !error ? (
          <div className="grid gap-2">
            {payload?.items.map((movement) => (
              <article
                key={movement.id}
                className="grid gap-2 rounded-lg border border-[#edf2f6] bg-white p-3 lg:grid-cols-[minmax(170px,1.3fr)_minmax(145px,1fr)_110px_minmax(130px,0.9fr)]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#e8f1ff] px-1.5 py-1 text-[8px] font-extrabold text-[#2277ee]">
                      {movement.label}
                    </span>
                    <span className="font-mono text-[8px] text-[#8296a9]">{movement.sku}</span>
                  </div>
                  <p className="mt-1 truncate text-[10px] font-extrabold text-[#304b66]">
                    {movement.productName}
                  </p>
                  <p className="mt-1 text-[9px] text-[#8296a9]">
                    {movement.locationCode} · {movement.locationName}
                  </p>
                </div>
                <div className="text-[9px] text-[#71869c]">
                  <p>
                    <span className="font-extrabold text-[#526b84]">Referencia:</span>{" "}
                    {movement.referenceLabel}
                  </p>
                  <p className="mt-1">
                    <span className="font-extrabold text-[#526b84]">Usuario:</span>{" "}
                    {movement.actorName || "Sistema"}
                  </p>
                  {movement.reason ? <p className="mt-1 truncate">{movement.reason}</p> : null}
                </div>
                <div className="text-[10px] font-black">
                  <span className="block text-[#13895a]">
                    {movement.entry ? `+${number(movement.entry)}` : "—"}
                  </span>
                  <span className="mt-1 block text-[#c94040]">
                    {movement.exit ? `-${number(movement.exit)}` : "—"}
                  </span>
                  {movement.reservedDelta ? (
                    <span className="mt-1 block text-[#8057e8]">
                      Res. {movement.reservedDelta > 0 ? "+" : ""}
                      {number(movement.reservedDelta)}
                    </span>
                  ) : null}
                </div>
                <div className="text-[9px] text-[#8296a9] lg:text-right">
                  <p>
                    Disp. {number(movement.availableBefore)} → {number(movement.availableAfter)}
                  </p>
                  <p className="mt-1">{dateTime(movement.createdAt)}</p>
                </div>
              </article>
            ))}
            {!payload?.items.length ? (
              <OperationEmpty text="No hay movimientos para los filtros seleccionados." />
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf2f6] pt-3 text-[9px] font-semibold text-[#8296a9]">
              <span>
                {payload
                  ? `Mostrando ${payload.totalItems ? (payload.page - 1) * payload.pageSize + 1 : 0}–${Math.min(payload.page * payload.pageSize, payload.totalItems)} de ${number(payload.totalItems)}`
                  : ""}
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={!payload || payload.page <= 1}
                  onClick={() => goToPage(Math.max(1, (payload?.page ?? 1) - 1))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#dce6ee] disabled:opacity-35"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-2">
                  Página {payload?.page ?? 1} de {payload?.totalPages ?? 1}
                </span>
                <button
                  type="button"
                  disabled={!payload || payload.page >= payload.totalPages}
                  onClick={() => goToPage((payload?.page ?? 1) + 1)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#dce6ee] disabled:opacity-35"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </DialogFrame>
  );
}

function DialogFrame({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[#102a43]/35 p-0 sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-dialog-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-[620px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_20px_60px_rgba(16,42,67,0.26)] sm:rounded-2xl">
        <div className="flex items-start gap-3 border-b border-[#edf2f6] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id="inventory-dialog-title" className="text-[16px] font-black text-[#102a43]">
              {title}
            </h2>
            <p className="mt-1 text-[10px] leading-4 text-[#71869c]">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#71869c] hover:bg-[#f4f7fa]"
            aria-label="Cerrar diálogo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function AdjustmentDialog({
  locations,
  initialItem,
  onClose,
  onSuccess,
}: {
  locations: LocationSummary[];
  initialItem?: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [locationId, setLocationId] = useState(initialItem?.locationId ?? "");
  const [product, setProduct] = useState<ProductOption | null>(
    initialItem ? inventoryProductOption(initialItem) : null,
  );
  const [type, setType] = useState<InventoryMovementType>("ADJUSTMENT_IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const manual = type === "ADJUSTMENT_IN" || type === "ADJUSTMENT_OUT";
  const outbound = type === "ADJUSTMENT_OUT" || type === "RETURN_OUT";
  const quantityNumber = Number(quantity);
  const outputBlocked =
    outbound &&
    product !== null &&
    Number.isInteger(quantityNumber) &&
    quantityNumber > product.available;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await postJson("/api/admin/inventario/ajustes", {
        productId: product?.id,
        locationId,
        quantity: quantityNumber,
        type,
        reason,
        notes,
      });
      onSuccess();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar el movimiento.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <DialogFrame
      title="Registrar movimiento"
      description="La operación persiste saldo, Kardex y auditoría en una única transacción."
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Local
            <select
              required
              value={locationId}
              onChange={(event) => {
                setLocationId(event.target.value);
                setProduct(null);
              }}
              className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[11px] font-semibold text-[#304b66]"
            >
              <option value="">Selecciona un local</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code} · {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Tipo de movimiento
            <select
              required
              value={type}
              onChange={(event) => setType(event.target.value as InventoryMovementType)}
              className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[11px] font-semibold text-[#304b66]"
            >
              {movementTypes.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ProductPicker locationId={locationId} value={product} onChange={setProduct} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Cantidad
            <input
              required
              min="1"
              step="1"
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="h-10 rounded-lg border border-[#dce6ee] px-3 text-[11px] font-semibold text-[#304b66]"
            />
          </label>
          <div className="rounded-lg border border-[#edf2f6] bg-[#fbfcfd] px-3 py-2.5 text-[10px] text-[#71869c]">
            <span className="block font-extrabold text-[#526b84]">Disponible consultado</span>
            <strong className="mt-1 block text-[15px] text-[#102a43]">
              {product ? number(product.available) : "—"}
            </strong>
          </div>
        </div>
        {manual ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
              Motivo
              <input
                required
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={240}
                placeholder="Ej. Conteo cíclico"
                className="h-10 rounded-lg border border-[#dce6ee] px-3 text-[11px] font-semibold text-[#304b66]"
              />
            </label>
            <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
              Notas
              <textarea
                required
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Detalle para auditoría"
                className="rounded-lg border border-[#dce6ee] px-3 py-2 text-[11px] font-semibold text-[#304b66]"
              />
            </label>
          </div>
        ) : null}
        <div className="rounded-lg border border-[#dce6ee] bg-[#f7fafc] p-3 text-[10px] leading-5 text-[#71869c]">
          <p className="font-extrabold text-[#304b66]">Vista previa</p>
          <p className="mt-1">
            {product
              ? `${inventoryMovementLabels[type]} · ${product.sku} · ${quantity || "0"} unidades en ${locations.find((location) => location.id === locationId)?.name ?? "el local seleccionado"}.`
              : "Selecciona una referencia para revisar el movimiento."}
          </p>
        </div>
        {outputBlocked ? (
          <p
            className="rounded-lg border border-[#ffd1d1] bg-[#fff2f2] px-3 py-2 text-[10px] font-bold text-[#c94040]"
            role="alert"
          >
            La salida supera el disponible; no puede dejar el reservado por encima del físico.
          </p>
        ) : null}
        {message ? (
          <p
            className="rounded-lg border border-[#ffd1d1] bg-[#fff2f2] px-3 py-2 text-[10px] font-bold text-[#c94040]"
            role="alert"
          >
            {message}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#edf2f6] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-[#dce6ee] px-4 text-[10px] font-extrabold text-[#526b84]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={
              busy ||
              !product ||
              !locationId ||
              outputBlocked ||
              !Number.isInteger(quantityNumber) ||
              quantityNumber < 1
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#102a43] px-4 text-[10px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {busy ? "Registrando…" : "Confirmar movimiento"}
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}

type TransferLine = { product: ProductOption | null; quantity: string };

function TransferDialog({
  locations,
  initialItem,
  onClose,
  onSuccess,
}: {
  locations: LocationSummary[];
  initialItem?: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [sourceLocationId, setSourceLocationId] = useState(initialItem?.locationId ?? "");
  const [destinationLocationId, setDestinationLocationId] = useState("");
  const [lines, setLines] = useState<TransferLine[]>([
    { product: initialItem ? inventoryProductOption(initialItem) : null, quantity: "" },
  ]);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const invalidLines = lines.some(
    (line) =>
      !line.product ||
      !Number.isInteger(Number(line.quantity)) ||
      Number(line.quantity) < 1 ||
      Number(line.quantity) > (line.product?.available ?? 0),
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await postJson("/api/admin/inventario/transferencias", {
        sourceLocationId,
        destinationLocationId,
        notes,
        items: lines.map((line) => ({
          productId: line.product?.id,
          quantity: Number(line.quantity),
        })),
      });
      onSuccess();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear el traslado.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <DialogFrame
      title="Nuevo traslado"
      description="Crea un traslado en DRAFT. El stock solo se mueve al pasar a tránsito y al recibirlo en destino."
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Origen
            <select
              required
              value={sourceLocationId}
              onChange={(event) => {
                setSourceLocationId(event.target.value);
                setLines([{ product: null, quantity: "" }]);
              }}
              className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[11px] font-semibold text-[#304b66]"
            >
              <option value="">Selecciona origen</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code} · {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Destino
            <select
              required
              value={destinationLocationId}
              onChange={(event) => setDestinationLocationId(event.target.value)}
              className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[11px] font-semibold text-[#304b66]"
            >
              <option value="">Selecciona destino</option>
              {locations
                .filter((location) => location.id !== sourceLocationId)
                .map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.code} · {location.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-[#304b66]">Referencias a trasladar</p>
            <button
              type="button"
              onClick={() => setLines((current) => [...current, { product: null, quantity: "" }])}
              disabled={!sourceLocationId}
              className="inline-flex items-center gap-1 rounded-md border border-[#dce6ee] px-2.5 py-1.5 text-[9px] font-extrabold text-[#2277ee] disabled:opacity-40"
            >
              <Plus className="h-3 w-3" />
              Agregar línea
            </button>
          </div>
          {lines.map((line, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-3 sm:grid-cols-[minmax(0,1fr)_110px_32px]"
            >
              <ProductPicker
                locationId={sourceLocationId}
                value={line.product}
                onChange={(product) =>
                  setLines((current) =>
                    current.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, product } : entry,
                    ),
                  )
                }
              />
              <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
                Cantidad
                <input
                  required
                  min="1"
                  step="1"
                  type="number"
                  value={line.quantity}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, quantity: event.target.value } : entry,
                      ),
                    )
                  }
                  className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[11px] font-semibold text-[#304b66]"
                />
              </label>
              <button
                type="button"
                disabled={lines.length === 1}
                onClick={() =>
                  setLines((current) => current.filter((_, entryIndex) => entryIndex !== index))
                }
                className="mt-5 inline-flex h-8 w-8 items-center justify-center rounded-md text-[#8296a9] hover:bg-white hover:text-[#c94040] disabled:opacity-30"
                aria-label="Quitar referencia"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {line.product && Number(line.quantity) > line.product.available ? (
                <p className="text-[9px] font-bold text-[#c94040] sm:col-span-3">
                  Disponible en origen: {number(line.product.available)} unidades.
                </p>
              ) : null}
            </div>
          ))}
        </div>
        <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
          Notas del traslado
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Referencia operativa o motivo"
            className="rounded-lg border border-[#dce6ee] px-3 py-2 text-[11px] font-semibold text-[#304b66]"
          />
        </label>
        {message ? (
          <p
            className="rounded-lg border border-[#ffd1d1] bg-[#fff2f2] px-3 py-2 text-[10px] font-bold text-[#c94040]"
            role="alert"
          >
            {message}
          </p>
        ) : null}
        <div className="rounded-lg border border-[#dce6ee] bg-[#f7fafc] p-3 text-[10px] leading-5 text-[#71869c]">
          <p className="font-extrabold text-[#304b66]">Vista previa</p>
          <p className="mt-1">
            {lines
              .filter((line) => line.product)
              .map((line) => `${line.product?.sku} · ${line.quantity || "0"}`)
              .join("  /  ") || "Sin referencias seleccionadas."}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#edf2f6] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-[#dce6ee] px-4 text-[10px] font-extrabold text-[#526b84]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={
              busy ||
              !sourceLocationId ||
              !destinationLocationId ||
              sourceLocationId === destinationLocationId ||
              invalidLines
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#102a43] px-4 text-[10px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Truck className="h-3.5 w-3.5" />
            )}
            {busy ? "Creando…" : "Crear traslado"}
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}

function ReservationDialog({
  locations,
  initialItem,
  onClose,
  onSuccess,
}: {
  locations: LocationSummary[];
  initialItem?: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [locationId, setLocationId] = useState(initialItem?.locationId ?? "");
  const [product, setProduct] = useState<ProductOption | null>(
    initialItem ? inventoryProductOption(initialItem) : null,
  );
  const [referenceType, setReferenceType] = useState<"order" | "quote" | "opportunity" | "manual">(
    "manual",
  );
  const [quantity, setQuantity] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const quantityNumber = Number(quantity);
  const manual = referenceType === "manual";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await postJson("/api/admin/inventario/reservas", {
        productId: product?.id,
        locationId,
        quantity: quantityNumber,
        referenceType,
        referenceId: referenceId.trim() || undefined,
        reason: manual ? reason.trim() : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      onSuccess();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear la reserva.");
    } finally {
      setBusy(false);
    }
  }
  const outputBlocked =
    product !== null && Number.isInteger(quantityNumber) && quantityNumber > product.available;
  return (
    <DialogFrame
      title="Reservar stock"
      description="La reserva compromete disponible y queda lista para liberar, consumir o expirar con trazabilidad."
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Local
            <select
              required
              value={locationId}
              onChange={(event) => {
                setLocationId(event.target.value);
                setProduct(null);
              }}
              className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[11px] font-semibold text-[#304b66]"
            >
              <option value="">Selecciona un local</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code} · {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Tipo de referencia
            <select
              required
              value={referenceType}
              onChange={(event) => setReferenceType(event.target.value as typeof referenceType)}
              className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[11px] font-semibold text-[#304b66]"
            >
              <option value="order">Pedido</option>
              <option value="quote">Cotización</option>
              <option value="opportunity">Oportunidad</option>
              <option value="manual">Manual</option>
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
          {manual ? "Referencia (opcional)" : "Código de referencia"}
          <input
            value={referenceId}
            onChange={(event) => setReferenceId(event.target.value)}
            placeholder={
              manual ? "Ej. conteo físico" : "Código del pedido, cotización u oportunidad"
            }
            maxLength={120}
            className="h-10 rounded-lg border border-[#dce6ee] px-3 text-[11px] font-semibold text-[#304b66]"
          />
        </label>
        <ProductPicker locationId={locationId} value={product} onChange={setProduct} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Cantidad
            <input
              required
              min="1"
              step="1"
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="h-10 rounded-lg border border-[#dce6ee] px-3 text-[11px] font-semibold text-[#304b66]"
            />
          </label>
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Expira el (opcional)
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="h-10 rounded-lg border border-[#dce6ee] px-3 text-[11px] font-semibold text-[#304b66]"
            />
          </label>
        </div>
        {manual ? (
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Motivo de reserva manual
            <textarea
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={240}
              rows={2}
              placeholder="Ej. compromiso comercial, conteo o apartamiento"
              className="rounded-lg border border-[#dce6ee] px-3 py-2 text-[11px] font-semibold text-[#304b66]"
            />
          </label>
        ) : null}
        <div className="rounded-lg border border-[#dce6ee] bg-[#f7fafc] p-3 text-[10px] leading-5 text-[#71869c]">
          <p className="font-extrabold text-[#304b66]">Vista previa</p>
          <p className="mt-1">
            {product
              ? `Disponible actual ${number(product.available)} · reserva ${quantity || "0"} · disponible después ${number(Math.max(0, product.available - (Number.isInteger(quantityNumber) ? quantityNumber : 0)))}.`
              : "Selecciona una referencia para consultar el disponible real."}
          </p>
        </div>
        {outputBlocked ? (
          <p
            className="rounded-lg border border-[#ffd1d1] bg-[#fff2f2] px-3 py-2 text-[10px] font-bold text-[#c94040]"
            role="alert"
          >
            La reserva supera el disponible actual.
          </p>
        ) : null}
        {message ? (
          <p
            className="rounded-lg border border-[#ffd1d1] bg-[#fff2f2] px-3 py-2 text-[10px] font-bold text-[#c94040]"
            role="alert"
          >
            {message}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#edf2f6] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-[#dce6ee] px-4 text-[10px] font-extrabold text-[#526b84]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={
              busy ||
              !locationId ||
              !product ||
              outputBlocked ||
              !Number.isInteger(quantityNumber) ||
              quantityNumber < 1 ||
              (manual && !reason.trim())
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#102a43] px-4 text-[10px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            {busy ? "Reservando…" : "Confirmar reserva"}
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}

function MinimumDialog({
  locations,
  initialItem,
  onClose,
  onSuccess,
}: {
  locations: LocationSummary[];
  initialItem?: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [locationId, setLocationId] = useState(initialItem?.locationId ?? "");
  const [product, setProduct] = useState<ProductOption | null>(
    initialItem ? inventoryProductOption(initialItem) : null,
  );
  const [minimumStock, setMinimumStock] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await postJson("/api/admin/inventario/minimos", {
        productId: product?.id,
        locationId,
        minimumStock: Number(minimumStock),
      });
      onSuccess();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el mínimo.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <DialogFrame
      title="Configurar mínimo"
      description="Define el umbral de alerta sin modificar el físico ni el reservado del saldo."
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Local
            <select
              required
              value={locationId}
              onChange={(event) => {
                setLocationId(event.target.value);
                setProduct(null);
              }}
              className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[11px] font-semibold text-[#304b66]"
            >
              <option value="">Selecciona un local</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code} · {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Mínimo
            <input
              required
              min="0"
              step="1"
              type="number"
              value={minimumStock}
              onChange={(event) => setMinimumStock(event.target.value)}
              placeholder="0"
              className="h-10 rounded-lg border border-[#dce6ee] px-3 text-[11px] font-semibold text-[#304b66]"
            />
          </label>
        </div>
        <ProductPicker locationId={locationId} value={product} onChange={setProduct} />
        <div className="rounded-lg border border-[#dce6ee] bg-[#f7fafc] p-3 text-[10px] leading-5 text-[#71869c]">
          <p className="font-extrabold text-[#304b66]">Vista previa</p>
          <p className="mt-1">
            {product
              ? `${product.sku} quedará en alerta cuando su disponible sea menor o igual a ${minimumStock || "0"}.`
              : "Selecciona una referencia con saldo registrado."}
          </p>
        </div>
        {message ? (
          <p
            className="rounded-lg border border-[#ffd1d1] bg-[#fff2f2] px-3 py-2 text-[10px] font-bold text-[#c94040]"
            role="alert"
          >
            {message}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#edf2f6] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-[#dce6ee] px-4 text-[10px] font-extrabold text-[#526b84]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={
              busy ||
              !locationId ||
              !product ||
              !Number.isInteger(Number(minimumStock)) ||
              Number(minimumStock) < 0
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#102a43] px-4 text-[10px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <SlidersHorizontal className="h-3.5 w-3.5" />
            )}
            {busy ? "Guardando…" : "Guardar mínimo"}
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}

function KardexDrawer({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const [payload, setPayload] = useState<{
    items: Array<{
      id: string;
      label: string;
      quantity: number;
      previousOnHand: number;
      resultingOnHand: number;
      entry: number;
      exit: number;
      reservedDelta: number;
      availableAfter: number;
      referenceLabel: string;
      actorName: string | null;
      reason: string | null;
      notes: string | null;
      createdAt: string;
    }>;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      productId: item.productId,
      locationId: item.locationId,
      page: String(page),
      pageSize: "25",
    });
    void fetch(`/api/admin/inventario/kardex?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const value = await response.json();
        if (!response.ok) throw new Error(messageFromResponse(value));
        setPayload(value);
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError"))
          setError(reason instanceof Error ? reason.message : "No se pudo cargar el Kardex.");
      });
    return () => controller.abort();
  }, [item.locationId, item.productId, page]);
  const exportHref = `/api/admin/inventario/kardex/export?productId=${encodeURIComponent(item.productId)}&locationId=${encodeURIComponent(item.locationId)}`;
  return (
    <div
      className="fixed inset-0 z-[65] bg-[#102a43]/25"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kardex-title"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar Kardex"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[720px] flex-col bg-white shadow-[-16px_0_42px_rgba(16,42,67,0.18)]">
        <div className="flex items-start gap-3 border-b border-[#edf2f6] px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[9px] font-extrabold text-[#2277ee]">
              {item.sku} · {item.locationCode}
            </p>
            <h2 id="kardex-title" className="mt-1 truncate text-[16px] font-black text-[#102a43]">
              Kardex de {item.productName}
            </h2>
            <p className="mt-1 text-[10px] text-[#71869c]">
              {item.locationName} · disponible actual {number(item.available)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <a
              href={exportHref}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dce6ee] px-2.5 text-[9px] font-extrabold text-[#2277ee] hover:border-[#a6c5e0]"
            >
              <Download className="h-3 w-3" />
              CSV
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#71869c] hover:bg-[#f4f7fa]"
              aria-label="Cerrar Kardex"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-5">
          {error ? (
            <p className="rounded-lg border border-[#ffd1d1] bg-[#fff2f2] p-3 text-[10px] font-bold text-[#c94040]">
              {error}
            </p>
          ) : null}
          {!payload && !error ? (
            <div className="flex items-center gap-2 text-[10px] text-[#71869c]">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando movimientos persistidos…
            </div>
          ) : null}
          {payload ? (
            <>
              <div className="mb-4 flex items-center justify-between rounded-lg border border-[#edf2f6] bg-[#fbfcfd] px-3 py-2 text-[10px] text-[#71869c]">
                <span>{number(payload.totalItems)} movimientos históricos</span>
                <span className="font-extrabold text-[#304b66]">
                  Página {payload.page} de {payload.totalPages} · {payload.pageSize} por página
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="border-b border-[#e9eff4] text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#7d91a5]">
                    <tr>
                      <th className="px-2 py-2">Movimiento</th>
                      <th className="px-2 py-2">Entrada</th>
                      <th className="px-2 py-2">Salida</th>
                      <th className="px-2 py-2">Reservado</th>
                      <th className="px-2 py-2">Stock antes</th>
                      <th className="px-2 py-2">Stock después</th>
                      <th className="px-2 py-2">Disponible</th>
                      <th className="px-2 py-2">Usuario / referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.items.map((movement) => (
                      <tr
                        key={movement.id}
                        className="border-b border-[#f0f4f7] align-top text-[9px] text-[#526b84]"
                      >
                        <td className="px-2 py-3">
                          <strong className="block text-[10px] text-[#304b66]">
                            {movement.label}
                          </strong>
                          <span className="mt-1 block text-[#8296a9]">
                            {dateTime(movement.createdAt)}
                          </span>
                          {movement.reason ? (
                            <span className="mt-1 block">Motivo: {movement.reason}</span>
                          ) : null}
                          {movement.notes ? (
                            <span className="mt-1 block text-[#8296a9]">{movement.notes}</span>
                          ) : null}
                        </td>
                        <td className="px-2 py-3 font-black text-[#13895a]">
                          {movement.entry ? `+${number(movement.entry)}` : "—"}
                        </td>
                        <td className="px-2 py-3 font-black text-[#c94040]">
                          {movement.exit ? `-${number(movement.exit)}` : "—"}
                        </td>
                        <td className="px-2 py-3">
                          {movement.reservedDelta > 0
                            ? `+${movement.reservedDelta}`
                            : movement.reservedDelta || "—"}
                        </td>
                        <td className="px-2 py-3 font-semibold text-[#526b84]">
                          {number(movement.previousOnHand)}
                        </td>
                        <td className="px-2 py-3 font-black text-[#304b66]">
                          {number(movement.resultingOnHand)}
                        </td>
                        <td className="px-2 py-3 font-black text-[#304b66]">
                          {number(movement.availableAfter)}
                        </td>
                        <td className="px-2 py-3">
                          <span className="block font-semibold text-[#304b66]">
                            {movement.actorName || "Sistema"}
                          </span>
                          <span className="mt-1 block text-[#8296a9]">
                            {movement.referenceLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!payload.items.length ? (
                  <p className="py-8 text-center text-[10px] text-[#8296a9]">
                    No hay movimientos para este producto y local.
                  </p>
                ) : null}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[#edf2f6] pt-3">
                <span className="text-[9px] text-[#8296a9]">
                  Página {payload.page} de {payload.totalPages}
                </span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    disabled={payload.page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-md border border-[#dce6ee] px-2 py-1 text-[9px] font-extrabold text-[#526b84] disabled:opacity-35"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={payload.page >= payload.totalPages}
                    onClick={() => setPage((current) => Math.min(payload.totalPages, current + 1))}
                    className="rounded-md border border-[#dce6ee] px-2 py-1 text-[9px] font-extrabold text-[#526b84] disabled:opacity-35"
                  >
                    Siguiente
                  </button>
                </span>
              </div>
            </>
          ) : null}
        </div>
        <div className="border-t border-[#edf2f6] px-5 py-3">
          <p className="text-[9px] text-[#8296a9]">
            El Kardex es inmutable y se consulta desde los movimientos persistidos.
          </p>
        </div>
      </aside>
    </div>
  );
}

type OperationsTab = "movements" | "transfers" | "reservations" | "minimums" | "imports";

function InventoryOperationsTabs({
  data,
  permissions,
  onSuccess,
}: {
  data: InventoryAdminPageData;
  permissions: PermissionSet;
  onSuccess: () => void;
}) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab: OperationsTab =
    requestedTab === "transfers" ||
    requestedTab === "reservations" ||
    requestedTab === "minimums" ||
    requestedTab === "imports"
      ? requestedTab
      : "movements";
  const [tab, setTab] = useState<OperationsTab>(initialTab);
  const [globalMovementsOpen, setGlobalMovementsOpen] = useState(false);
  const [pending, setPending] = useState<{
    id: string;
    message: string;
    run: () => Promise<unknown>;
  } | null>(null);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const ask = (id: string, confirmation: string, run: () => Promise<unknown>) => {
    setMessage("");
    setPending({ id, message: confirmation, run });
  };
  const execute = async () => {
    if (!pending) return;
    setBusyId(pending.id);
    try {
      await pending.run();
      setPending(null);
      onSuccess();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar la operación.");
    } finally {
      setBusyId("");
    }
  };
  const tabs: Array<{ id: OperationsTab; label: string; count: number }> = [
    { id: "movements", label: "Movimientos", count: data.operations.movements.length },
    { id: "transfers", label: "Transferencias", count: data.operations.transfers.length },
    { id: "reservations", label: "Reservas", count: data.operations.reservations.length },
    { id: "minimums", label: "Mínimos", count: data.operations.minimums.length },
    { id: "imports", label: "Importaciones", count: data.operations.imports.length },
  ];
  return (
    <section id="inventory-operations" className={`${panel} scroll-mt-4 overflow-hidden`}>
      <div
        className="flex items-center gap-2 overflow-x-auto border-b border-[#edf2f6] px-3 pt-2"
        role="tablist"
        aria-label="Operaciones de inventario"
      >
        {tabs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            onClick={() => {
              setTab(entry.id);
              setPending(null);
              setMessage("");
            }}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-[10px] font-extrabold transition ${tab === entry.id ? "border-[#2277ee] text-[#2277ee]" : "border-transparent text-[#8296a9] hover:text-[#526b84]"}`}
          >
            {entry.label}
            <span
              className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[8px] ${tab === entry.id ? "bg-[#e8f1ff] text-[#2277ee]" : "bg-[#f3f6f8] text-[#8296a9]"}`}
            >
              {number(entry.count)}
            </span>
          </button>
        ))}
      </div>
      {pending ? (
        <div
          className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#ffe0ae] bg-[#fffaf1] px-3 py-3 text-[10px] text-[#6b542f]"
          role="alertdialog"
          aria-label="Confirmar operación"
        >
          <span>{pending.message}</span>
          <span className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setPending(null)}
              className="rounded-md border border-[#ead8b9] bg-white px-3 py-1.5 font-extrabold text-[#6b542f]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void execute()}
              disabled={Boolean(busyId)}
              className="rounded-md bg-[#102a43] px-3 py-1.5 font-extrabold text-white disabled:opacity-50"
            >
              {busyId ? "Procesando…" : "Confirmar"}
            </button>
          </span>
        </div>
      ) : null}
      {message ? (
        <p
          className="mx-4 mt-4 rounded-lg border border-[#ffd1d1] bg-[#fff2f2] px-3 py-2 text-[10px] font-bold text-[#c94040]"
          role="alert"
        >
          {message}
        </p>
      ) : null}
      {permissions.canKardex && tab === "movements" ? (
        <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-lg border border-[#dce6ee] bg-[#fbfcfd] px-3 py-2.5">
          <span className="text-[9px] text-[#71869c]">
            Consulta el historial completo con filtros y paginación.
          </span>
          <button
            type="button"
            onClick={() => setGlobalMovementsOpen(true)}
            className="inline-flex h-8 shrink-0 items-center gap-2 rounded-md border border-[#c9dcff] bg-white px-2.5 text-[9px] font-extrabold text-[#2277ee]"
          >
            <FileClock className="h-3.5 w-3.5" />
            Movimientos globales
          </button>
        </div>
      ) : null}
      <div className="p-4" role="tabpanel">
        {tab === "movements" ? (
          <div className="grid gap-2">
            {data.operations.movements.map((movement) => (
              <div
                key={movement.id}
                className="grid gap-2 rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-3 lg:grid-cols-[minmax(180px,1.3fr)_minmax(180px,1fr)_90px_120px]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#e8f1ff] px-1.5 py-1 text-[8px] font-extrabold text-[#2277ee]">
                      {movement.label}
                    </span>
                    <span className="font-mono text-[8px] text-[#8296a9]">{movement.sku}</span>
                  </div>
                  <p className="mt-1 truncate text-[10px] font-extrabold text-[#304b66]">
                    {movement.productName}
                  </p>
                  <p className="mt-1 text-[9px] text-[#8296a9]">
                    {movement.locationCode} · {movement.locationName}
                  </p>
                </div>
                <div className="text-[9px] text-[#71869c]">
                  <p>
                    <span className="font-extrabold text-[#526b84]">Referencia:</span>{" "}
                    {movement.referenceLabel}
                  </p>
                  <p className="mt-1">
                    <span className="font-extrabold text-[#526b84]">Actor:</span>{" "}
                    {movement.actorName || "Sistema"}
                  </p>
                  {movement.reason ? <p className="mt-1 truncate">{movement.reason}</p> : null}
                </div>
                <div className="text-[10px] font-black">
                  <span className="block text-[#13895a]">
                    {movement.entry ? `+${number(movement.entry)}` : "—"}
                  </span>
                  <span className="mt-1 block text-[#c94040]">
                    {movement.exit ? `-${number(movement.exit)}` : "—"}
                  </span>
                  {movement.reservedDelta ? (
                    <span className="mt-1 block text-[#8057e8]">
                      Res. {movement.reservedDelta > 0 ? "+" : ""}
                      {number(movement.reservedDelta)}
                    </span>
                  ) : null}
                </div>
                <div className="text-[9px] text-[#8296a9] lg:text-right">
                  {dateTime(movement.createdAt)}
                </div>
              </div>
            ))}
            {!data.operations.movements.length ? (
              <OperationEmpty text="No hay movimientos recientes persistidos." />
            ) : null}
          </div>
        ) : null}
        {tab === "transfers" ? (
          <div className="grid gap-2">
            {data.operations.transfers.map((transfer) => (
              <div
                key={transfer.id}
                className="grid gap-3 rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-3 lg:grid-cols-[minmax(180px,1.2fr)_minmax(190px,1fr)_90px_minmax(180px,1fr)]"
              >
                <div>
                  <p className="font-mono text-[9px] font-extrabold text-[#2277ee]">
                    {transfer.id}
                  </p>
                  <p className="mt-1 text-[10px] font-extrabold text-[#304b66]">
                    {transfer.sourceCode} → {transfer.destinationCode}
                  </p>
                  <p className="mt-1 text-[9px] text-[#8296a9]">
                    {transfer.sourceName} → {transfer.destinationName}
                  </p>
                </div>
                <div className="text-[9px] text-[#71869c]">
                  <p>
                    {number(transfer.itemCount)} referencias · {number(transfer.units)} unidades
                  </p>
                  <p className="mt-1">
                    Solicitado por: {transfer.requestedByName || "Sin asignar"}
                  </p>
                  {transfer.notes ? <p className="mt-1 truncate">{transfer.notes}</p> : null}
                </div>
                <div>
                  <span
                    className={`inline-flex rounded-md border px-2 py-1 text-[8px] font-extrabold ${transferStatusClass(transfer.status)}`}
                  >
                    {transferStatusLabels[transfer.status] || "Estado"}
                  </span>
                </div>
                <div className="flex flex-wrap items-start justify-between gap-2 lg:justify-end">
                  <span className="text-[9px] text-[#8296a9]">{dateTime(transfer.updatedAt)}</span>
                  {permissions.canTransfer ? (
                    <div className="flex flex-wrap justify-end gap-1">
                      {transfer.status === "DRAFT" ? (
                        <button
                          type="button"
                          onClick={() =>
                            ask(
                              `${transfer.id}:request`,
                              "Se solicitará este traslado para su envío. ¿Deseas continuar?",
                              () =>
                                patchJson(`/api/admin/inventario/transferencias/${transfer.id}`, {
                                  status: "REQUESTED",
                                }),
                            )
                          }
                          className="rounded-md border border-[#c9dcff] px-2 py-1.5 text-[8px] font-extrabold text-[#2277ee]"
                        >
                          Solicitar
                        </button>
                      ) : null}
                      {transfer.status === "REQUESTED" ? (
                        <button
                          type="button"
                          onClick={() =>
                            ask(
                              `${transfer.id}:send`,
                              `Al enviar se descontarán ${number(transfer.units)} unidades del local origen. ¿Confirmas?`,
                              () =>
                                patchJson(`/api/admin/inventario/transferencias/${transfer.id}`, {
                                  status: "IN_TRANSIT",
                                }),
                            )
                          }
                          className="rounded-md bg-[#2277ee] px-2 py-1.5 text-[8px] font-extrabold text-white"
                        >
                          Enviar
                        </button>
                      ) : null}
                      {transfer.status === "IN_TRANSIT" ? (
                        <button
                          type="button"
                          onClick={() =>
                            ask(
                              `${transfer.id}:receive`,
                              `Al recibir se agregarán ${number(transfer.units)} unidades al local destino. ¿Confirmas?`,
                              () =>
                                postJson(
                                  `/api/admin/inventario/transferencias/${transfer.id}/recibir`,
                                  {},
                                ),
                            )
                          }
                          className="rounded-md bg-[#159263] px-2 py-1.5 text-[8px] font-extrabold text-white"
                        >
                          Registrar recepción
                        </button>
                      ) : null}
                      {transfer.status === "DRAFT" ||
                      transfer.status === "REQUESTED" ||
                      transfer.status === "IN_TRANSIT" ? (
                        <button
                          type="button"
                          onClick={() =>
                            ask(
                              `${transfer.id}:cancel`,
                              "Se cancelará el traslado y, si estaba en tránsito, se generará el contramovimiento. ¿Confirmas?",
                              () =>
                                patchJson(`/api/admin/inventario/transferencias/${transfer.id}`, {
                                  status: "CANCELLED",
                                }),
                            )
                          }
                          className="rounded-md border border-[#ffd1d1] px-2 py-1.5 text-[8px] font-extrabold text-[#c94040]"
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {!data.operations.transfers.length ? (
              <OperationEmpty text="No hay traslados registrados." />
            ) : null}
          </div>
        ) : null}
        {tab === "reservations" ? (
          <div className="grid gap-2">
            {data.operations.reservations.map((reservation) => (
              <div
                key={reservation.id}
                className="grid gap-3 rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-3 lg:grid-cols-[minmax(180px,1.2fr)_minmax(180px,1fr)_90px_minmax(180px,1fr)]"
              >
                <div>
                  <p className="font-mono text-[9px] font-extrabold text-[#2277ee]">
                    {reservation.sku}
                  </p>
                  <p className="mt-1 truncate text-[10px] font-extrabold text-[#304b66]">
                    {reservation.productName}
                  </p>
                  <p className="mt-1 text-[9px] text-[#8296a9]">
                    {reservation.locationCode} · {reservation.locationName} ·{" "}
                    {number(reservation.quantity)} unidades
                  </p>
                </div>
                <div className="text-[9px] text-[#71869c]">
                  <p>
                    <span className="font-extrabold text-[#526b84]">
                      {reservationReferenceLabels[reservation.referenceType || ""] || "Referencia"}:
                    </span>{" "}
                    {reservation.referenceId || "Sin código"}
                  </p>
                  <p className="mt-1">{reservation.reason || "Sin motivo adicional"}</p>
                  <p className="mt-1">Expira: {dateTime(reservation.expiresAt)}</p>
                </div>
                <div>
                  <span
                    className={`inline-flex rounded-md border px-2 py-1 text-[8px] font-extrabold ${reservationStatusClass(reservation.status)}`}
                  >
                    {reservationStatusLabels[reservation.status] || "Estado"}
                  </span>
                </div>
                <div className="flex flex-wrap items-start justify-between gap-2 lg:justify-end">
                  <span className="text-[9px] text-[#8296a9]">
                    {reservation.createdByName || "Sistema"} · {dateTime(reservation.createdAt)}
                  </span>
                  {permissions.canReserve && reservation.status === "ACTIVE" ? (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          ask(
                            `${reservation.id}:release`,
                            "La reserva se liberará y devolverá unidades al disponible. ¿Confirmas?",
                            () =>
                              postJson(
                                `/api/admin/inventario/reservas/${reservation.id}/liberar`,
                                {},
                              ),
                          )
                        }
                        className="rounded-md border border-[#dce6ee] px-2 py-1.5 text-[8px] font-extrabold text-[#526b84]"
                      >
                        Liberar
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          ask(
                            `${reservation.id}:consume`,
                            `Se descontarán físicamente ${number(reservation.quantity)} unidades y se cerrará la reserva. ¿Confirmas?`,
                            () =>
                              postJson(
                                `/api/admin/inventario/reservas/${reservation.id}/consumir`,
                                {},
                              ),
                          )
                        }
                        className="rounded-md bg-[#102a43] px-2 py-1.5 text-[8px] font-extrabold text-white"
                      >
                        Consumir
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {!data.operations.reservations.length ? (
              <OperationEmpty text="No hay reservas registradas." />
            ) : null}
          </div>
        ) : null}
        {tab === "minimums" ? (
          <div className="grid gap-2">
            {data.operations.minimums.map((minimum) => (
              <div
                key={minimum.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[9px] font-extrabold text-[#2277ee]">
                    {minimum.sku}
                  </p>
                  <p className="mt-1 truncate text-[10px] font-extrabold text-[#304b66]">
                    {minimum.productName}
                  </p>
                  <p className="mt-1 text-[9px] text-[#8296a9]">
                    {minimum.locationCode} · {minimum.locationName}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-right text-[9px]">
                  <span>
                    <small className="block text-[#8296a9]">Disponible</small>
                    <b className="text-[#159263]">{number(minimum.available)}</b>
                  </span>
                  <span>
                    <small className="block text-[#8296a9]">Mínimo</small>
                    <b className="text-[#526b84]">
                      {minimum.minimumStock === null ? "—" : number(minimum.minimumStock)}
                    </b>
                  </span>
                  <span
                    className={`rounded-md border px-2 py-1 text-[8px] font-extrabold ${statusClass(minimum.status)}`}
                  >
                    {inventoryStatusLabels[minimum.status]}
                  </span>
                </div>
              </div>
            ))}
            {!data.operations.minimums.length ? (
              <OperationEmpty text="No hay mínimos configurados; NULL significa sin mínimo." />
            ) : (
              <p className="pt-1 text-[9px] text-[#8296a9]">
                Un mínimo de 0 es válido y no equivale a NULL (sin mínimo).
              </p>
            )}
          </div>
        ) : null}
        {tab === "imports" ? (
          <div className="grid gap-2">
            {data.operations.imports.map((batch) => (
              <div
                key={batch.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-3"
              >
                <div>
                  <p className="font-mono text-[9px] font-extrabold text-[#2277ee]">{batch.id}</p>
                  <p className="mt-1 text-[10px] font-extrabold text-[#304b66]">
                    {batch.filename || batch.source}
                  </p>
                  <p className="mt-1 text-[9px] text-[#8296a9]">
                    {number(batch.rowsRead)} filas · {number(batch.matched)} coincidentes ·{" "}
                    {number(batch.unmatched)} sin SKU · {number(batch.ambiguous)} ambiguas
                  </p>
                </div>
                <div className="text-right text-[9px] text-[#8296a9]">
                  <span className="inline-flex rounded-md border border-[#dce6ee] bg-white px-2 py-1 font-extrabold text-[#526b84]">
                    {importStatusLabels[batch.status] || batch.status}
                  </span>
                  <p className="mt-1">{dateTime(batch.completedAt || batch.createdAt)}</p>
                </div>
              </div>
            ))}
            {!data.operations.imports.length ? (
              <OperationEmpty text="Aún no hay lotes de importación. La importación inicial requiere vista previa y confirmación." />
            ) : null}
          </div>
        ) : null}
      </div>
      {globalMovementsOpen ? (
        <GlobalMovementsDrawer
          locations={data.locations}
          onClose={() => setGlobalMovementsOpen(false)}
        />
      ) : null}
    </section>
  );
}

function OperationEmpty({ text }: { text: string }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-lg border border-dashed border-[#dce6ee] px-4 py-8 text-center">
      <Truck className="h-5 w-5 text-[#b4c1cd]" />
      <p className="text-[10px] font-extrabold text-[#526b84]">{text}</p>
    </div>
  );
}

function Filters({
  filters,
  data,
}: {
  filters: InventoryAdminFilters;
  data: InventoryAdminPageData;
}) {
  const router = useRouter();
  const [advancedOpen, setAdvancedOpen] = useState(
    Boolean(
      filters.hasReservations !== undefined ||
      filters.hasMinimum !== undefined ||
      filters.minAvailable !== undefined ||
      filters.updatedFrom ||
      filters.updatedTo,
    ),
  );
  const [isPending, startTransition] = useTransition();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of [
      "query",
      "locationId",
      "categoryId",
      "familyId",
      "brandId",
      "status",
      "hasReservations",
      "hasMinimum",
      "minAvailable",
      "updatedFrom",
      "updatedTo",
    ]) {
      const value = form.get(key);
      if (typeof value === "string" && value) params.set(key, value);
    }
    params.set("page", "1");
    params.set("pageSize", String(data.pageSize));
    startTransition(() => router.push("/admin/inventario?" + params.toString()));
  };
  const advancedCount = [
    filters.hasReservations !== undefined,
    filters.hasMinimum !== undefined,
    filters.minAvailable !== undefined,
    Boolean(filters.updatedFrom),
    Boolean(filters.updatedTo),
  ].filter(Boolean).length;
  const locationLabel = data.facets.locations.find(
    (location) => location.id === filters.locationId,
  );
  const categoryLabel = data.facets.categories.find(
    (category) => category.id === filters.categoryId,
  );
  const familyLabel = data.facets.families.find((family) => family.id === filters.familyId);
  const brandLabel = data.facets.brands.find((brand) => brand.id === filters.brandId);
  const activeFilters: Array<{ key: string; label: string }> = [
    filters.query ? { key: "query", label: "Búsqueda: " + filters.query } : null,
    locationLabel ? { key: "locationId", label: "Local: " + locationLabel.code } : null,
    categoryLabel ? { key: "categoryId", label: "Categoría: " + categoryLabel.name } : null,
    familyLabel ? { key: "familyId", label: "Familia: " + familyLabel.name } : null,
    brandLabel ? { key: "brandId", label: "Marca: " + brandLabel.name } : null,
    filters.status
      ? { key: "status", label: "Estado: " + inventoryStatusLabels[filters.status] }
      : null,
    filters.hasReservations !== undefined
      ? { key: "hasReservations", label: filters.hasReservations ? "Con reservas" : "Sin reservas" }
      : null,
    filters.hasMinimum !== undefined
      ? { key: "hasMinimum", label: filters.hasMinimum ? "Con mínimo" : "Sin mínimo" }
      : null,
    filters.minAvailable !== undefined
      ? { key: "minAvailable", label: "Disponible ≥ " + number(filters.minAvailable) }
      : null,
    filters.updatedFrom ? { key: "updatedFrom", label: "Desde: " + filters.updatedFrom } : null,
    filters.updatedTo ? { key: "updatedTo", label: "Hasta: " + filters.updatedTo } : null,
  ].filter((filter): filter is { key: string; label: string } => filter !== null);
  const clearFilter = (key: string) => {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(filters))
      if (
        name !== key &&
        value !== undefined &&
        value !== "" &&
        name !== "page" &&
        name !== "pageSize"
      )
        params.set(name, String(value));
    params.set("page", "1");
    params.set("pageSize", String(data.pageSize));
    startTransition(() => router.push("/admin/inventario?" + params.toString()));
  };
  return (
    <form onSubmit={submit} className={panel + " p-3"}>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[220px] flex-1 text-[10px] font-extrabold text-[#526b84]">
          Buscar SKU, nombre o atributo
          <div className="relative mt-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8aa0b6]"
              aria-hidden="true"
            />
            <input
              defaultValue={filters.query ?? ""}
              name="query"
              placeholder="SKU, modelo, refrigerante, voltaje…"
              className="h-10 w-full rounded-lg border border-[#dce6ee] pl-9 pr-3 text-[11px] font-semibold text-[#304b66] outline-none placeholder:text-[#a1afbd] focus:border-[#2277ee]"
            />
          </div>
        </label>
        <label className="grid min-w-[145px] gap-1 text-[10px] font-extrabold text-[#526b84]">
          Local
          <select
            name="locationId"
            defaultValue={filters.locationId ?? ""}
            className="h-10 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-semibold text-[#526b84]"
          >
            <option value="">Todos los locales</option>
            {data.facets.locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.code} · {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-[145px] gap-1 text-[10px] font-extrabold text-[#526b84]">
          Categoría
          <select
            name="categoryId"
            defaultValue={filters.categoryId ?? ""}
            className="h-10 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-semibold text-[#526b84]"
          >
            <option value="">Todas las categorías</option>
            {data.facets.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-[145px] gap-1 text-[10px] font-extrabold text-[#526b84]">
          Familia
          <select
            name="familyId"
            defaultValue={filters.familyId ?? ""}
            className="h-10 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-semibold text-[#526b84]"
          >
            <option value="">Todas las familias</option>
            {data.facets.families.map((family) => (
              <option key={family.id} value={family.id}>
                {family.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-[145px] gap-1 text-[10px] font-extrabold text-[#526b84]">
          Marca
          <select
            name="brandId"
            defaultValue={filters.brandId ?? ""}
            className="h-10 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-semibold text-[#526b84]"
          >
            <option value="">Todas las marcas</option>
            {data.facets.brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-[130px] gap-1 text-[10px] font-extrabold text-[#526b84]">
          Estado
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="h-10 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-semibold text-[#526b84]"
          >
            <option value="">Todos los estados</option>
            {data.facets.statuses.map((status) => (
              <option key={status} value={status}>
                {inventoryStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setAdvancedOpen((value) => !value)}
          aria-expanded={advancedOpen}
          aria-controls="inventory-advanced-filters"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-extrabold text-[#526b84]"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Más filtros
          {advancedCount ? (
            <span className="rounded-full bg-[#e8f1ff] px-1.5 py-0.5 text-[8px] text-[#2277ee]">
              {advancedCount}
            </span>
          ) : null}
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2277ee] px-3.5 text-[10px] font-extrabold text-white disabled:opacity-60"
        >
          <Filter className="h-3.5 w-3.5" />
          {isPending ? "Aplicando…" : "Aplicar"}
        </button>
        <button
          type="button"
          onClick={() => startTransition(() => router.push("/admin/inventario"))}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-[#dce6ee] px-3 text-[10px] font-extrabold text-[#526b84]"
        >
          Limpiar
        </button>
      </div>
      {advancedOpen ? (
        <div
          id="inventory-advanced-filters"
          className="mt-3 grid gap-2 border-t border-[#edf2f6] pt-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Reservas
            <select
              name="hasReservations"
              defaultValue={
                filters.hasReservations === undefined ? "" : String(filters.hasReservations)
              }
              className="h-10 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-semibold text-[#526b84]"
            >
              <option value="">Con o sin reservas</option>
              <option value="true">Con reservas</option>
              <option value="false">Sin reservas</option>
            </select>
          </label>
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Mínimo configurado
            <select
              name="hasMinimum"
              defaultValue={filters.hasMinimum === undefined ? "" : String(filters.hasMinimum)}
              className="h-10 rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] font-semibold text-[#526b84]"
            >
              <option value="">Con o sin mínimo</option>
              <option value="true">Con mínimo</option>
              <option value="false">Sin mínimo</option>
            </select>
          </label>
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Disponible mínimo
            <input
              name="minAvailable"
              type="number"
              min="0"
              step="1"
              defaultValue={filters.minAvailable ?? ""}
              placeholder="Ej. 5"
              className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-semibold text-[#526b84]"
            />
          </label>
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Actualizado desde
            <input
              name="updatedFrom"
              type="date"
              defaultValue={filters.updatedFrom ?? ""}
              className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-semibold text-[#526b84]"
            />
          </label>
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Actualizado hasta
            <input
              name="updatedTo"
              type="date"
              defaultValue={filters.updatedTo ?? ""}
              className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-semibold text-[#526b84]"
            />
          </label>
        </div>
      ) : null}
      {activeFilters.length ? (
        <div
          className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[#edf2f6] pt-3"
          aria-label="Filtros activos"
        >
          <span className="mr-1 text-[9px] font-extrabold text-[#8296a9]">Filtros activos</span>
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => clearFilter(filter.key)}
              className="inline-flex items-center gap-1 rounded-full border border-[#c9dcff] bg-[#f4f8ff] px-2.5 py-1 text-[9px] font-extrabold text-[#2277ee]"
              aria-label={"Quitar " + filter.label}
            >
              {filter.label}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}

function Pagination({
  data,
  filters,
}: {
  data: InventoryAdminPageData;
  filters: InventoryAdminFilters;
}) {
  const router = useRouter();
  const href = (page: number, pageSize = data.pageSize) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters))
      if (value !== undefined && value !== "" && key !== "page" && key !== "pageSize")
        params.set(key, String(value));
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return `/admin/inventario?${params.toString()}`;
  };
  const pages = Array.from(
    new Set(
      [1, data.page - 1, data.page, data.page + 1, data.totalPages].filter(
        (value) => value >= 1 && value <= data.totalPages,
      ),
    ),
  );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf2f6] px-4 py-3 text-[9px] font-semibold text-[#8296a9]">
      <span>
        Mostrando {data.totalItems ? (data.page - 1) * data.pageSize + 1 : 0}–
        {Math.min(data.page * data.pageSize, data.totalItems)} de {number(data.totalItems)} saldos
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={data.page <= 1}
          onClick={() => router.push(href(data.page - 1))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#dce6ee] text-[#526b84] disabled:opacity-35"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {pages.map((page) => (
          <button
            type="button"
            key={page}
            onClick={() => router.push(href(page))}
            aria-current={page === data.page ? "page" : undefined}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-[9px] font-extrabold ${page === data.page ? "bg-[#2277ee] text-white" : "border border-[#dce6ee] text-[#526b84]"}`}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          disabled={data.page >= data.totalPages}
          onClick={() => router.push(href(data.page + 1))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#dce6ee] text-[#526b84] disabled:opacity-35"
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <select
          aria-label="Saldos por página"
          value={String(data.pageSize)}
          onChange={(event) => router.push(href(1, Number(event.target.value)))}
          className="ml-2 h-7 rounded-md border border-[#dce6ee] bg-white px-2 text-[9px] font-extrabold text-[#526b84]"
        >
          {inventoryPageSizes.map((size) => (
            <option key={size} value={size}>
              {size} por página
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function InventoryAdminWorkspace({
  data,
  filters,
  permissions,
}: {
  data: InventoryAdminPageData;
  filters: InventoryAdminFilters;
  permissions: PermissionSet;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<
    "adjustment" | "transfer" | "reservation" | "minimum" | null
  >(null);
  const [dialogItem, setDialogItem] = useState<InventoryItem | null>(null);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [kardexItem, setKardexItem] = useState<InventoryItem | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const activeLocations = useMemo(
    () => data.locations.filter((location) => location.id),
    [data.locations],
  );
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters))
      if (value !== undefined && value !== "" && key !== "page" && key !== "pageSize")
        params.set(key, String(value));
    return "/api/admin/inventario/export?" + params.toString();
  }, [filters]);
  const openDialog = (
    kind: "adjustment" | "transfer" | "reservation" | "minimum",
    item?: InventoryItem,
  ) => {
    setDialogItem(item ?? null);
    setDialog(kind);
  };
  const refresh = () => {
    setDialog(null);
    setDialogItem(null);
    startRefresh(() => router.refresh());
  };
  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#2277ee]">
            Operaciones · inventario
          </p>
          <h1 className="mt-1 text-[25px] font-black tracking-[-0.03em] text-[#102a43] sm:text-[29px]">
            Gestión de inventario
          </h1>
          <p className="mt-2 max-w-2xl text-[11px] leading-5 text-[#71869c]">
            Saldos físicos, reservas y movimientos por local. El catálogo no se interpreta como
            stock.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => startRefresh(() => router.refresh())}
            disabled={isRefreshing}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-extrabold text-[#526b84] hover:border-[#b8cde0]"
          >
            {" "}
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          <a
            href={exportHref}
            download
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-extrabold text-[#526b84] hover:border-[#b8cde0]"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar
          </a>
          {permissions.canReserve ? (
            <button
              type="button"
              onClick={() => setDialog("reservation")}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-extrabold text-[#526b84]"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Reservar
            </button>
          ) : null}
          {permissions.canAdjust ? (
            <button
              type="button"
              onClick={() => setDialog("minimum")}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-extrabold text-[#526b84]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Mínimos
            </button>
          ) : null}
          {permissions.canTransfer ? (
            <button
              type="button"
              onClick={() => setDialog("transfer")}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-extrabold text-[#526b84]"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Transferir stock
            </button>
          ) : null}
          {permissions.canAdjust ? (
            <button
              type="button"
              onClick={() => setDialog("adjustment")}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#f58b20] px-3.5 text-[10px] font-extrabold text-white shadow-[0_6px_14px_rgba(245,139,32,0.2)] hover:bg-[#df7810]"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajustar inventario
            </button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={Boxes}
          label="Referencias con saldo"
          value={number(data.summary.referencesWithBalance)}
          note="Producto · local"
          tone="blue"
        />
        <MetricCard
          icon={Package}
          label="Disponible"
          value={number(data.summary.availableUnits)}
          note={`${number(data.summary.onHandUnits)} físico · ${number(data.summary.reservedUnits)} reservado`}
          tone="green"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Saldos críticos"
          value={number(data.summary.criticalBalances)}
          note="Con mínimo configurado"
          tone="red"
        />
        <MetricCard
          icon={MapPin}
          label="Locales activos"
          value={number(data.summary.activeLocations)}
          note="Ubicaciones operativas"
          tone="orange"
        />
        <MetricCard
          icon={CircleAlert}
          label="Alertas abiertas"
          value={number(
            data.alerts.counts.critical +
              data.alerts.counts.outOfStock +
              data.alerts.counts.expiringReservations,
          )}
          note={`${number(data.alerts.counts.pendingTransfers)} traslados pendientes`}
          tone="purple"
        />
      </div>
      <Filters filters={filters} data={data} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_292px]">
        <section className={`${panel} min-w-0 overflow-hidden`}>
          <div className="flex flex-wrap items-center gap-3 border-b border-[#edf2f6] px-4 py-3">
            <div>
              <h2 className="text-[13px] font-black text-[#304b66]">Saldos por referencia</h2>
              <p className="mt-1 text-[9px] text-[#8296a9]">
                Disponible = físico − reservado · actualizado desde PostgreSQL
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2 text-[9px] font-extrabold text-[#8296a9]">
              <FileClock className="h-3.5 w-3.5" />
              {dateTime(data.fetchedAt)}
            </div>
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[980px] text-left">
              <thead className="border-b border-[#e9eff4] bg-[#fbfcfd] text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#7d91a5]">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-3 py-3">Producto</th>
                  <th className="px-3 py-3">Local</th>
                  <th className="px-3 py-3 text-right">Físico</th>
                  <th className="px-3 py-3 text-right">Reservado</th>
                  <th className="px-3 py-3 text-right">Disponible</th>
                  <th className="px-3 py-3 text-right">Mínimo</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3">Último movimiento</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <InventoryRow
                    key={item.id}
                    item={item}
                    actions={{
                      onOpen: () => setDetailItem(item),
                      onKardex: permissions.canKardex ? () => setKardexItem(item) : undefined,
                      onRegister: permissions.canAdjust
                        ? () => openDialog("adjustment", item)
                        : undefined,
                      onMinimum: permissions.canAdjust
                        ? () => openDialog("minimum", item)
                        : undefined,
                      onReserve: permissions.canReserve
                        ? () => openDialog("reservation", item)
                        : undefined,
                      onTransfer: permissions.canTransfer
                        ? () => openDialog("transfer", item)
                        : undefined,
                    }}
                  />
                ))}
              </tbody>
            </table>
            {!data.items.length ? <EmptyInventory /> : null}
          </div>
          <div className="grid gap-2 p-3 lg:hidden">
            {data.items.map((item) => (
              <InventoryCard
                key={item.id}
                item={item}
                actions={{
                  onOpen: () => setDetailItem(item),
                  onKardex: permissions.canKardex ? () => setKardexItem(item) : undefined,
                  onRegister: permissions.canAdjust
                    ? () => openDialog("adjustment", item)
                    : undefined,
                  onMinimum: permissions.canAdjust ? () => openDialog("minimum", item) : undefined,
                  onReserve: permissions.canReserve
                    ? () => openDialog("reservation", item)
                    : undefined,
                  onTransfer: permissions.canTransfer
                    ? () => openDialog("transfer", item)
                    : undefined,
                }}
              />
            ))}
            {!data.items.length ? <EmptyInventory /> : null}
          </div>
          <Pagination data={data} filters={filters} />
        </section>
        <aside className="grid content-start gap-4">
          <LocationRail locations={activeLocations} />
          <AlertRail alerts={data.alerts} />
        </aside>
      </div>
      <InventoryOperationsTabs data={data} permissions={permissions} onSuccess={refresh} />
      {detailItem ? (
        <InventoryDetailDrawer
          item={detailItem}
          data={data}
          onClose={() => setDetailItem(null)}
          onKardex={() => {
            setDetailItem(null);
            setKardexItem(detailItem);
          }}
        />
      ) : null}
      {dialog === "adjustment" ? (
        <AdjustmentDialog
          locations={activeLocations}
          initialItem={dialogItem ?? undefined}
          onClose={() => {
            setDialog(null);
            setDialogItem(null);
          }}
          onSuccess={refresh}
        />
      ) : null}
      {dialog === "transfer" ? (
        <TransferDialog
          locations={activeLocations}
          initialItem={dialogItem ?? undefined}
          onClose={() => {
            setDialog(null);
            setDialogItem(null);
          }}
          onSuccess={refresh}
        />
      ) : null}
      {dialog === "reservation" ? (
        <ReservationDialog
          locations={activeLocations}
          initialItem={dialogItem ?? undefined}
          onClose={() => {
            setDialog(null);
            setDialogItem(null);
          }}
          onSuccess={refresh}
        />
      ) : null}
      {dialog === "minimum" ? (
        <MinimumDialog
          locations={activeLocations}
          initialItem={dialogItem ?? undefined}
          onClose={() => {
            setDialog(null);
            setDialogItem(null);
          }}
          onSuccess={refresh}
        />
      ) : null}
      {kardexItem ? (
        <KardexDrawer
          key={`${kardexItem.productId}-${kardexItem.locationId}`}
          item={kardexItem}
          onClose={() => setKardexItem(null)}
        />
      ) : null}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
  note: string;
  tone: "blue" | "green" | "red" | "orange" | "purple";
}) {
  const styles = {
    blue: ["bg-[#e8f1ff]", "text-[#2277ee]"],
    green: ["bg-[#e4f7ef]", "text-[#159263]"],
    red: ["bg-[#ffe8e8]", "text-[#ed4b4b]"],
    orange: ["bg-[#fff0e0]", "text-[#f58b20]"],
    purple: ["bg-[#eee9ff]", "text-[#8057e8]"],
  }[tone];
  return (
    <div className={`${panel} flex items-start gap-3 p-4`}>
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles[0]} ${styles[1]}`}
      >
        <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#8296a9]">
          {label}
        </p>
        <strong className="mt-1 block text-[22px] font-black tracking-[-0.04em] text-[#102a43]">
          {value}
        </strong>
        <p className="mt-1 truncate text-[9px] text-[#8296a9]">{note}</p>
      </div>
    </div>
  );
}

type RowActions = {
  onOpen: () => void;
  onKardex?: () => void;
  onRegister?: () => void;
  onMinimum?: () => void;
  onReserve?: () => void;
  onTransfer?: () => void;
};

function RowActionMenu({ actions }: { actions: RowActions }) {
  const [open, setOpen] = useState(false);
  const entries = [
    { label: "Ver detalle", action: actions.onOpen },
    { label: "Ver Kardex", action: actions.onKardex },
    { label: "Registrar movimiento", action: actions.onRegister },
    { label: "Configurar mínimo", action: actions.onMinimum },
    { label: "Reservar", action: actions.onReserve },
    { label: "Transferir", action: actions.onTransfer },
  ].filter((entry): entry is { label: string; action: () => void } => Boolean(entry.action));
  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#dce6ee] text-[13px] font-black tracking-[0.12em] text-[#526b84] hover:border-[#a6c5e0]"
        aria-label="Más acciones"
        aria-expanded={open}
      >
        ···
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Cerrar acciones"
          />
          <div className="absolute right-0 top-9 z-20 min-w-[180px] rounded-lg border border-[#dce6ee] bg-white p-1 text-left shadow-[0_12px_28px_rgba(16,42,67,0.14)]">
            {entries.map((entry) => (
              <button
                key={entry.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  entry.action();
                }}
                className="block w-full rounded-md px-3 py-2 text-[9px] font-extrabold text-[#526b84] hover:bg-[#f4f8fb]"
              >
                {entry.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function inventoryProductOption(item: InventoryItem): ProductOption {
  return { id: item.productId, sku: item.sku, name: item.productName, available: item.available };
}

function InventoryRow({ item, actions }: { item: InventoryItem; actions: RowActions }) {
  return (
    <tr className="border-b border-[#f0f4f7] text-[10px] transition hover:bg-[#fbfdff]">
      <td className="px-4 py-3 align-middle">
        <button
          type="button"
          onClick={actions.onOpen}
          className="font-mono text-[10px] font-extrabold text-[#2277ee]"
        >
          {item.sku}
        </button>
      </td>
      <td className="max-w-[280px] px-3 py-3 align-middle">
        <button
          type="button"
          onClick={actions.onOpen}
          className="flex w-full items-center gap-2.5 text-left"
        >
          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[#edf2f6] bg-[#f7f9fb]">
            <Image
              src={item.mediaUrl || "/images/product-placeholder-repuesto.svg"}
              alt=""
              fill
              sizes="36px"
              className="object-contain p-1"
              unoptimized
            />
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-[10px] font-extrabold text-[#304b66]">
              {item.productName}
            </strong>
            <span className="mt-1 block truncate text-[9px] text-[#8296a9]">{item.familyName}</span>
          </span>
        </button>
      </td>
      <td className="px-3 py-3">
        <button type="button" onClick={actions.onOpen} className="text-left">
          <span className="block text-[10px] font-extrabold text-[#304b66]">
            {item.locationCode}
          </span>
          <span className="mt-1 block text-[9px] text-[#8296a9]">{item.locationName}</span>
        </button>
      </td>
      <td
        className="px-3 py-3 text-right font-semibold text-[#304b66]"
        title="Unidades físicamente registradas"
      >
        {number(item.onHand)}
      </td>
      <td
        className="px-3 py-3 text-right font-semibold text-[#526b84]"
        title="Unidades comprometidas en reservas"
      >
        {number(item.reserved)}
      </td>
      <td
        className={`px-3 py-3 text-right text-[11px] font-black ${item.status === "CRITICO" || item.status === "AGOTADO" ? "text-[#c94040]" : "text-[#159263]"}`}
        title="Disponible = físico − reservado"
      >
        {number(item.available)}
      </td>
      <td
        className="px-3 py-3 text-right font-semibold text-[#526b84]"
        title={item.minimumStock === null ? "Sin mínimo configurado" : "Mínimo de alerta"}
      >
        {item.minimumStock === null ? "Sin mínimo" : number(item.minimumStock)}
      </td>
      <td className="px-3 py-3">
        <span
          className={`inline-flex rounded-md border px-2 py-1 text-[9px] font-extrabold ${statusClass(item.status)}`}
        >
          {inventoryStatusLabels[item.status]}
        </span>
      </td>
      <td className="max-w-[150px] px-3 py-3">
        <span className="block truncate text-[9px] font-extrabold text-[#526b84]">
          {item.lastMovementLabel || "Sin movimiento"}
        </span>
        <span className="mt-1 block truncate text-[8px] text-[#8296a9]">
          {dateTime(item.lastMovementAt)}
        </span>
      </td>
      <td className="px-3 py-3">
        <RowActionMenu actions={actions} />
      </td>
    </tr>
  );
}

function InventoryCard({ item, actions }: { item: InventoryItem; actions: RowActions }) {
  return (
    <article className="rounded-xl border border-[#edf2f6] bg-[#fbfcfd] p-3">
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={actions.onOpen}
          className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#edf2f6] bg-white"
        >
          <Image
            src={item.mediaUrl || "/images/product-placeholder-repuesto.svg"}
            alt="Abrir detalle"
            fill
            sizes="40px"
            className="object-contain p-1"
            unoptimized
          />
        </button>
        <button type="button" onClick={actions.onOpen} className="min-w-0 flex-1 text-left">
          <p className="truncate text-[10px] font-extrabold text-[#304b66]">{item.productName}</p>
          <p className="mt-1 font-mono text-[9px] text-[#8296a9]">
            {item.sku} · {item.locationCode}
          </p>
        </button>
        <span
          className={`shrink-0 rounded-md border px-2 py-1 text-[8px] font-extrabold ${statusClass(item.status)}`}
        >
          {inventoryStatusLabels[item.status]}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 border-t border-[#edf2f6] pt-3 text-center">
        <div>
          <span className="block text-[8px] text-[#8296a9]">Físico</span>
          <strong className="text-[11px] text-[#304b66]">{number(item.onHand)}</strong>
        </div>
        <div>
          <span className="block text-[8px] text-[#8296a9]">Reservado</span>
          <strong className="text-[11px] text-[#526b84]">{number(item.reserved)}</strong>
        </div>
        <div>
          <span className="block text-[8px] text-[#8296a9]">Disponible</span>
          <strong
            className={`text-[11px] ${item.status === "CRITICO" || item.status === "AGOTADO" ? "text-[#c94040]" : "text-[#159263]"}`}
          >
            {number(item.available)}
          </strong>
        </div>
        <div>
          <span className="block text-[8px] text-[#8296a9]">Mínimo</span>
          <strong className="text-[11px] text-[#526b84]">
            {item.minimumStock === null ? "—" : number(item.minimumStock)}
          </strong>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={actions.onOpen}
          className="h-8 flex-1 rounded-lg border border-[#dce6ee] text-[9px] font-extrabold text-[#526b84]"
        >
          Ver detalle
        </button>
        {actions.onKardex ? (
          <button
            type="button"
            onClick={actions.onKardex}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-[#dce6ee] text-[9px] font-extrabold text-[#2277ee]"
          >
            <FileClock className="h-3 w-3" />
            Kardex
          </button>
        ) : null}
      </div>
    </article>
  );
}

type DetailTab = "summary" | "kardex" | "reservations" | "transfers" | "configuration";

function InventoryDetailDrawer({
  item,
  data,
  onClose,
  onKardex,
}: {
  item: InventoryItem;
  data: InventoryAdminPageData;
  onClose: () => void;
  onKardex?: () => void;
}) {
  const [tab, setTab] = useState<DetailTab>("summary");
  const reservations = data.operations.reservations.filter(
    (entry) => entry.sku === item.sku && entry.locationCode === item.locationCode,
  );
  const movements = data.operations.movements.filter(
    (entry) => entry.sku === item.sku && entry.locationCode === item.locationCode,
  );
  return (
    <div
      className="fixed inset-0 z-[60] bg-[#102a43]/25"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-detail-title"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar detalle de inventario"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[560px] flex-col bg-white shadow-[-16px_0_42px_rgba(16,42,67,0.18)]">
        <div className="flex items-start gap-3 border-b border-[#edf2f6] px-5 py-4">
          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#edf2f6] bg-[#f7f9fb]">
            <Image
              src={item.mediaUrl || "/images/product-placeholder-repuesto.svg"}
              alt=""
              fill
              sizes="48px"
              className="object-contain p-1"
              unoptimized
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[9px] font-extrabold text-[#2277ee]">{item.sku}</p>
            <h2
              id="inventory-detail-title"
              className="mt-1 truncate text-[16px] font-black text-[#102a43]"
            >
              {item.productName}
            </h2>
            <p className="mt-1 text-[10px] text-[#71869c]">
              {item.locationCode} · {item.locationName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#71869c] hover:bg-[#f4f7fa]"
            aria-label="Cerrar detalle"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          className="flex gap-1 overflow-x-auto border-b border-[#edf2f6] px-3 pt-2"
          role="tablist"
          aria-label="Detalle de inventario"
        >
          {(
            [
              { id: "summary", label: "Resumen" },
              { id: "kardex", label: "Kardex" },
              { id: "reservations", label: "Reservas" },
              { id: "transfers", label: "Transferencias" },
              { id: "configuration", label: "Configuración" },
            ] as Array<{ id: DetailTab; label: string }>
          ).map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              onClick={() => setTab(entry.id)}
              className={`shrink-0 border-b-2 px-2.5 py-2.5 text-[9px] font-extrabold ${tab === entry.id ? "border-[#2277ee] text-[#2277ee]" : "border-transparent text-[#8296a9]"}`}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {tab === "summary" ? (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["Físico", number(item.onHand)],
                  ["Reservado", number(item.reserved)],
                  ["Disponible", number(item.available)],
                  ["Mínimo", item.minimumStock === null ? "Sin mínimo" : number(item.minimumStock)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-3">
                    <span className="block text-[9px] text-[#8296a9]">{label}</span>
                    <strong className="mt-1 block text-[15px] font-black text-[#304b66]">
                      {value}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-4">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#8296a9]">
                  Estado actual
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span
                    className={`rounded-md border px-2 py-1 text-[9px] font-extrabold ${statusClass(item.status)}`}
                  >
                    {inventoryStatusLabels[item.status]}
                  </span>
                  <span className="text-[9px] text-[#8296a9]">
                    Último movimiento: {dateTime(item.lastMovementAt)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-[#304b66]">Actividad reciente</p>
                {movements.slice(0, 3).map((movement) => (
                  <p key={movement.id} className="mt-2 text-[9px] text-[#71869c]">
                    {movement.label} ·{" "}
                    {movement.entry
                      ? `+${number(movement.entry)}`
                      : movement.exit
                        ? `-${number(movement.exit)}`
                        : `reserva ${number(movement.reservedDelta)}`}{" "}
                    · {dateTime(movement.createdAt)}
                  </p>
                ))}
                {!movements.length ? (
                  <p className="mt-2 text-[9px] text-[#8296a9]">
                    Sin movimientos recientes en el panel.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          {tab === "kardex" ? (
            <div className="grid gap-3">
              <p className="text-[10px] leading-5 text-[#71869c]">
                Consulta el Kardex inmutable por producto y local, con stock anterior/posterior,
                disponible, actor y referencia.
              </p>
              {onKardex ? (
                <button
                  type="button"
                  onClick={onKardex}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#102a43] px-4 text-[10px] font-extrabold text-white"
                >
                  <FileClock className="h-3.5 w-3.5" />
                  Abrir Kardex completo
                </button>
              ) : null}
            </div>
          ) : null}
          {tab === "reservations" ? (
            <div className="grid gap-2">
              {reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-md border px-2 py-1 text-[8px] font-extrabold ${reservationStatusClass(reservation.status)}`}
                    >
                      {reservationStatusLabels[reservation.status] || "Estado"}
                    </span>
                    <b className="text-[11px] text-[#304b66]">{number(reservation.quantity)} u.</b>
                  </div>
                  <p className="mt-2 text-[9px] text-[#71869c]">
                    {reservationReferenceLabels[reservation.referenceType || ""] || "Referencia"} ·{" "}
                    {reservation.referenceId || "Sin código"}
                  </p>
                  <p className="mt-1 text-[9px] text-[#8296a9]">
                    Expira: {dateTime(reservation.expiresAt)}
                    {reservation.reason ? ` · ${reservation.reason}` : ""}
                  </p>
                </div>
              ))}
              {!reservations.length ? (
                <OperationEmpty text="No hay reservas recientes para este producto y local." />
              ) : null}
            </div>
          ) : null}
          {tab === "transfers" ? (
            <div className="grid gap-3">
              <p className="text-[10px] leading-5 text-[#71869c]">
                Los traslados se muestran en el panel operativo y se procesan como movimientos
                atómicos por referencia.
              </p>
              {data.operations.transfers.length ? (
                data.operations.transfers.slice(0, 5).map((transfer) => (
                  <div
                    key={transfer.id}
                    className="rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[9px] font-extrabold text-[#2277ee]">
                        {transfer.id}
                      </span>
                      <span
                        className={`rounded-md border px-2 py-1 text-[8px] font-extrabold ${transferStatusClass(transfer.status)}`}
                      >
                        {transferStatusLabels[transfer.status] || "Estado"}
                      </span>
                    </div>
                    <p className="mt-1 text-[9px] text-[#71869c]">
                      {transfer.sourceCode} → {transfer.destinationCode} · {number(transfer.units)}{" "}
                      unidades
                    </p>
                  </div>
                ))
              ) : (
                <OperationEmpty text="No hay traslados recientes." />
              )}
            </div>
          ) : null}
          {tab === "configuration" ? (
            <div className="grid gap-3">
              <div className="rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-4">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#8296a9]">
                  Mínimo de alerta
                </p>
                <strong className="mt-1 block text-[20px] font-black text-[#304b66]">
                  {item.minimumStock === null ? "Sin mínimo" : number(item.minimumStock)}
                </strong>
                <p className="mt-2 text-[9px] leading-5 text-[#71869c]">
                  Un mínimo 0 es válido; NULL significa que no existe umbral configurado.
                </p>
              </div>
              <p className="text-[9px] text-[#8296a9]">
                La edición se realiza desde “Configurar mínimo” y no toca el físico ni el reservado.
              </p>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function EmptyInventory() {
  return (
    <div className="grid justify-items-center gap-2 px-4 py-12 text-center">
      <Package className="h-7 w-7 text-[#b4c1cd]" />
      <p className="text-[11px] font-extrabold text-[#526b84]">No hay saldos para estos filtros</p>
      <p className="max-w-xs text-[10px] leading-5 text-[#8296a9]">
        Los productos sin saldo siguen siendo desconocidos; no se convierten automáticamente en
        stock cero.
      </p>
    </div>
  );
}

function LocationDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("WAREHOUSE");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await postJson("/api/admin/inventario/locales", { code, name, type, address });
      onSuccess();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear el local.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <DialogFrame
      title="Nuevo local"
      description="Los locales son ubicaciones operativas; crear uno no genera saldos ni stock automáticamente."
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Código
            <input
              required
              maxLength={32}
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="ALM-LIM"
              className="h-10 rounded-lg border border-[#dce6ee] px-3 font-mono text-[11px] font-semibold text-[#304b66]"
            />
          </label>
          <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
            Tipo
            <select
              required
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-[11px] font-semibold text-[#304b66]"
            >
              <option value="WAREHOUSE">Almacén</option>
              <option value="STORE">Tienda</option>
              <option value="STORE_WAREHOUSE">Tienda y almacén</option>
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
          Nombre
          <input
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Almacén Lima"
            className="h-10 rounded-lg border border-[#dce6ee] px-3 text-[11px] font-semibold text-[#304b66]"
          />
        </label>
        <label className="grid gap-1 text-[10px] font-extrabold text-[#526b84]">
          Dirección (opcional)
          <input
            maxLength={240}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="h-10 rounded-lg border border-[#dce6ee] px-3 text-[11px] font-semibold text-[#304b66]"
          />
        </label>
        {message ? (
          <p
            className="rounded-lg border border-[#ffd1d1] bg-[#fff2f2] px-3 py-2 text-[10px] font-bold text-[#c94040]"
            role="alert"
          >
            {message}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 border-t border-[#edf2f6] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-[#dce6ee] px-4 text-[10px] font-extrabold text-[#526b84]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy || !code.trim() || !name.trim()}
            className="h-10 rounded-lg bg-[#102a43] px-4 text-[10px] font-extrabold text-white disabled:opacity-45"
          >
            {busy ? "Creando…" : "Crear local"}
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}

function LocationRail({ locations }: { locations: LocationSummary[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  return (
    <section className={`${panel} overflow-hidden`}>
      <div className="border-b border-[#edf2f6] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#f58b20]" />
            <h2 className="text-[12px] font-black text-[#304b66]">Resumen por local</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-md border border-[#dce6ee] px-2 py-1 text-[8px] font-extrabold text-[#2277ee]"
          >
            Gestionar
          </button>
        </div>
        <p className="mt-1 text-[9px] text-[#8296a9]">Capacidad comprometida y disponible</p>
      </div>
      <div className="grid gap-2 p-3">
        {locations.map((location) => (
          <div key={location.id} className="rounded-lg border border-[#edf2f6] p-3">
            <div className="flex items-center justify-between gap-2">
              <strong className="truncate text-[10px] text-[#304b66]">{location.name}</strong>
              <span className="font-mono text-[9px] font-extrabold text-[#8296a9]">
                {location.code}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="block text-[8px] text-[#8296a9]">Disp.</span>
                <b className="text-[11px] text-[#159263]">{number(location.availableUnits)}</b>
              </div>
              <div>
                <span className="block text-[8px] text-[#8296a9]">Reserv.</span>
                <b className="text-[11px] text-[#526b84]">{number(location.reservedUnits)}</b>
              </div>
              <div>
                <span className="block text-[8px] text-[#8296a9]">Críticos</span>
                <b
                  className={`text-[11px] ${location.criticalBalances ? "text-[#c94040]" : "text-[#526b84]"}`}
                >
                  {number(location.criticalBalances)}
                </b>
              </div>
            </div>
          </div>
        ))}
        {!locations.length ? (
          <div className="grid gap-2 p-3 text-center">
            <p className="text-[10px] text-[#8296a9]">Aún no hay locales activos registrados.</p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mx-auto rounded-md bg-[#102a43] px-3 py-2 text-[9px] font-extrabold text-white"
            >
              Crear local
            </button>
          </div>
        ) : null}
      </div>
      {showCreate ? (
        <LocationDialog
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}

function AlertRail({ alerts }: { alerts: InventoryAdminPageData["alerts"] }) {
  return (
    <section className={`${panel} overflow-hidden`}>
      <div className="border-b border-[#edf2f6] px-4 py-3">
        <div className="flex items-center gap-2">
          <CircleAlert className="h-4 w-4 text-[#ed4b4b]" />
          <h2 className="text-[12px] font-black text-[#304b66]">Alertas de atención</h2>
        </div>
        <p className="mt-1 text-[9px] text-[#8296a9]">
          Sin inventar disponibilidad para referencias desconocidas
        </p>
      </div>
      <div className="grid gap-2 p-3">
        {alerts.items.map((alert) => (
          <div key={alert.id} className="rounded-lg border border-[#ffdada] bg-[#fff9f9] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-mono text-[9px] font-extrabold text-[#304b66]">
                  {alert.sku}
                </p>
                <p className="mt-1 truncate text-[10px] font-bold text-[#526b84]">
                  {alert.productName}
                </p>
              </div>
              <span
                className={`rounded-md border px-1.5 py-1 text-[8px] font-extrabold ${statusClass(alert.status)}`}
              >
                {inventoryStatusLabels[alert.status]}
              </span>
            </div>
            <p className="mt-2 text-[9px] text-[#8296a9]">
              {alert.locationName} · {number(alert.available)} disponibles
              {alert.minimumStock === null
                ? " · sin mínimo"
                : ` · mínimo ${number(alert.minimumStock)}`}
            </p>
          </div>
        ))}
        {!alerts.items.length ? (
          <div className="grid justify-items-center gap-2 p-4 text-center">
            <Check className="h-5 w-5 text-[#159263]" />
            <p className="text-[10px] font-extrabold text-[#526b84]">Sin alertas de saldo</p>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2 border-t border-[#edf2f6] pt-3 text-center">
          <div>
            <span className="block text-[8px] text-[#8296a9]">Reservas por expirar</span>
            <b className="text-[12px] text-[#a15c00]">
              {number(alerts.counts.expiringReservations)}
            </b>
          </div>
          <div>
            <span className="block text-[8px] text-[#8296a9]">Traslados pendientes</span>
            <b className="text-[12px] text-[#2277ee]">{number(alerts.counts.pendingTransfers)}</b>
          </div>
        </div>
      </div>
    </section>
  );
}
