import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, or } from "drizzle-orm";
import { ArrowRight, FileText } from "lucide-react";
import { getDb } from "@/db";
import { customerQuoteLinks, customers } from "@/db/crm-schema";
import { quotes } from "@/db/schema";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { requireUser } from "@/lib/auth";
import { publicQuoteStatus } from "@/lib/account-overview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mis cotizaciones | ColdPower",
  description: "Revisa el estado y el historial de tus solicitudes de cotización en ColdPower.",
};

const statusBadge: Record<string, { label: string; variant: "new" | "warning" | "stock" | "neutral" | "tech" }> = {
  borrador: { label: "Borrador", variant: "neutral" },
  enviada: { label: "Enviada", variant: "new" },
  evaluacion: { label: "En evaluación", variant: "warning" },
  requiere_info: { label: "Requiere información", variant: "warning" },
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
  let myQuotes: Array<{ quote: typeof quotes.$inferSelect }> = [];
  let failed = false;
  try {
    const ownership = or(eq(quotes.userId, userId), eq(customers.userId, userId));
    myQuotes = await getDb()
      .select({ quote: quotes })
      .from(quotes)
      .leftJoin(customerQuoteLinks, eq(customerQuoteLinks.quoteId, quotes.id))
      .leftJoin(customers, eq(customerQuoteLinks.customerId, customers.id))
      .where(ownership)
      .orderBy(desc(quotes.createdAt));
  } catch (error) {
    failed = true;
    console.error("ColdPower: no se pudieron cargar las cotizaciones", error);
  }

  return (
    <div className="account-subpage">
      <header className="account-subpage-header">
        <div>
          <p className="account-eyebrow">Últimas solicitudes</p>
          <h1 className="account-h1">Mis cotizaciones</h1>
          <p className="account-subtitle">Aquí puedes ver el estado operativo de cada solicitud y la última actualización del equipo comercial.</p>
        </div>
        <span className="account-status-pill"><FileText aria-hidden="true" /> {myQuotes.length} {myQuotes.length === 1 ? "solicitud" : "solicitudes"}</span>
      </header>

      {failed ? (
        <div className="account-subpage-card mt-3 p-4 text-sm font-semibold text-danger" role="alert">No pudimos cargar tus cotizaciones. Inténtalo nuevamente en unos minutos.</div>
      ) : myQuotes.length === 0 ? (
        <div className="account-empty-panel mt-3">
          <p className="font-bold text-dark">Todavía no tienes solicitudes de cotización registradas.</p>
          <p className="mt-2 text-sm leading-6 text-gray-text">Envíanos una referencia, modelo o foto del equipo para iniciar una solicitud.</p>
          <Button href="/cotizacion" variant="primary" size="sm" className="mt-4">Pedir una cotización</Button>
        </div>
      ) : (
        <div className="account-subpage-card mt-3">
          {myQuotes.map(({ quote }) => {
            const status = statusBadge[quote.status] ?? { label: publicQuoteStatus(quote.status), variant: "neutral" as const };
            return (
              <article key={quote.id} className="account-subpage-row">
                <div className="min-w-0 flex-1">
                  <p className="account-mono">{quote.trackingCode}</p>
                  <h2 className="mt-1">{quote.productName || "Consulta general"}</h2>
                  <p>{quote.message}</p>
                  <dl className="account-subpage-dl">
                    <div><dt>Solicitada</dt><dd>{quote.createdAt.toLocaleDateString("es-PE")}</dd></div>
                    <div><dt>Última actualización</dt><dd>{quote.updatedAt.toLocaleDateString("es-PE")}</dd></div>
                    <div><dt>Ubicación</dt><dd>{[quote.department, quote.province, quote.district].filter(Boolean).join(" / ") || "Por confirmar"}</dd></div>
                  </dl>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </article>
            );
          })}
        </div>
      )}
      <Link href="/cotizacion" className="account-section-link mt-3">Solicitar otra cotización <ArrowRight aria-hidden="true" /></Link>
    </div>
  );
}
