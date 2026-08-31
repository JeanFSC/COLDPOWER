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
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/media/${assetId}/usages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entityType, entityId, slot, sortOrder: 0 }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo asociar.");
      setMessage(`Media asociada a ${entityType}/${entityId}/${slot}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo asociar."); } finally { setBusy(false); }
  }
  return <section className="mt-6 rounded-md border border-border bg-white p-5"><div><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">Asignación por slot</p><h2 className="mt-1 font-display text-xl font-black text-dark">Usos de media</h2><p className="mt-2 text-sm text-gray-text">Asocia una imagen real a hero, banner, logo, producto, categoría, marca o bloque CMS.</p></div><div className="mt-4 grid gap-2 sm:grid-cols-3"><select value={entityType} onChange={(event) => setEntityType(event.target.value as (typeof entityTypes)[number])} className="h-10 rounded-md border border-border px-2 text-sm">{entityTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select><input value={entityId} onChange={(event) => setEntityId(event.target.value)} className="h-10 rounded-md border border-border px-2 text-sm" placeholder="ID real de entidad" /><input value={slot} onChange={(event) => setSlot(event.target.value)} className="h-10 rounded-md border border-border px-2 text-sm" placeholder="hero, banner, logo" /></div>{message ? <p role="status" className="mt-3 text-xs text-gray-text">{message}</p> : null}<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{assets.map((asset) => <article key={asset.id} className="rounded-md border border-border p-3"><div className="relative h-28 w-full"><Image src={asset.url} alt={asset.altText || asset.originalFilename} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-contain" /></div><p className="mt-2 truncate text-xs font-bold text-dark">{asset.originalFilename}</p><button type="button" disabled={busy || !entityId || !slot} onClick={() => void associate(asset.id)} className="mt-3 rounded-md bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Asociar a slot</button></article>)}</div>{!assets.length ? <p className="mt-4 text-sm text-gray-text">No hay imágenes activas para asociar.</p> : null}</section>;
}
