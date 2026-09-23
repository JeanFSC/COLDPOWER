export default function Loading() {
  return <div className="cp-container flex min-h-[45vh] items-center justify-center py-16" role="status" aria-live="polite"><div className="w-full max-w-2xl animate-pulse space-y-4"><div className="h-7 w-40 rounded bg-border" /><div className="h-14 w-3/4 rounded bg-border" /><div className="h-4 w-full rounded bg-border" /><div className="h-4 w-2/3 rounded bg-border" /><span className="sr-only">Cargando contenido</span></div></div>;
}

