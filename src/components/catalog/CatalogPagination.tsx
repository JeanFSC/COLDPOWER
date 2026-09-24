type SearchParams = Record<string, string | string[] | undefined>;

export function CatalogPagination({ basePath, page, totalPages, searchParams }: { basePath: string; page: number; totalPages: number; searchParams: SearchParams }) {
  if (totalPages <= 1) return null;
  const previous = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  return <nav className="mt-8 flex items-center justify-between rounded-md border border-border bg-white p-3 text-sm" aria-label="Paginación del catálogo"><a className={page === 1 ? "pointer-events-none text-text-secondary" : "font-bold text-brand-primary-900 hover:text-brand-secondary-600"} aria-disabled={page === 1} href={pageHref(basePath, searchParams, previous)}>Anterior</a><span className="font-mono text-xs text-text-secondary">{page} / {totalPages}</span><a className={page === totalPages ? "pointer-events-none text-text-secondary" : "font-bold text-brand-primary-900 hover:text-brand-secondary-600"} aria-disabled={page === totalPages} href={pageHref(basePath, searchParams, next)}>Siguiente</a></nav>;
}

function pageHref(basePath: string, searchParams: SearchParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "pagina" || value === undefined) continue;
    for (const part of Array.isArray(value) ? value : [value]) query.append(key, part);
  }
  query.set("pagina", String(page));
  return `${basePath}?${query.toString()}`;
}
