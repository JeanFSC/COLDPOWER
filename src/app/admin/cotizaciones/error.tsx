"use client";

export default function ErrorCotizaciones({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-[70vh] place-items-center bg-[#f7fafc] px-6"><div className="max-w-md rounded-2xl border border-danger/20 bg-white p-7 text-center shadow-card"><h1 className="font-display text-2xl font-black text-dark">No se pudo cargar cotizaciones</h1><p className="mt-2 text-sm leading-6 text-[#71869b]">Verifica la conexión a datos e inténtalo nuevamente.</p><button type="button" onClick={reset} className="mt-5 rounded-pill bg-primary px-5 py-3 text-sm font-bold text-white">Reintentar</button></div></main>;
}
