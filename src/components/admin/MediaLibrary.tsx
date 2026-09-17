"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Asset = { id: string; url: string; originalFilename: string; mimeType: string; byteSize: number; altText: string | null; usageCount?: number };

export function MediaLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAlt, setEditingAlt] = useState("");

  async function load(nextPage = page) {
    const params = new URLSearchParams({ page: String(nextPage), pageSize: "24" });
    if (query.trim()) params.set("query", query.trim());
    const response = await fetch(`/api/admin/media?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) return;
    const result = (await response.json()) as { items?: Asset[]; totalPages?: number; totalItems?: number; assets?: Asset[] };
    setAssets(result.items ?? result.assets ?? []);
    setPage(nextPage);
    setTotalPages(result.totalPages ?? 1);
    setTotalItems(result.totalItems ?? (result.items ?? result.assets ?? []).length);
  }
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [query]);
  async function upload() {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("altText", altText);
      const response = await fetch("/api/admin/media", { method: "POST", body: form });
      const result = (await response.json()) as { error?: { message?: string } | string };
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : result.error?.message || "No se pudo subir.");
      setFile(null);
      setAltText("");
      setMessage("Media subida");
      await load(1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }
  async function archive(id: string) {
    setMessage("");
    const response = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
    const result = (await response.json()) as { error?: { message?: string } | string };
    if (!response.ok) {
      setMessage(typeof result.error === "string" ? result.error : result.error?.message || "No se pudo archivar.");
      return;
    }
    await load(assets.length === 1 && page > 1 ? page - 1 : page);
  }
  function startEditing(asset: Asset) {
    setEditingId(asset.id);
    setEditingAlt(asset.altText ?? "");
  }
  async function saveAlt(asset: Asset) {
    const response = await fetch(`/api/admin/media/${asset.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ altText: editingAlt }) });
    if (!response.ok) {
      setMessage("No se pudo actualizar el texto alternativo.");
      return;
    }
    setEditingId(null);
    await load(page);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">Biblioteca multimedia</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Imágenes reutilizables</h2>
          <p className="mt-1 max-w-xl text-xs text-slate-500">Sube imágenes con preview, texto alternativo y usos trazables.</p>
        </div>
        <span className="text-xs font-semibold text-slate-400">{totalItems} registros</span>
      </div>
      <div className="mt-5 grid gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="grid gap-1 text-[11px] font-semibold text-slate-500">
          Buscar
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o texto alternativo" className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none focus:border-blue-400" />
        </label>
        <label className="grid gap-1 text-[11px] font-semibold text-slate-500">
          Archivo
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full text-xs text-slate-600" />
        </label>
        <label className="grid gap-1 text-[11px] font-semibold text-slate-500">
          Texto alternativo
          <input value={altText} onChange={(event) => setAltText(event.target.value)} maxLength={300} className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-blue-400" />
        </label>
        <button type="button" onClick={upload} disabled={!file || busy} className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 sm:col-span-3">
          {busy ? "Subiendo…" : "Subir imagen"}
        </button>
      </div>
      {message ? (
        <p className="mt-3 text-xs font-medium text-slate-500" role="status">
          {message}
        </p>
      ) : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {assets.map((asset) => (
          <article key={asset.id} className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
            <div className="relative aspect-square bg-slate-50">
              <Image src={asset.url} alt={asset.altText || asset.originalFilename} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-contain" />
            </div>
            <div className="p-3">
              <p className="truncate text-xs font-bold text-slate-900">{asset.originalFilename}</p>
              <p className="mt-1 text-[11px] text-slate-400">
                {asset.mimeType} · {Math.ceil(asset.byteSize / 1024)} KB · {asset.usageCount ?? 0} usos
              </p>
              {editingId === asset.id ? (
                <div className="mt-3 space-y-2">
                  <label className="grid gap-1 text-[10px] font-bold text-slate-400">
                    Texto alternativo
                    <input value={editingAlt} onChange={(event) => setEditingAlt(event.target.value)} maxLength={300} className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none focus:border-blue-400" />
                  </label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => void saveAlt(asset)} className="text-xs font-semibold text-blue-600 hover:underline">
                      Guardar
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-xs font-semibold text-slate-500 hover:underline">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-3">
                  <button type="button" onClick={() => startEditing(asset)} className="text-xs font-semibold text-blue-600 hover:underline">
                    Editar alt
                  </button>
                  <button type="button" onClick={() => void archive(asset.id)} className="text-xs font-semibold text-rose-600 hover:underline">
                    Archivar
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      {assets.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">No hay imágenes para este alcance.</p>
      ) : null}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
        <button type="button" disabled={page <= 1} onClick={() => void load(page - 1)} className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 disabled:opacity-40">
          Anterior
        </button>
        <span>
          Página {page} de {totalPages}
        </span>
        <button type="button" disabled={page >= totalPages} onClick={() => void load(page + 1)} className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 disabled:opacity-40">
          Siguiente
        </button>
      </div>
    </section>
  );
}
