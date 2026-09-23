"use client";

export default function GlobalError({ unstable_retry }: { unstable_retry: () => void }) {
  return <html lang="es-PE"><body className="bg-[#F4F7F9] text-[#0B2239]"><main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center"><p className="font-mono text-xs font-extrabold uppercase tracking-[0.16em] text-[#0F6FAE]">ColdPower</p><h1 className="mt-3 font-sans text-3xl font-black">El sitio necesita reintentarse</h1><p className="mt-3 text-sm leading-6 text-[#667085]">Ocurrió un error inesperado.</p><button type="button" onClick={unstable_retry} className="mt-6 rounded-full bg-[#F59E0B] px-5 py-3 text-sm font-extrabold text-[#0B2239]">Reintentar</button></main></body></html>;
}
