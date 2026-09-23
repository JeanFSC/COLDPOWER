"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type MobileFilterDrawerProps = {
  children: ReactNode;
};

export function MobileFilterDrawer({ children }: MobileFilterDrawerProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const first = panelRef.current?.querySelector<HTMLElement>(selector);
    first?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(selector)];
      if (!focusable.length) return;
      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstFocusable) { event.preventDefault(); lastFocusable.focus(); }
      else if (!event.shiftKey && document.activeElement === lastFocusable) { event.preventDefault(); firstFocusable.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = originalOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-pill border border-border bg-white px-4 text-sm font-bold text-dark shadow-card lg:hidden">
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filtrar catalogo
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-dark/45 lg:hidden" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div ref={panelRef} className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto bg-surface-page p-4 shadow-float" role="dialog" aria-modal="true" aria-labelledby="catalog-filter-title">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="catalog-filter-title" className="font-display text-xl font-black text-dark">Filtros</h2>
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
