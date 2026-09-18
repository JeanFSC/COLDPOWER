export default function CatalogoLoading() {
  return (
    <div className="space-y-5 pb-8" aria-busy="true" aria-label="Cargando catálogo">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-32 animate-pulse rounded bg-[#dfe8ef]" />
          <div className="h-8 w-64 animate-pulse rounded-lg bg-[#dfe8ef]" />
          <div className="h-3 w-96 max-w-full animate-pulse rounded bg-[#edf2f6]" />
        </div>
        <div className="h-10 w-40 animate-pulse rounded-lg bg-[#edf2f6]" />
      </div>
      <div className="h-14 animate-pulse rounded-xl border border-[#e2eaf1] bg-white" />
      <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="h-[520px] animate-pulse rounded-xl border border-[#e2eaf1] bg-white" />
        <div className="h-[520px] animate-pulse rounded-xl border border-[#e2eaf1] bg-white" />
      </div>
    </div>
  );
}
