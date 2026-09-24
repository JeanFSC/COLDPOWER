"use client";

import Link from "next/link";
import { FileText, PackageSearch } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { cn } from "@/lib/utils";
import { useCart as useQuoteList } from "@/components/cart/CartProvider";

export function QuoteListButton({ className, compact = false, showCount = false }: { className?: string; compact?: boolean; showCount?: boolean }) {
  const { totalQuantity } = useQuoteList();
  const label = totalQuantity > 0 ? `Cotización con ${totalQuantity} referencia${totalQuantity === 1 ? "" : "s"}` : "Solicitar cotización";
  const badge = totalQuantity > 99 ? "99+" : totalQuantity;

  if (compact) {
    return (
      <Link href="/cotizacion" prefetch={false} aria-label={label} title="Cotización" className={cn("relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-white text-dark transition hover:border-brand-secondary-600 hover:text-brand-secondary-600", className)}>
        <FileText className="h-5 w-5" aria-hidden="true" />
        {totalQuantity > 0 ? <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-secondary-600 px-1 text-[11px] font-black leading-none text-white ring-2 ring-white">{badge}</span> : null}
      </Link>
    );
  }

  return (
    <Button href="/cotizacion" variant="outline" size="sm" className={className} aria-label={label}>
      <PackageSearch className="h-4 w-4" aria-hidden="true" />
      <span>{showCount ? `Cotización (${badge})` : "Cotización"}</span>
      {!showCount && totalQuantity > 0 ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-secondary-600 px-1.5 text-[11px] font-black leading-none text-white">{badge}</span> : null}
    </Button>
  );
}
