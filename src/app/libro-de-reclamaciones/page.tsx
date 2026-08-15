import type { Metadata } from "next";
import { AlertTriangle, FileText } from "lucide-react";
import { FinalCTA } from "@/components/shared/FinalCTA";
import { company } from "@/data/company";

export const metadata: Metadata = {
  title: "Libro de reclamaciones",
  description: "Canal informativo para reclamos y solicitudes comerciales de ColdPower.",
};

const legalValue = (value: string | null | undefined) => value || "Dato legal pendiente";

export default function ComplaintsBookPage() {
  return (
    <>
      <section className="bg-background px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-border bg-white p-6 shadow-card sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0df] text-primary">
              <FileText className="h-6 w-6" aria-hidden="true" />
            </div>
            <span className="inline-flex items-center rounded-full border border-action-accent-500/25 bg-action-accent-500/10 px-3 py-1.5 text-[10px] font-extrabold text-primary">
              Estado: próximamente
            </span>
          </div>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
            Libro de reclamaciones
          </p>
          <h1 className="mt-3 font-display text-4xl font-black tracking-[-0.03em] text-dark">
            Canal de atención por implementar
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-gray-text">
            Esta página informa el estado actual del canal. El formulario legal, el almacenamiento seguro y el seguimiento deben implementarse con datos reales de empresa antes de habilitar el envío.
          </p>

          <div className="mt-6 grid gap-3 rounded-lg border border-action-accent-500/25 bg-action-accent-500/10 p-4 sm:grid-cols-[auto_1fr] sm:items-start">
            <AlertTriangle className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <p className="font-extrabold text-dark">Formulario legal pendiente de habilitación</p>
              <p className="mt-1 text-sm leading-6 text-gray-text">
                El canal formal todavía no está disponible. No envíes información sensible por esta ruta mientras se completa su configuración.
              </p>
            </div>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-4">
              <dt className="text-xs font-bold text-gray-text">Empresa</dt>
              <dd className="mt-2 text-sm font-extrabold text-dark">{legalValue(company.commercialName)}</dd>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <dt className="text-xs font-bold text-gray-text">RUC</dt>
              <dd className="mt-2 text-sm font-extrabold text-dark">{legalValue(company.ruc)}</dd>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <dt className="text-xs font-bold text-gray-text">Correo</dt>
              <dd className="mt-2 break-words text-sm font-extrabold text-dark">{legalValue(company.commercialEmail)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <FinalCTA
        title="¿Necesitas atención comercial inmediata?"
        description="Para cotizaciones o dudas sobre equipos y repuestos de refrigeración, utiliza el canal de contacto comercial disponible."
        secondaryLabel="Ir a contacto"
        secondaryHref="/contacto"
      />
    </>
  );
}
