"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/shared/Button";

type CatalogUnavailableProps = {
  title?: string;
  description?: string;
};

export function CatalogUnavailable({
  title = "El catálogo está temporalmente no disponible",
  description = "No podemos mostrar el catálogo en este momento. Intenta nuevamente en unos minutos o solicita ayuda técnica.",
}: CatalogUnavailableProps) {
  return (
    <section className="bg-surface-page py-16 sm:py-24" role="alert" aria-live="assertive">
      <div className="cp-container max-w-2xl text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-action-accent-500/15 text-action-accent-500">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="mt-6 font-mono text-xs font-bold uppercase tracking-[0.16em] text-brand-secondary-600">Catálogo no disponible</p>
        <h1 className="mt-3 font-display text-3xl font-black text-brand-primary-900">{title}</h1>
        <p className="mt-4 text-sm leading-6 text-text-secondary">{description}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button type="button" variant="primary" onClick={() => window.location.reload()}>Reintentar</Button>
          <Button href="/" variant="outline">Volver al inicio</Button>
          <Button href="/contacto#solicitud" variant="outline">Solicitar ayuda técnica</Button>
        </div>
      </div>
    </section>
  );
}
