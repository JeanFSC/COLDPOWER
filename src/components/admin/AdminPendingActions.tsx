"use client";

import { ClipboardCheck, FileCheck2, FileText, PackageSearch, UsersRound } from "lucide-react";
import Link from "next/link";

type PendingAction = { id: string; label: string; count: number; href: string };

const icons = {
  "orders-to-confirm": ClipboardCheck,
  "quotes-to-follow-up": FileText,
  "payments-to-verify": FileCheck2,
  "products-to-review": PackageSearch,
  "overdue-followups": UsersRound,
} as const;

export function AdminPendingActions({ actions }: { actions: PendingAction[] }) {
  const hasPendingActions = actions.some((action) => action.count > 0);

  return (
    <section className="min-w-0 rounded-xl border border-[#e3ebf2] bg-white p-4 shadow-[0_1px_2px_rgba(16,42,67,0.03)]">
      <div>
        <h2 className="text-[14px] font-extrabold text-[#102a43]">Acciones pendientes</h2>
        <p className="mt-1 text-[10px] font-semibold text-[#8195aa]">Una vista única de lo que requiere atención.</p>
      </div>
      {hasPendingActions ? (
        <div className="mt-4 grid gap-2">
          {actions.map((action) => {
            const Icon = icons[action.id as keyof typeof icons] ?? FileText;
            return <Link key={action.id} href={action.href} className="flex min-w-0 items-center gap-2.5 rounded-lg border border-[#e7eef4] px-3 py-2.5 transition hover:border-[#2277ee] hover:bg-[#f8fbff]"><Icon className="h-4 w-4 shrink-0 text-[#607894]" aria-hidden="true" /><span className="min-w-0 flex-1 truncate text-[10px] font-bold text-[#526b84]">{action.label}</span><strong className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#eef3f8] px-1.5 text-[10px] font-extrabold text-[#304b66]">{action.count}</strong></Link>;
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-lg border border-dashed border-[#dbe8f1] bg-[#f8fbfd] px-3 py-5 text-center text-[11px] font-bold text-[#607894]">No hay acciones pendientes en este momento.</p>
      )}
    </section>
  );
}
