export default function PromocionesLoading() {
  return (
    <div className="space-y-5 pb-8" aria-busy="true" aria-label="Cargando promociones">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-32 animate-pulse rounded bg-[#dfe8ef]" />
          <div className="h-8 w-64 animate-pulse rounded-lg bg-[#dfe8ef]" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-full bg-[#edf2f6]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-md border border-[#e2eaf1] bg-white" />
        ))}
      </div>
      <div className="h-[480px] animate-pulse rounded-md border border-[#e2eaf1] bg-white" />
    </div>
  );
}
