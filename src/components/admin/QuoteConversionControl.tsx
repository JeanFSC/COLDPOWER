"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/Button";

type QuoteLine = { productId: string; sku: string; name: string; quantity: number; unitPrice: string; currency: string };
type Location = { id: string; name: string; address: string | null };
type ConversionResult = { sale: { id: string; code: string } | null; order: { id: string; code: string } | null };

function readApiError(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
    if (typeof error === "object" && error !== null && "message" in error) return String((error as { message?: unknown }).message ?? fallback);
  }
  return fallback;
}

export function QuoteConversionControl({ quoteId, status, acceptedVersionId }: { quoteId: string; status: string; acceptedVersionId?: string | null }) {
  const eligible = status === "ACCEPTED" && Boolean(acceptedVersionId);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);

  async function openForm() {
    setOpen(true); setError("");
    if (lines.length || locations.length) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/ventas?quoteId=${encodeURIComponent(quoteId)}`, { cache: "no-store" });
      const result = await response.json() as unknown;
      if (!response.ok) throw new Error(readApiError(result, "No se pudo cargar la cotización."));
      const data = result as { items?: QuoteLine[]; locations?: Location[] };
      setLines(data.items ?? []); setLocations(data.locations ?? []); setLocationId(data.locations?.[0]?.id ?? "");
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la cotización."); } finally { setLoading(false); }
  }

  async function convert() {
    if (!locationId || !lines.length) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/admin/ventas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quoteId, locationId, deliveryMethod: "PICKUP" }) });
      const result = await response.json().catch(() => ({}));
      const payload = result as { sale?: { id?: unknown; code?: unknown } | null; order?: { id?: unknown; code?: unknown } | null };
      if (response.ok) {
        setConversionResult({
          sale: typeof payload.sale?.id === "string" ? { id: payload.sale.id, code: typeof payload.sale.code === "string" ? payload.sale.code : payload.sale.id } : null,
          order: typeof payload.order?.id === "string" ? { id: payload.order.id, code: typeof payload.order.code === "string" ? payload.order.code : payload.order.id } : null,
        });
      }
      if (!response.ok) throw new Error(readApiError(result, "No se pudo convertir la cotización."));
      setOpen(false); router.refresh();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "No se pudo convertir la cotización."); } finally { setSaving(false); }
  }

  if (!eligible) return status === "ACCEPTED" ? <span className="inline-flex items-center rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-xs font-bold text-[#a15c00]">Requiere versión aceptada</span> : null;
  if (conversionResult) {
    return (
      <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
        <span className="text-slate-500">Conversión registrada:</span>
        {conversionResult.sale ? <Link href={`/admin/ventas?saleId=${encodeURIComponent(conversionResult.sale.id)}`} className="text-blue-600 hover:underline">Ver venta · {conversionResult.sale.code}</Link> : null}
        {conversionResult.order ? <Link href={`/admin/pedidos?orderId=${encodeURIComponent(conversionResult.order.id)}`} className="text-blue-600 hover:underline">Ver pedido · {conversionResult.order.code}</Link> : null}
      </div>
    );
  }
  return <div className="mt-2"><Button type="button" variant="outline" size="sm" onClick={() => void openForm()}>Convertir en venta</Button>{open ? <div className="fixed inset-0 z-[60] grid place-items-center bg-dark/55 p-4"><div className="w-full max-w-2xl rounded-lg border border-border bg-white p-6 shadow-float"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">Conversión controlada</p><h2 className="mt-2 font-display text-2xl font-black text-dark">Confirmar venta {quoteId}</h2></div><button type="button" className="font-bold text-gray-text" onClick={() => setOpen(false)}>Cerrar</button></div>{loading ? <p className="mt-5 text-sm text-gray-text">Cargando líneas y locales…</p> : <><label className="mt-5 grid gap-2 text-sm font-bold text-dark">Local de reserva<select value={locationId} onChange={(event) => setLocationId(event.target.value)} className="h-11 rounded-md border border-border bg-background px-3">{locations.map((location) => <option key={location.id} value={location.id}>{location.name}{location.address ? ` · ${location.address}` : ""}</option>)}</select></label><div className="mt-5 grid gap-3">{lines.map((line) => <div key={line.productId} className="grid gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-[1fr_150px_95px] sm:items-center"><div><p className="font-bold text-dark">{line.name}</p><p className="text-xs text-gray-text">{line.sku} · cantidad {line.quantity}</p></div><span className="text-sm font-bold text-dark">{line.unitPrice}</span><span className="text-sm font-bold uppercase text-dark">{line.currency}</span></div>)}</div>{error ? <p className="mt-4 rounded-md border border-danger/25 bg-danger/10 p-3 text-sm font-semibold text-danger" role="alert" aria-live="assertive">{error}</p> : null}<div className="mt-5 flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="button" disabled={saving || !locationId || !lines.length} onClick={() => void convert()}>{saving ? "Convirtiendo…" : "Confirmar venta"}</Button></div></>}</div></div> : null}</div>;
}
