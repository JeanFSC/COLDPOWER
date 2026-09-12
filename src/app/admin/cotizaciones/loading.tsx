export default function LoadingCotizaciones() {
  return <main className="min-h-full bg-[#f7fafc] px-4 pb-12 pt-7 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1550px] animate-pulse"><div className="h-10 w-80 rounded-lg bg-[#e5edf4]" /><div className="mt-3 h-4 w-96 max-w-full rounded bg-[#e5edf4]" /><div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-36 rounded-2xl bg-white" />)}</div><div className="mt-6 h-[520px] rounded-2xl bg-white" /></div></main>;
}
