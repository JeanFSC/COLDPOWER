import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CatalogUnavailable } from "@/components/catalog/CatalogUnavailable";
import { getCatalogProductsByIds } from "@/lib/catalog-repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Comparador técnico", description: "Compara hasta cuatro productos ColdPower por sus atributos técnicos." };

type ComparePageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const ids = getFirst(params.ids)?.split(",").filter(Boolean).slice(0, 4) ?? [];
  const selectedProducts = await loadComparedProducts(ids);

  if (!selectedProducts) {
    return (
      <CatalogUnavailable
        title="El comparador técnico está temporalmente no disponible"
        description="No podemos recuperar las fichas para comparar en este momento. Inténtalo nuevamente en unos minutos."
      />
    );
  }

  const labels = Array.from(new Set(selectedProducts.flatMap((product) => product.specs.map((spec) => spec.label))));

  return (
    <section className="bg-surface-page py-8 sm:py-12"><div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-6"><Link href="/catalogo" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-secondary-600 hover:text-brand-primary-900"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al catálogo</Link><p className="mt-8 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-brand-secondary-600">Comparador técnico · máximo 4</p><h1 className="mt-2 font-display text-3xl font-bold text-brand-primary-900">Diferencias visibles antes de cotizar</h1>{selectedProducts.length === 0 ? <div className="mt-8 rounded-md border border-dashed border-border bg-white p-8 text-text-secondary">Selecciona productos desde el catálogo para comparar sus especificaciones.</div> : <div className="mt-8 overflow-x-auto rounded-md border border-border bg-white shadow-card"><table className="min-w-[720px] w-full border-collapse text-left text-sm"><thead><tr className="border-b border-border bg-surface-page"><th className="sticky left-0 z-10 min-w-44 bg-surface-page px-4 py-4 font-semibold text-brand-primary-900">Atributo</th>{selectedProducts.map((product) => <th key={product.id} className="min-w-52 px-4 py-4 align-top font-semibold text-brand-primary-900"><span className="font-mono text-xs text-brand-secondary-600">{product.sku}</span><span className="mt-2 block">{product.name}</span></th>)}</tr></thead><tbody>{["Marca", "Categoría", "Familia", "Estado comercial", ...labels].map((label) => <tr key={label} className="border-b border-border last:border-0"><th className="sticky left-0 bg-white px-4 py-4 font-semibold text-text-secondary">{label}</th>{selectedProducts.map((product) => { const value = label === "Marca" ? product.brand || "No indicada" : label === "Categoría" ? product.category : label === "Familia" ? product.family || "No indicada" : label === "Estado comercial" ? product.status : product.specs.find((spec) => spec.label === label)?.value ?? "—"; return <td key={`${product.id}-${label}`} className="px-4 py-4 text-brand-primary-900">{value}</td>; })}</tr>)}</tbody></table></div>}</div></section>
  );
}

async function loadComparedProducts(ids: string[]) {
  try {
    return await getCatalogProductsByIds(ids);
  } catch (error) {
    console.warn("[ColdPower] Comparador persistente no disponible.", error instanceof Error ? error.message : error);
    return null;
  }
}

function getFirst(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
