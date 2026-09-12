"use client";

import { LoaderCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function AdminDashboardFooter({ loadedAt }: { loadedAt?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const label = loadedAt
    ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(loadedAt))
    : "ahora";
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e3ebf2] pt-3 text-[10px] font-semibold text-[#9aabba]"><span>Última actualización: {label}</span><button type="button" onClick={() => startTransition(() => router.refresh())} disabled={isPending} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[#607894] hover:bg-[#f3f7fb] hover:text-[#2277ee] disabled:opacity-60">{isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}Actualizar</button></div>;
}
