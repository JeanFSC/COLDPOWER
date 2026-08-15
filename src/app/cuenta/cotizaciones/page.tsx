import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/db";
import { quotes } from "@/db/schema";
import { Badge } from "@/components/shared/Badge";

export const metadata: Metadata = {
  title: "Mis cotizaciones | ColdPower",
  description: "Revisa el estado y el historial de tus solicitudes de cotizacion en ColdPower.",
};

const statusBadge: Record<string, { label: string; variant: "new" | "warning" | "stock" | "neutral" | "tech" }> = {
  borrador: { label: "Borrador", variant: "neutral" },
  enviada: { label: "Enviada", variant: "new" },
  evaluacion: { label: "En evaluacion", variant: "warning" },
  requiere_info: { label: "Requiere informacion", variant: "warning" },
  cotizada: { label: "Cotizada", variant: "tech" },
  aprobada: { label: "Aprobada", variant: "stock" },
  convertida: { label: "Convertida", variant: "stock" },
  cerrada: { label: "Cerrada", variant: "neutral" },
  nuevo: { label: "Nueva", variant: "new" },
  contactado: { label: "Contactado", variant: "warning" },
  cerrado: { label: "Cerrado", variant: "neutral" },
};

export default async function MisCotizacionesPage() {
  const { userId } = await requireUser();

  let myQuotes: (typeof quotes.$inferSelect)[] = [];

  try {
    const db = getDb();
    myQuotes = await db
      .select()
      .from(quotes)
      .where(eq(quotes.userId, userId))
      .orderBy(desc(quotes.createdAt));
  } catch (error) {
    console.error("ColdPower: no se pudieron cargar las cotizaciones", error);
  }

  return (
    <section className="bg-background py-14 sm:py-18">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Mi cuenta</p>
        <h1 className="mt-3 font-display text-3xl font-black text-dark">Mis cotizaciones</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-text">Aqui puedes ver el estado operativo de cada solicitud y la ultima actualizacion del equipo comercial.</p>

        {myQuotes.length === 0 ? (
          <div className="mt-8 rounded-md border border-border bg-white p-6">
            <p className="text-sm text-gray-text">Todavia no tienes solicitudes de cotizacion registradas.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {myQuotes.map((quote) => {
              const status = statusBadge[quote.status] ?? { label: quote.status, variant: "neutral" as const };

              return (
                <article key={quote.id} className="rounded-md border border-border bg-white p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-mono text-xs font-black text-gray-text">{quote.id}</p>
                      <h2 className="mt-1 font-display text-lg font-black text-dark">{quote.productName || "Consulta general"}</h2>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-text">{quote.message}</p>
                  <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-xs sm:grid-cols-3">
                    <div><dt className="font-extrabold uppercase tracking-[0.08em] text-gray-text">Solicitada</dt><dd className="mt-1 font-bold text-dark">{quote.createdAt.toLocaleString("es-PE")}</dd></div>
                    <div><dt className="font-extrabold uppercase tracking-[0.08em] text-gray-text">Ultima actualizacion</dt><dd className="mt-1 font-bold text-dark">{quote.updatedAt.toLocaleString("es-PE")}</dd></div>
                    <div><dt className="font-extrabold uppercase tracking-[0.08em] text-gray-text">Ubicacion</dt><dd className="mt-1 font-bold text-dark">{[quote.department, quote.province, quote.district].filter(Boolean).join(" / ") || "Por confirmar"}</dd></div>
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
