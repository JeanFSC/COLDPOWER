import { ChevronLeft, ChevronRight } from "lucide-react";

export function PricingPager({ page, totalPages, previousHref, nextHref, className }: {
  page: number;
  totalPages: number;
  previousHref: string;
  nextHref: string;
  className: string;
}) {
  return <nav aria-label="Paginación de precios" className="flex items-center gap-1">
    {page > 1 ? <a aria-label="Página anterior" className={className} href={previousHref}><ChevronLeft className="h-4 w-4" aria-hidden="true" /></a>
      : <span aria-label="Página anterior" aria-disabled="true" className={`${className} opacity-30`}><ChevronLeft className="h-4 w-4" aria-hidden="true" /></span>}
    <span className="px-2 text-[10px] font-extrabold text-slate-700" aria-current="page">{page} / {totalPages}</span>
    {page < totalPages ? <a aria-label="Página siguiente" className={className} href={nextHref}><ChevronRight className="h-4 w-4" aria-hidden="true" /></a>
      : <span aria-label="Página siguiente" aria-disabled="true" className={`${className} opacity-30`}><ChevronRight className="h-4 w-4" aria-hidden="true" /></span>}
  </nav>;
}
