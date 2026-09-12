"use client";

export default function PricingError({ reset }: { reset: () => void }) {
  return <div className="rounded-2xl border border-[#ffd0d0] bg-[#fff7f7] p-8 text-center"><h2 className="text-[16px] font-black text-[#173654]">No pudimos cargar los precios</h2><p className="mt-2 text-[11px] font-semibold text-[#8195aa]">Revisa la conexión y vuelve a intentarlo.</p><button type="button" onClick={reset} className="mt-5 h-10 rounded-xl bg-[#2277ee] px-4 text-[11px] font-extrabold text-white">Reintentar</button></div>;
}
