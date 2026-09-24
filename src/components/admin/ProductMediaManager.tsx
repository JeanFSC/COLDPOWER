"use client";

import Image from "next/image";
import { Image as ImageIcon, LoaderCircle, Star, Trash2 } from "lucide-react";
import { useState, type ChangeEvent } from "react";

export type ProductMediaItem = {
  primaryUrl: string;
  altText: string | null;
  assetId: string;
  slot: string;
  sortOrder: number;
};

type ProductMediaManagerProps = {
  productId: string;
  productName: string;
  initialMedia: ProductMediaItem[];
  canEdit: boolean;
  onChanged?: (media: ProductMediaItem[]) => void;
};

function errorMessage(value: unknown, fallback: string) {
  if (!value || typeof value !== "object") return fallback;
  const error = (value as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string") return (error as { message: string }).message;
  return fallback;
}

export function ProductMediaManager({ productId, productName, initialMedia, canEdit, onChanged }: ProductMediaManagerProps) {
  const [media, setMedia] = useState(initialMedia);
  const [busyAssetId, setBusyAssetId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  function applyMedia(next: ProductMediaItem[]) {
    setMedia(next);
    onChanged?.(next);
  }

  async function refreshMedia() {
    const response = await fetch(`/api/admin/catalogo/${encodeURIComponent(productId)}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok || !Array.isArray(result.product?.media)) throw new Error(errorMessage(result, "No se pudo actualizar la galería."));
    const next = result.product.media as ProductMediaItem[];
    applyMedia(next);
    return next;
  }

  async function uploadAndAssociate(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setBusyAssetId("upload");
    setMessage("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("altText", productName);
      const uploadResponse = await fetch("/api/admin/media", { method: "POST", body: form });
      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok || !uploadResult.asset?.id) throw new Error(errorMessage(uploadResult, "No se pudo subir la imagen."));
      const associateResponse = await fetch(`/api/admin/catalogo/${encodeURIComponent(productId)}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: uploadResult.asset.id, slot: "primary", sortOrder: 0 }),
      });
      const associateResult = await associateResponse.json();
      if (!associateResponse.ok) throw new Error(errorMessage(associateResult, "No se pudo asociar la imagen."));
      await refreshMedia();
      setMessage("Imagen subida y marcada como principal.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo subir la imagen.");
    } finally {
      setBusyAssetId(null);
    }
  }

  async function markPrimary(assetId: string) {
    setBusyAssetId(assetId);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/catalogo/${encodeURIComponent(productId)}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, slot: "primary", sortOrder: 0 }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(errorMessage(result, "No se pudo marcar la imagen."));
      await refreshMedia();
      setMessage("Imagen marcada como principal.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo marcar la imagen.");
    } finally {
      setBusyAssetId(null);
    }
  }

  async function removeAsset(assetId: string) {
    if (!window.confirm("¿Quitar esta imagen de la ficha? El asset seguirá disponible en la biblioteca.")) return;
    setBusyAssetId(assetId);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/catalogo/${encodeURIComponent(productId)}/media?assetId=${encodeURIComponent(assetId)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(errorMessage(result, "No se pudo quitar la imagen."));
      await refreshMedia();
      setMessage("Imagen quitada. La ficha volverá al placeholder de su familia si no quedan assets.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo quitar la imagen.");
    } finally {
      setBusyAssetId(null);
    }
  }

  return (
    <section className="grid gap-3" aria-labelledby={`media-title-${productId}`}>
      <div className="flex items-start gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8f1ff] text-[#2277ee]">
          <ImageIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h3 id={`media-title-${productId}`} className="text-[12px] font-black text-[#102a43]">Imagen principal y galería</h3>
          <p className="mt-1 text-[10px] leading-4 text-[#71869c]">La imagen principal se muestra en la tarjeta y la ficha pública sin el chip de imagen referencial.</p>
        </div>
      </div>
      {canEdit ? (
        <label className="grid gap-1 rounded-xl border border-[#cfe0f7] bg-[#f5f9ff] p-3 text-[10px] font-extrabold text-[#526b84]">
          Subir imagen y marcarla como principal
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={busyAssetId !== null} onChange={(event) => void uploadAndAssociate(event)} className="text-[10px] font-semibold text-[#526b84] disabled:opacity-50" />
          <span className="font-normal text-[#8296a9]">Se guarda en la biblioteca, queda auditada y reemplaza la principal anterior.</span>
        </label>
      ) : (
        <p className="rounded-xl border border-dashed border-[#dce6ee] bg-[#fbfcfd] p-3 text-[10px] text-[#71869c]">No tienes permiso para administrar media.</p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {media.map((asset) => {
          const isPrimary = asset.slot === "primary";
          const busy = busyAssetId === asset.assetId;
          return (
            <div key={`${asset.assetId}-${asset.slot}-${asset.sortOrder}`} className={`rounded-xl border p-2 ${isPrimary ? "border-[#b8d3f5] bg-[#f8fbff]" : "border-[#edf2f6] bg-white"}`}>
              <div className="flex items-center gap-3">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#f5f8fa]">
                  <Image src={asset.primaryUrl} alt={asset.altText || productName} fill sizes="56px" className="object-contain p-1" unoptimized={asset.primaryUrl.startsWith("/api/")} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-bold text-[#304b66]">{isPrimary ? "Imagen principal" : "Galería"}</p>
                  <p className="truncate text-[9px] text-[#8296a9]">{asset.altText || "Sin texto alternativo"}</p>
                </div>
                {isPrimary ? <Star className="h-3.5 w-3.5 shrink-0 fill-[#ffb020] text-[#ffb020]" aria-label="Imagen principal" /> : null}
              </div>
              {canEdit ? (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-[#edf2f6] pt-2">
                  {!isPrimary ? <button type="button" disabled={busyAssetId !== null} onClick={() => void markPrimary(asset.assetId)} className="inline-flex h-7 items-center gap-1 rounded-md border border-[#cfe0f7] px-2 text-[9px] font-extrabold text-[#2277ee] disabled:opacity-40"><Star className="h-3 w-3" aria-hidden="true" />Usar como principal</button> : null}
                  <button type="button" disabled={busyAssetId !== null} onClick={() => void removeAsset(asset.assetId)} className="inline-flex h-7 items-center gap-1 rounded-md border border-[#ffd0d0] px-2 text-[9px] font-extrabold text-[#d94848] disabled:opacity-40"><Trash2 className="h-3 w-3" aria-hidden="true" />Quitar</button>
                  {busy ? <LoaderCircle className="ml-auto h-3.5 w-3.5 animate-spin text-[#8296a9]" aria-label="Procesando" /> : null}
                </div>
              ) : null}
            </div>
          );
        })}
        {!media.length ? <div className="rounded-xl border border-dashed border-[#dce6ee] bg-[#fbfcfd] p-5 text-center sm:col-span-2"><ImageIcon className="mx-auto h-5 w-5 text-[#9db0c1]" aria-hidden="true" /><p className="mt-2 text-[10px] font-extrabold text-[#304b66]">Imagen pendiente</p><p className="mt-1 text-[9px] text-[#8296a9]">La ficha usa el placeholder resuelto por familia.</p></div> : null}
      </div>
      {message ? <p className="text-[10px] font-semibold text-[#526b84]" role="status" aria-live="polite">{message}</p> : null}
    </section>
  );
}
