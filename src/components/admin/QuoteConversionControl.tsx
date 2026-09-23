"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDrawer } from "@/components/admin/AdminDrawer";

type QuoteLine = {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  baseUnitPrice: string | null;
  discountPercentage: string | null;
  discountAmount: string | null;
  finalUnitPrice: string | null;
  lineTotal: string | null;
  currency: string | null;
};
type Location = { id: string; name: string; address: string | null };
type Preview = {
  quote?: { trackingCode?: string | null };
  version?: {
    id: string;
    number: number;
    currency: string | null;
    subtotal: string | null;
    discountAmount: string | null;
    taxAmount: string | null;
    taxMode?: string | null;
    total: string | null;
    validUntil: string | null;
  };
  items?: QuoteLine[];
  locations?: Location[];
  existingSale?: { id: string; code: string } | null;
};
type ConversionResult = {
  sale: { id: string; code: string } | null;
  order: { id: string; code: string } | null;
};

const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20";

function readApiError(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
    if (typeof error === "object" && error !== null && "message" in error) {
      return String((error as { message?: unknown }).message ?? fallback);
    }
  }
  return fallback;
}

function formatMoney(currency: string | null | undefined, value: string | number | null | undefined) {
  if (!currency || value == null || !Number.isFinite(Number(value))) return "N/D";
  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `${currency} ${Number(value).toFixed(2)}`;
  }
}

