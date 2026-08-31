import type { Metadata } from "next";
import { CatalogUnavailable } from "@/components/catalog/CatalogUnavailable";
import { SearchResults } from "@/components/catalog/SearchResults";
import { SearchBar } from "@/components/shared/SearchBar";
import { getCatalogProducts } from "@/lib/catalog-repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buscar productos",
  description: "Busca equipos, repuestos, SKUs, marcas y atributos tecnicos en ColdPower.",
};

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = sanitizeQuery(getParam(params.q));
  const mode = getSearchMode(getParam(params.modo));
  const results = await loadSearchResults(query);

  if (!results) {
    return <CatalogUnavailable title="La búsqueda técnica está temporalmente no disponible" description="No podemos mostrar resultados en este momento. Inténtalo nuevamente en unos minutos o solicita ayuda técnica." />;
  }

  return (
    <>
      <section className="bg-surface-page py-8 sm:py-10">
        <div className="cp-container">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-brand-secondary-600">Busqueda tecnica</p>
          <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-dark">{mode?.title ?? "Buscar en ColdPower"}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-text-secondary">{mode?.description ?? "Ingresa equipo, SKU, marca, modelo o categoria para encontrar referencias del inventario publicado."}</p>
          <SearchBar id="search-page-query" className="mt-6 max-w-2xl" placeholder={mode?.placeholder ?? "Ej. Carrier, R410A, CP-COM"} />
        </div>
      </section>
      <SearchResults query={query} products={results.products} />
    </>
  );
}

async function loadSearchResults(query: string) {
  if (!query) return { products: [], total: 0 };
  try {
    return await getCatalogProducts({ query, pageSize: 48 });
  } catch (error) {
    console.warn("[ColdPower] Busqueda persistente no disponible.", error instanceof Error ? error.message : error);
    return null;
  }
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function sanitizeQuery(value: string | undefined) {
  return (value ?? "").trim().slice(0, 80);
}

const searchModes = {
  codigo: { title: "Buscar por código o modelo", description: "Ingresa un SKU, MPN, OEM o modelo exacto para encontrar la referencia publicada.", placeholder: "Ej. 6871JB1103H, CP-COM, OEM..." },
} as const;

function getSearchMode(value: string | undefined) {
  return value && value in searchModes ? searchModes[value as keyof typeof searchModes] : undefined;
}
