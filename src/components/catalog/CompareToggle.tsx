"use client";

import { Check } from "lucide-react";
import { useCompare } from "@/components/catalog/CompareProvider";
import { trackCatalogEvent } from "@/lib/analytics";

export function CompareToggle({ productId }: { productId: string }) {
  const { canAdd, has, toggle } = useCompare();
  const selected = has(productId);

  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-white/95 px-3 text-xs font-semibold text-brand-primary-900 shadow-card">
      <input type="checkbox" checked={selected} disabled={!selected && !canAdd} onChange={() => { toggle(productId); trackCatalogEvent("compare_added", { productId, selected: !selected }); }} className="sr-only" />
      <span className={`inline-flex h-4 w-4 items-center justify-center rounded border ${selected ? "border-brand-secondary-600 bg-brand-secondary-600 text-white" : "border-border bg-white"}`} aria-hidden="true">
        {selected ? <Check className="h-3 w-3" /> : null}
      </span>
      Comparar
    </label>
  );
}
