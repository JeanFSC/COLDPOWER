"use client";

import { Scale, X } from "lucide-react";
import { useCompare } from "@/components/catalog/CompareProvider";
import { Button } from "@/components/shared/Button";

export function CompareBar() {
  const { selectedIds, clear } = useCompare();
  const ids = selectedIds.slice(0, 4);
  if (ids.length === 0) return null;
  return <aside id="comparador" className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-3xl items-center gap-3 rounded-md border border-brand-secondary-600/30 bg-white p-3 shadow-float" aria-label="Comparador técnico"><Scale className="h-5 w-5 shrink-0 text-brand-secondary-600" aria-hidden="true" /><p className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-primary-900">{ids.length} de 4 productos seleccionados para comparar</p><Button href={`/comparar?ids=${ids.join(",")}`} size="sm">Comparar</Button><button type="button" onClick={clear} className="inline-flex h-10 w-10 items-center justify-center rounded-md text-text-secondary hover:bg-surface-page hover:text-brand-primary-900" aria-label="Limpiar comparador"><X className="h-4 w-4" /></button></aside>;
}
