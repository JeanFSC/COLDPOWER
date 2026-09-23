export default function SupplierLoading() {
  return (
    <main className="min-h-screen space-y-4 bg-slate-50 p-4 sm:p-6" aria-busy="true" aria-label="Cargando proveedor">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="h-12 animate-pulse rounded-xl border border-slate-200 bg-white" />
        <div className="h-[520px] animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    </main>
  );
}
