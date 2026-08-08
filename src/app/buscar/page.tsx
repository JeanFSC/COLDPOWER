import type { Metadata } from "next";
import { Search } from "lucide-react";
import { SearchResults } from "@/components/catalog/SearchResults";
import { Button } from "@/components/shared/Button";
import { searchProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Buscar productos",
  description: "Busca equipos, repuestos, SKUs, marcas y compatibilidades en ColdPower.",
};

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = sanitizeQuery(getParam(params.q));
  const results = query ? searchProducts(query) : [];

  return (
    <>
      <section className="bg-dark px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-display text-4xl font-black tracking-normal">Buscar en ColdPower</h1>
          <p className="mt-3 max-w-2xl text-gray-light">
            Ingresa equipo, SKU, marca, modelo o categoría para encontrar productos mock del
            frontend.
          </p>
          <form action="/buscar" className="mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="search-page-query">
              Buscar productos
            </label>
            <div className="flex h-12 flex-1 items-center gap-2 rounded-pill border border-white/15 bg-white px-4 text-gray-text">
              <Search className="h-4 w-4" aria-hidden="true" />
              <input
                id="search-page-query"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Ej. Carrier, R410A, CP-COM"
                className="w-full bg-transparent text-sm font-semibold text-dark outline-none"
              />
            </div>
            <Button type="submit" className="sm:w-auto">
              Buscar
            </Button>
          </form>
        </div>
      </section>
      <SearchResults query={query} products={results} />
    </>
  );
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function sanitizeQuery(value: string | undefined) {
  return (value ?? "").trim().slice(0, 80);
}
