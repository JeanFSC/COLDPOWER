"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

type Option = { id: string; name: string; categoryId?: string };

type ProductCreateFormProps = {
  categories: Option[];
  families: Option[];
  brands: Option[];
  canCreate?: boolean;
  onCreated?: (productId: string, sku: string) => void;
};

type CreateResponse = {
  product?: { id?: string; sku?: string };
  error?: { message?: string };
};

export function ProductCreateForm({ categories, families, brands, canCreate = true, onCreated }: ProductCreateFormProps) {
  const [open, setOpen] = useState(false);
  const [sku, setSku] = useState("");
  const [commercialName, setCommercialName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [familyId, setFamilyId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [productType, setProductType] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/catalogo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: sku.trim(),
          commercialName: commercialName.trim(),
          categoryId,
          familyId,
          brandId: brandId || null,
          productType: productType.trim() || undefined,
        }),
      });
      const result = (await response.json()) as CreateResponse;
      if (!response.ok) throw new Error(result.error?.message ?? "No se pudo crear el producto.");
      setMessage(`Producto ${result.product?.sku ?? sku.trim()} creado.`);
      setOpen(false);
      onCreated?.(result.product?.id ?? "", result.product?.sku ?? sku.trim());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "No se pudo crear el producto.";
      setMessage(/SKU|existe|duplic/i.test(errorMessage) ? "Ya existe un producto con este SKU. Usa un identificador único." : errorMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!canCreate ? null : (
      <button type="button" onClick={() => { setMessage(""); setOpen(true); }} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#ff830e] px-3.5 text-[10px] font-extrabold text-white shadow-[0_5px_12px_rgba(255,131,14,0.16)] transition hover:bg-[#e97305]">
        Nuevo producto
      </button>)}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#102a43]/35 px-4 py-10" role="presentation">
          <section className="w-full max-w-2xl rounded-xl border border-[#dce6ee] bg-white p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="new-product-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#2277ee]">Catálogo</p>
                <h2 id="new-product-title" className="mt-1 text-[18px] font-black text-[#102a43]">Crear producto manual</h2>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-[#8195aa]">Registra una referencia editorial sin modificar la identidad de productos importados.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-[#71869c] hover:bg-[#f3f7fa]" aria-label="Cerrar creación de producto"><X className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <form className="mt-5 grid gap-4" onSubmit={submit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-[11px] font-extrabold text-[#304b66]">SKU
                  <input required value={sku} onChange={(event) => setSku(event.target.value)} className="h-10 rounded-lg border border-[#dce6ee] px-3 text-sm font-semibold outline-none focus:border-[#2277ee]" placeholder="CP-000001" autoComplete="off" />
                </label>
                <label className="grid gap-1.5 text-[11px] font-extrabold text-[#304b66]">Nombre comercial
                  <input required value={commercialName} onChange={(event) => setCommercialName(event.target.value)} className="h-10 rounded-lg border border-[#dce6ee] px-3 text-sm font-semibold outline-none focus:border-[#2277ee]" placeholder="Nombre visible del producto" />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-[11px] font-extrabold text-[#304b66]">Categoría
                  <select required value={categoryId} onChange={(event) => { const nextCategoryId = event.target.value; setCategoryId(nextCategoryId); if (familyId && !families.some((family) => family.id === familyId && (!family.categoryId || family.categoryId === nextCategoryId))) setFamilyId(""); }} className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-sm font-semibold outline-none focus:border-[#2277ee]"><option value="">Selecciona una categoría</option>{categories.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select>
                </label>
                <label className="grid gap-1.5 text-[11px] font-extrabold text-[#304b66]">Familia
                  <select required value={familyId} onChange={(event) => setFamilyId(event.target.value)} className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-sm font-semibold outline-none focus:border-[#2277ee]" disabled={!categoryId}><option value="">{categoryId ? "Selecciona una familia" : "Primero selecciona una categoría"}</option>{families.filter((option) => !option.categoryId || option.categoryId === categoryId).map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-[11px] font-extrabold text-[#304b66]">Marca opcional
                  <select value={brandId} onChange={(event) => setBrandId(event.target.value)} className="h-10 rounded-lg border border-[#dce6ee] bg-white px-3 text-sm font-semibold outline-none focus:border-[#2277ee]"><option value="">Sin marca</option>{brands.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select>
                </label>
                <label className="grid gap-1.5 text-[11px] font-extrabold text-[#304b66]">Tipo de producto opcional
                  <input value={productType} onChange={(event) => setProductType(event.target.value)} className="h-10 rounded-lg border border-[#dce6ee] px-3 text-sm font-semibold outline-none focus:border-[#2277ee]" placeholder="Repuesto, equipo…" />
                </label>
              </div>
              {message ? <p className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-[11px] font-semibold text-danger" role={message.includes("creado") ? "status" : "alert"} aria-live="polite">{message}</p> : null}
              <div className="flex flex-wrap justify-end gap-2 border-t border-[#edf2f6] pt-4">
                <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-lg border border-[#dce6ee] px-4 text-[11px] font-extrabold text-[#526b84]">Cancelar</button>
                <button type="submit" disabled={busy} className="h-10 rounded-lg bg-[#102a43] px-4 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Creando…" : "Crear producto"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
