export default function AdminCrmLoading() {
  return <main className="space-y-5" aria-label="Cargando pipeline"><div className="h-20 animate-pulse rounded-xl bg-[#eaf0f5]" /><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-[#eaf0f5]" />)}</div><div className="h-12 animate-pulse rounded-xl bg-[#eaf0f5]" /><div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-96 animate-pulse rounded-xl bg-[#eaf0f5]" />)}</div></main>;
}