export function QuoteConversionControl({
  quoteId,
  status,
  acceptedVersionId,
}: {
  quoteId: string;
  status: string;
  acceptedVersionId?: string | null;
}) {
  const eligible = status === "ACCEPTED" && Boolean(acceptedVersionId);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [locationId, setLocationId] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"PICKUP" | "DELIVERY" | "SHIPPING">("PICKUP");
  const [address, setAddress] = useState("");
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);

  async function openForm() {
    setOpen(true);
    setError("");
    if (preview) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/ventas?quoteId=${encodeURIComponent(quoteId)}`, {
        cache: "no-store",
      });
      const result = (await response.json()) as unknown;
      if (!response.ok) throw new Error(readApiError(result, "No se pudo cargar la cotización."));
      const data = result as Preview;
      setPreview(data);
      setLocationId(data.locations?.[0]?.id ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la cotización.");
    } finally {
      setLoading(false);
    }
  }

  async function convert() {
    const items = preview?.items ?? [];
    if (!locationId || !items.length || preview?.existingSale) return;
    if (deliveryMethod !== "PICKUP" && !address.trim()) {
      setError("La dirección es obligatoria para la entrega.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId,
          locationId,
          deliveryMethod,
          address: deliveryMethod === "PICKUP" ? null : address.trim(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(result, "No se pudo convertir la cotización."));
      const payload = result as {
        sale?: { id?: unknown; code?: unknown } | null;
        order?: { id?: unknown; code?: unknown } | null;
      };
      setConversionResult({
        sale:
          typeof payload.sale?.id === "string"
            ? { id: payload.sale.id, code: typeof payload.sale.code === "string" ? payload.sale.code : payload.sale.id }
            : null,
        order:
          typeof payload.order?.id === "string"
            ? { id: payload.order.id, code: typeof payload.order.code === "string" ? payload.order.code : payload.order.id }
            : null,
      });
      setOpen(false);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo convertir la cotización.");
    } finally {
      setSaving(false);
    }
  }

  if (!eligible) {
    return status === "ACCEPTED" ? (
      <span className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
        Requiere versión aceptada
      </span>
    ) : null;
  }

  if (conversionResult) {
    return (
      <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
        <span className="text-slate-500">Conversión registrada:</span>
        {conversionResult.sale ? (
          <Link href={`/admin/ventas?saleId=${encodeURIComponent(conversionResult.sale.id)}`} className="text-blue-600 hover:underline">
            Ver venta · {conversionResult.sale.code}
          </Link>
        ) : null}
        {conversionResult.order ? (
          <Link href={`/admin/pedidos?orderId=${encodeURIComponent(conversionResult.order.id)}`} className="text-blue-600 hover:underline">
            Ver pedido · {conversionResult.order.code}
          </Link>
        ) : null}
      </div>
    );
  }

  const version = preview?.version;
  const items = preview?.items ?? [];
  const currency = version?.currency ?? items[0]?.currency;
  const showTax = Boolean(version && version.taxAmount != null && ["INCLUDED", "EXCLUDED"].includes(version.taxMode ?? ""));
  const conversionBlocked = saving || loading || !locationId || !items.length || !version?.total || Boolean(preview?.existingSale);

  return (
    <div className="mt-2">
      <button type="button" className={secondaryButtonClass} onClick={() => void openForm()}>
        Convertir en venta
      </button>
      <AdminDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={preview?.quote?.trackingCode ?? "Cotización aceptada"}
        size="wide"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={secondaryButtonClass} onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="button" className={primaryButtonClass} disabled={conversionBlocked} onClick={() => void convert()}>
              {saving ? "Convirtiendo…" : preview?.existingSale ? "Venta ya registrada" : "Confirmar venta"}
            </button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-blue-600">Conversión controlada</p>
            <p className="mt-1 text-xs text-slate-500">La venta usa el snapshot aceptado y precios calculados en servidor.</p>
          </div>
          {loading ? <p className="text-sm text-slate-500">Cargando líneas y locales…</p> : null}
          {!loading && preview ? (
            <div className="grid gap-4">
              {preview.existingSale ? (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs font-semibold text-blue-800">
                  Esta cotización ya tiene la venta {preview.existingSale.code} registrada.
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                  Local de reserva
                  <select value={locationId} onChange={(event) => setLocationId(event.target.value)} className={inputClass}>
                    <option value="">Selecciona un local</option>
                    {(preview.locations ?? []).map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}{location.address ? ` · ${location.address}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                  Método de entrega
                  <select
                    value={deliveryMethod}
                    onChange={(event) => setDeliveryMethod(event.target.value as typeof deliveryMethod)}
                    className={inputClass}
                  >
                    <option value="PICKUP">Recojo en local</option>
                    <option value="DELIVERY">Entrega a domicilio</option>
                    <option value="SHIPPING">Envío por agencia</option>
                  </select>
                </label>
              </div>
              {deliveryMethod !== "PICKUP" ? (
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                  Dirección de entrega
                  <textarea
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                    maxLength={300}
                    placeholder="Dirección que quedará registrada en el pedido"
                  />
                </label>
              ) : null}
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="hidden grid-cols-[minmax(0,1fr)_125px_125px] gap-3 bg-slate-50 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:grid">
                  <span>Producto</span>
                  <span className="text-right">Precio final</span>
                  <span className="text-right">Total línea</span>
                </div>
                {items.length ? (
                  items.map((line) => (
                    <div key={line.productId} className="grid gap-2 border-t border-slate-100 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_125px_125px] sm:items-center sm:gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800">{line.name}</p>
                        <p className="mt-1 text-[10.5px] text-slate-500">{line.sku} · cantidad {line.quantity}</p>
                      </div>
                      <div className="flex justify-between gap-3 text-xs sm:block sm:text-right">
                        <span className="text-slate-500 sm:hidden">Precio final</span>
                        <span className="font-semibold text-slate-800">{formatMoney(line.currency ?? currency, line.finalUnitPrice)}</span>
                      </div>
                      <div className="flex justify-between gap-3 text-xs sm:block sm:text-right">
                        <span className="text-slate-500 sm:hidden">Total línea</span>
                        <span className="font-bold text-slate-900">{formatMoney(line.currency ?? currency, line.lineTotal)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-xs text-slate-500">La versión aceptada no tiene líneas disponibles.</p>
                )}
              </div>
              {version ? (
                <div className="ml-auto grid w-full max-w-sm gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                  {version.subtotal != null ? (
                    <div className="flex justify-between gap-4 text-slate-600"><span>Subtotal</span><strong>{formatMoney(currency, version.subtotal)}</strong></div>
                  ) : null}
                  {version.discountAmount != null ? (
                    <div className="flex justify-between gap-4 text-slate-600"><span>Descuento</span><strong>{formatMoney(currency, version.discountAmount)}</strong></div>
                  ) : null}
                  {showTax ? (
                    <div className="flex justify-between gap-4 text-slate-600"><span>Impuestos</span><strong>{formatMoney(currency, version.taxAmount)}</strong></div>
                  ) : null}
                  {version.total != null ? (
                    <div className="flex justify-between gap-4 border-t border-slate-200 pt-2 text-sm font-bold text-slate-900"><span>Total</span><strong>{formatMoney(currency, version.total)}</strong></div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700" role="alert" aria-live="assertive">{error}</p> : null}
        </div>
      </AdminDrawer>
    </div>
  );
}
