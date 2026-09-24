import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { CatalogUnavailable } from "@/components/catalog/CatalogUnavailable";
import { SearchResults } from "@/components/catalog/SearchResults";
import { SearchBar } from "@/components/shared/SearchBar";
import { getCatalogProductBySku, getCatalogProducts } from "@/lib/catalog-repository";

export const revalidate = 300;

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
  if (query) {
    let exactProduct;
    try {
      exactProduct = await getCatalogProductBySku(query);
    } catch (error) {
      console.warn("[ColdPower] No se pudo resolver el SKU exacto.", error instanceof Error ? error.message : error);
    }
    if (exactProduct) redirect(`/producto/${exactProduct.slug}`);
  }
  const results = await loadSearchResults(query);

  if (!results) {
    return <CatalogUnavailable title="La búsqueda técnica está temporalmente no disponible" description="No podemos mostrar resultados en este momento. Inténtalo nuevamente en unos minutos o solicita ayuda técnica." />;
  }

  return (
    <>
      <section className="bg-surface-page py-8 sm:py-10">
        <div className="cp-container grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] lg:items-center lg:gap-10">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-brand-secondary-600">Busqueda tecnica</p>
            <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-dark">{mode?.title ?? "Buscar en ColdPower"}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-text-secondary">{mode?.description ?? "Ingresa equipo, SKU, marca, modelo o categoria para encontrar referencias del inventario publicado."}</p>
            <SearchBar id="search-page-query" className="mt-6 max-w-2xl" placeholder={mode?.placeholder ?? "Ej. Carrier, R410A, CP-COM"} />
          </div>
          <figure className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-white shadow-card">
            <Image src="/images/home/placa-equipo.webp" alt="Técnico fotografiando la placa de identificación de un equipo HVAC." fill sizes="(min-width: 1024px) 28vw, 100vw" className="object-cover" />
            <figcaption className="absolute bottom-3 left-3 rounded-pill bg-brand-primary-900/85 px-3 py-1.5 text-[11px] font-bold text-white">Imagen referencial</figcaption>
          </figure>
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
