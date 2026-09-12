export default function PricingLoading() {
  return <div className="space-y-5" aria-label="Cargando precios"><div className="h-20 animate-pulse rounded-2xl bg-[#edf3f8]" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-[#edf3f8]" />)}</div><div className="h-16 animate-pulse rounded-2xl bg-[#edf3f8]" /><div className="h-[520px] animate-pulse rounded-2xl bg-[#edf3f8]" /></div>;
}
