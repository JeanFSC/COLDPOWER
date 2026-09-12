"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";

export function LocationRowMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button type="button" onClick={() => setOpen((current) => !current)} aria-label="Acciones del local" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#8296a9] transition hover:bg-[#f1f4f7] hover:text-[#304b66]">
        <MoreVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} aria-label="Cerrar" />
          <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-[#dce6ee] bg-white p-1 shadow-[0_12px_28px_rgba(16,42,67,0.14)]">
            <Link href="/admin/inventario" className="block rounded-md px-3 py-2 text-left text-[11px] font-bold text-[#304b66] hover:bg-[#f4f8fb]" onClick={() => setOpen(false)}>
              Ver en Inventario
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
