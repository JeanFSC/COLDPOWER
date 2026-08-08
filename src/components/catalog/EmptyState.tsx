import { SearchX } from "lucide-react";
import { Button } from "@/components/shared/Button";

type EmptyStateProps = {
  title?: string;
  description?: string;
};

export function EmptyState({
  title = "No encontramos productos",
  description = "Prueba cambiando filtros, buscando por marca o solicitando ayuda por WhatsApp.",
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <SearchX className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mt-5 font-display text-2xl font-black text-dark">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-text">{description}</p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Button href="/catalogo" variant="outline">
          Volver al catálogo
        </Button>
        <Button href="/cotizacion" variant="primary">
          Solicitar cotización
        </Button>
      </div>
    </div>
  );
}
