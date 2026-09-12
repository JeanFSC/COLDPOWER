"use client";

export default function AdminCrmError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="flex min-h-[50vh] items-center justify-center"><div className="max-w-md rounded-xl border border-[#f0d6ce] bg-white p-6 text-center shadow-sm"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d75942]">Pipeline no disponible</p><h1 className="mt-2 text-xl font-black text-[#173654]">No pudimos cargar las oportunidades</h1><p className="mt-2 text-xs font-semibold leading-5 text-[#71879b]">Revisa la conexión y vuelve a intentar. No se muestra información inventada cuando la fuente de datos no responde.</p><button type="button" onClick={reset} className="mt-5 rounded-lg bg-[#2277ee] px-4 py-2 text-xs font-extrabold text-white">Reintentar</button></div></main>;
}
