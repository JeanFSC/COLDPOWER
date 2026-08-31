"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useState, type ReactNode } from "react";

type MobileFilterDrawerProps = {
  children: ReactNode;
};

export function MobileFilterDrawer({ children }: MobileFilterDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-pill border border-border bg-white px-4 text-sm font-bold text-dark shadow-card lg:hidden">
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filtrar catalogo
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-dark/45 lg:hidden" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto bg-surface-page p-4 shadow-float">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-black text-dark">Filtros</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-border bg-white p-2 text-text-secondary" aria-label="Cerrar filtros">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
