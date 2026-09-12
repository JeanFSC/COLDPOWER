export default function PaymentsLoading() {
  return (
    <div className="space-y-5 pb-8" aria-busy="true" aria-label="Cargando pagos">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2"><div className="h-3 w-32 animate-pulse rounded bg-[#dfe8ef]" /><div className="h-8 w-64 animate-pulse rounded-lg bg-[#dfe8ef]" /><div className="h-3 w-96 max-w-full animate-pulse rounded bg-[#edf2f6]" /></div>
        <div className="h-10 w-40 animate-pulse rounded-lg bg-[#edf2f6]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-xl border border-[#e2eaf1] bg-white" />)}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-44 animate-pulse rounded-xl border border-[#e2eaf1] bg-white" />)}</div>
      <div className="h-14 animate-pulse rounded-xl border border-[#e2eaf1] bg-white" />
      <div className="h-[540px] animate-pulse rounded-xl border border-[#e2eaf1] bg-white" />
    </div>
  );
}
