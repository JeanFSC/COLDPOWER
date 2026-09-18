export default function TaxonomiaLoading() {
  return (
    <div className="space-y-5 pb-8" aria-busy="true" aria-label="Cargando taxonomía">
      <div className="space-y-2">
        <div className="h-3 w-32 animate-pulse rounded bg-[#dfe8ef]" />
        <div className="h-8 w-64 animate-pulse rounded-lg bg-[#dfe8ef]" />
        <div className="h-3 w-96 max-w-full animate-pulse rounded bg-[#edf2f6]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-[420px] animate-pulse rounded-xl border border-[#e2eaf1] bg-white" />
        ))}
      </div>
    </div>
  );
}
