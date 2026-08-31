import Link from "next/link";

const anchors = [
  ["especificaciones", "Especificaciones"],
  ["compatibilidad", "Compatibilidad"],
  ["documentos", "Documentos"],
  ["descripcion", "Descripción"],
  ["alternativas", "Alternativas"],
  ["complementos", "Complementos"],
  ["preguntas", "Preguntas frecuentes"],
] as const;

export function ProductAnchors() {
  return (
    <nav className="sticky top-[4.5rem] z-20 -mx-4 overflow-x-auto border-y border-border bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-md sm:border" aria-label="Secciones del producto">
      <div className="flex min-w-max gap-5 text-sm font-bold text-gray-text">
        {anchors.map(([id, label]) => (
          <Link key={id} href={`#${id}`} className="transition hover:text-primary">
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
