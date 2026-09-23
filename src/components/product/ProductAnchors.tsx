import Link from "next/link";

type ProductAnchorsProps = { showSpecs?: boolean; showCompatibility?: boolean; showDescription?: boolean; showRelated?: boolean };

export function ProductAnchors({ showSpecs = true, showCompatibility = true, showDescription = true, showRelated = false }: ProductAnchorsProps) {
  const anchors = [
    showSpecs ? ["especificaciones", "Especificaciones"] : null,
    showCompatibility ? ["compatibilidad", "Compatibilidad"] : null,
    showDescription ? ["descripcion", "Descripción"] : null,
    showRelated ? ["alternativas", "Relacionados"] : null,
    ["preguntas", "Preguntas frecuentes"],
  ].filter(Boolean) as Array<[string, string]>;

  return (
    <nav className="sticky top-[var(--header-h)] z-20 -mx-4 overflow-x-auto border-y border-border bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-md sm:border" aria-label="Secciones del producto">
      <div className="flex min-w-max gap-5 text-sm font-bold text-gray-text">
        {anchors.map(([id, label]) => <Link key={id} href={`#${id}`} className="transition hover:text-brand-secondary-600">{label}</Link>)}
      </div>
    </nav>
  );
}
