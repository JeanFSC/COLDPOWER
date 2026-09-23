import Link from "next/link";
import type { Metadata } from "next";
import { getAdminLandingPath } from "@/lib/admin-landing";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sin acceso | Panel admin ColdPower",
};

export default async function AdminAccessDeniedPage() {
  const actor = await requireAdmin();
  const landing = getAdminLandingPath(actor.role);

  return (
    <section className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="max-w-md">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-rose-600">Sin acceso</p>
        <h1 className="mt-2 text-xl font-black text-slate-900">No tienes permiso para ver este módulo</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Tu cuenta sigue activa, pero esta tarea requiere un permiso distinto.
        </p>
        <Link
          href={landing}
          className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
        >
          Volver a mi inicio
        </Link>
      </div>
    </section>
  );
}
