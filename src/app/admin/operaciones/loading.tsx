export default function OperationsLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite" aria-label="Cargando centro operativo">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 animate-pulse rounded-[14px] bg-[#e8f1ff]" />
          <div className="space-y-2 pt-1">
            <div className="h-7 w-56 animate-pulse rounded bg-[#e2eaf1]" />
            <div className="h-3 w-80 animate-pulse rounded bg-[#edf2f6]" />
          </div>
        </div>
        <div className="h-10 w-24 animate-pulse rounded-lg bg-[#edf2f6]" />
      </div>
      <div className="rounded-[14px] border border-[#e2eaf1] bg-white p-4">
        <div className="mb-3 h-4 w-40 animate-pulse rounded bg-[#e2eaf1]" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-9 animate-pulse rounded-lg bg-[#f1f5f8]" />)}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-[132px] animate-pulse rounded-[14px] border border-[#e2eaf1] bg-white" />)}
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_315px]">
        <div className="h-[430px] animate-pulse rounded-[14px] border border-[#e2eaf1] bg-white" />
        <div className="space-y-3"><div className="h-52 animate-pulse rounded-[14px] border border-[#e2eaf1] bg-white" /><div className="h-52 animate-pulse rounded-[14px] border border-[#e2eaf1] bg-white" /></div>
      </div>
    </div>
  );
}
