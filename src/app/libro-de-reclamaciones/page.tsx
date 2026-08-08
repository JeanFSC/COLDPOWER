import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { FinalCTA } from "@/components/shared/FinalCTA";
import { company } from "@/data/company";

export const metadata: Metadata = {
  title: "Libro de reclamaciones",
  description: "Canal informativo para reclamos y solicitudes comerciales de ColdPower.",
};

export default function ComplaintsBookPage() {
  return (
    <>
      <section className="bg-background px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-lg border border-border bg-white p-6 shadow-card sm:p-8">
          <FileText className="h-10 w-10 text-primary" aria-hidden="true" />
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
            Libro de reclamaciones
          </p>
          <h1 className="mt-3 font-display text-4xl font-black text-dark">
            Canal de atención por implementar
          </h1>
          <p className="mt-4 text-base leading-7 text-gray-text">
            Esta V1 deja la ruta preparada para el libro de reclamaciones. El formulario legal,
            almacenamiento y flujo de seguimiento deben implementarse con datos reales de empresa.
          </p>
          <dl className="mt-6 grid gap-3 rounded-md border border-border bg-background p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="font-bold text-gray-text">Empresa</dt>
              <dd className="text-right font-extrabold text-dark">{company.commercialName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-bold text-gray-text">RUC</dt>
              <dd className="text-right font-extrabold text-dark">{company.ruc}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-bold text-gray-text">Correo</dt>
              <dd className="text-right font-extrabold text-dark">{company.commercialEmail}</dd>
            </div>
          </dl>
        </div>
      </section>

      <FinalCTA
        title="¿Necesitas atención comercial inmediata?"
        description="Para cotizaciones o dudas sobre equipos y repuestos de refrigeración, continúa por WhatsApp con un asesor."
        secondaryLabel="Ir a contacto"
        secondaryHref="/contacto"
      />
    </>
  );
}
