"use client";

import { useEffect, useState } from "react";

type Option = { id: string; name: string; slug: string };
type Asset = { id: string; url: string; originalFilename: string; mimeType: string; byteSize: number; altText: string | null };
type Props = {
  productId: string;
  initial: {
    commercialName: string | null;
    editorialDescription: string | null;
    featured: boolean;
    editorialCategoryId: string | null;
    editorialFamilyId: string | null;
    editorialBrandId: string | null;
  };
  categories: Option[];
  families: Option[];
  brands: Option[];
};

export function ProductEditorialForm({ productId, initial, categories, families, brands }: Props) {
  const [commercialName, setCommercialName] = useState(initial.commercialName ?? "");
  const [editorialDescription, setEditorialDescription] = useState(initial.editorialDescription ?? "");
  const [featured, setFeatured] = useState(initial.featured);
  const [editorialCategoryId, setEditorialCategoryId] = useState(initial.editorialCategoryId ?? "");
  const [editorialFamilyId, setEditorialFamilyId] = useState(initial.editorialFamilyId ?? "");
  const [editorialBrandId, setEditorialBrandId] = useState(initial.editorialBrandId ?? "");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/media", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ assets?: Asset[] }> : Promise.reject(new Error("No se pudo cargar la biblioteca.")))
      .then((result) => { if (!cancelled) setAssets(result.assets ?? []); })
      .catch(() => { if (!cancelled) setAssets([]); });
    return () => { cancelled = true; };
  }, []);

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/catalogo/" + productId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commercialName: commercialName || null,
          editorialDescription: editorialDescription || null,
          featured,
          editorialCategoryId: editorialCategoryId || null,
          editorialFamilyId: editorialFamilyId || null,
          editorialBrandId: editorialBrandId || null,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
      setMessage("Guardado");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function associateAsset(asset: Asset) {
    setMessage("");
    const response = await fetch("/api/admin/media/" + asset.id + "/usages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType: "product", entityId: productId, slot: "gallery", sortOrder: 0 }),
    });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "Imagen asociada: " + asset.originalFilename : result.error || "No se pudo asociar la imagen.");
  }

  return (
    <details className="mt-3 rounded-md border border-border bg-background p-3">
      <summary className="cursor-pointer text-xs font-extrabold text-primary">Editar contenido comercial</summary>
      <div className="mt-3 grid gap-3">
        <label className="grid gap-1 text-xs font-bold text-gray-text">Nombre comercial
          <input value={commercialName} onChange={(event) => setCommercialName(event.target.value)} maxLength={500} className="h-9 rounded-md border border-border bg-white px-2 text-sm font-normal text-dark" placeholder="Opcional; no reemplaza el nombre original" />
        </label>
        <label className="grid gap-1 text-xs font-bold text-gray-text">Descripción editorial
          <textarea value={editorialDescription} onChange={(event) => setEditorialDescription(event.target.value)} maxLength={4000} rows={3} className="rounded-md border border-border bg-white px-2 py-2 text-sm font-normal text-dark" placeholder="Solo información comercial confirmada" />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-xs font-bold text-gray-text">Categoría editorial
            <select value={editorialCategoryId} onChange={(event) => setEditorialCategoryId(event.target.value)} className="h-9 rounded-md border border-border bg-white px-2 text-sm font-normal text-dark">
              <option value="">Usar categoría fuente</option>
              {categories.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-gray-text">Familia editorial
            <select value={editorialFamilyId} onChange={(event) => setEditorialFamilyId(event.target.value)} className="h-9 rounded-md border border-border bg-white px-2 text-sm font-normal text-dark">
              <option value="">Usar familia fuente</option>
              {families.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-gray-text">Marca editorial
            <select value={editorialBrandId} onChange={(event) => setEditorialBrandId(event.target.value)} className="h-9 rounded-md border border-border bg-white px-2 text-sm font-normal text-dark">
              <option value="">Usar marca fuente</option>
              {brands.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-text"><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />Producto destacado</label>
        <div className="rounded-md border border-border bg-white p-3">
          <p className="text-xs font-extrabold text-dark">Biblioteca multimedia</p>
          <p className="mt-1 text-[11px] text-gray-text">Selecciona una imagen activa para asociarla a la galería del producto.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {assets.slice(0, 12).map((asset) => <div key={asset.id} className="flex items-center justify-between gap-2 rounded border border-border p-2"><span className="min-w-0 truncate text-[11px] font-semibold text-gray-text">{asset.originalFilename}</span><button type="button" onClick={() => void associateAsset(asset)} className="shrink-0 text-[11px] font-bold text-primary hover:underline">Usar</button></div>)}
          </div>
          {!assets.length ? <p className="mt-2 text-[11px] text-gray-text">No hay imágenes activas en la biblioteca.</p> : null}
        </div>
        <div className="flex items-center gap-2"><button type="button" onClick={() => void save()} disabled={busy} className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? "Guardando…" : "Guardar contenido"}</button>{message ? <span className="text-[10px] text-gray-text">{message}</span> : null}</div>
      </div>
    </details>
  );
}