"use client";

import { useEffect } from "react";

export default function InventoryError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => { console.error("ColdPower inventory segment error", error); }, [error]);
  return (
    <div className="grid min-h-[420px] place-items-center rounded-xl border border-[#ffd1d1] bg-[#fffafa] p-6 text-center">
      <div className="max-w-md"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#c94040]">Inventario no disponible</p><h1 className="mt-2 text-[20px] font-black text-[#102a43]">No pudimos cargar los saldos persistidos</h1><p className="mt-2 text-[11px] leading-5 text-[#71869c]">La información se mantiene protegida; vuelve a intentarlo cuando la conexión con PostgreSQL esté disponible.</p><button type="button" onClick={() => unstable_retry()} className="mt-5 h-10 rounded-lg bg-[#102a43] px-4 text-[10px] font-extrabold text-white">Reintentar</button></div>
    </div>
  );
}
