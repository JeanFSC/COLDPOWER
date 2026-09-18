export default function ConfiguracionLoading() {
  return (
    <div className="space-y-5 pb-8" aria-busy="true" aria-label="Cargando configuración">
      <div className="space-y-2">
        <div className="h-3 w-32 animate-pulse rounded bg-[#dfe8ef]" />
        <div className="h-8 w-64 animate-pulse rounded-lg bg-[#dfe8ef]" />
        <div className="h-3 w-96 max-w-full animate-pulse rounded bg-[#edf2f6]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl border border-[#e2eaf1] bg-white" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-[420px] animate-pulse rounded-xl border border-[#e2eaf1] bg-white" />
        <div className="h-[420px] animate-pulse rounded-xl border border-[#e2eaf1] bg-white" />
      </div>
    </div>
  );
}
