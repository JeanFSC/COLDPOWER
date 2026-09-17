"use client";

import Image from "next/image";

import { useState } from "react";

type Asset = { id: string; url: string; originalFilename: string; altText: string | null };
const entityTypes = ["product", "category", "brand", "cms_page", "cms_block", "company_settings"] as const;

export function MediaSlotAssociator({ assets }: { assets: Asset[] }) {
  const [entityType, setEntityType] = useState<(typeof entityTypes)[number]>("cms_page");
  const [entityId, setEntityId] = useState("home");
  const [slot, setSlot] = useState("hero");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function associate(assetId: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/media/${assetId}/usages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entityType, entityId, slot, sortOrder: 0 }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo asociar.");
      setMessage(`Media asociada a ${entityType}/${entityId}/${slot}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo asociar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">Asignación por slot</p>
        <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Usos de media</h2>
        <p className="mt-1 max-w-xl text-xs text-slate-500">Asocia una imagen real a hero, banner, logo, producto, categoría, marca o bloque CMS.</p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <label className="grid gap-1 text-[11px] font-semibold text-slate-500">
          Tipo de entidad
          <select aria-label="Tipo de entidad multimedia" value={entityType} onChange={(event) => setEntityType(event.target.value as (typeof entityTypes)[number])} className="h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-blue-400">
            {entityTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[11px] font-semibold text-slate-500">
          ID de entidad
          <input aria-label="ID real de entidad multimedia" value={entityId} onChange={(event) => setEntityId(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-blue-400" placeholder="ID real de entidad" />
        </label>
        <label className="grid gap-1 text-[11px] font-semibold text-slate-500">
          Slot
          <input aria-label="Slot multimedia" value={slot} onChange={(event) => setSlot(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-blue-400" placeholder="hero, banner, logo" />
        </label>
      </div>
      {message ? (
        <p role="status" className="mt-3 text-xs font-medium text-slate-500">
          {message}
        </p>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {assets.map((asset) => (
          <article key={asset.id} className="rounded-lg border border-slate-200 p-3 shadow-sm">
            <div className="relative h-28 w-full">
              <Image src={asset.url} alt={asset.altText || asset.originalFilename} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-contain" />
            </div>
            <p className="mt-2 truncate text-xs font-bold text-slate-900">{asset.originalFilename}</p>
            <button type="button" disabled={busy || !entityId || !slot} onClick={() => void associate(asset.id)} className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
              Asociar a slot
            </button>
          </article>
        ))}
      </div>
      {!assets.length ? <p className="mt-4 text-sm text-slate-500">No hay imágenes activas para asociar.</p> : null}
    </section>
  );
}
