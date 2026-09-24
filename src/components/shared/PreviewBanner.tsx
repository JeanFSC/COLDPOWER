import { isPreview } from "@/lib/env";

/**
 * Aviso discreto de entorno preview.
 * Solo se renderiza cuando NEXT_PUBLIC_IS_PREVIEW=true (leído de forma segura en env.ts).
 * En producción real (isPreview=false) no devuelve nada, por lo que no afecta la UI.
 */
export function PreviewBanner() {
  if (!isPreview) {
    return null;
  }

  return (
    <div role="status" aria-live="polite" className="bg-warning text-white">
      <div className="mx-auto max-w-7xl px-4 py-1.5 text-center text-xs font-semibold lg:px-8">
        Vista previa privada — datos comerciales de prueba. No es el sitio de producción.
      </div>
    </div>
  );
}
