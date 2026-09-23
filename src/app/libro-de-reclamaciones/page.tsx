import type { Metadata } from "next";
import { FileText, ShieldCheck } from "lucide-react";
import { ComplaintsForm } from "@/components/complaints/ComplaintsForm";
import { company } from "@/data/company";
import { getPublicCompanySettings } from "@/lib/company-settings-runtime";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Libro de reclamaciones",
  description: "Presenta una queja o reclamo ante ColdPower y recibe un código de seguimiento.",
};

export default async function ComplaintsBookPage() {
  const settings = await getPublicCompanySettings();
  const providerName = settings.commercialName || company.commercialName;
  const providerRuc = settings.ruc || company.ruc;
  return (
    <section className="bg-surface-page py-10 sm:py-14">
      <div className="cp-container">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs font-extrabold uppercase tracking-[0.16em] text-brand-secondary-600">Atención al consumidor</p>
          <h1 className="mt-3 font-display text-4xl font-black tracking-[-0.03em] text-brand-primary-900 sm:text-5xl">Libro de reclamaciones</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary">Registra una queja o reclamo sobre una experiencia de compra o atención. La solicitud se almacena con trazabilidad y recibirás un código para identificarla.</p>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <div className="rounded-md border border-border bg-white p-4"><p className="text-xs font-bold text-text-secondary">Proveedor</p><p className="mt-2 text-sm font-extrabold text-dark">{providerName}</p></div>
            {providerRuc ? <div className="rounded-md border border-border bg-white p-4"><p className="text-xs font-bold text-text-secondary">RUC</p><p className="mt-2 text-sm font-extrabold text-dark">{providerRuc}</p></div> : null}
            <div className="rounded-md border border-border bg-white p-4"><p className="text-xs font-bold text-text-secondary">Estado</p><p className="mt-2 text-sm font-extrabold text-success">Canal habilitado</p></div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="rounded-lg border border-border bg-white p-6 shadow-card sm:p-8">
              <div className="flex items-start gap-3 border-b border-border pb-5"><FileText className="mt-0.5 h-6 w-6 shrink-0 text-brand-secondary-600" aria-hidden="true" /><div><h2 className="font-display text-2xl font-black text-dark">Datos de la solicitud</h2><p className="mt-1 text-sm text-text-secondary">Completa todos los campos obligatorios para registrar el caso.</p></div></div>
              <div className="mt-6"><ComplaintsForm /></div>
            </div>
            <aside className="h-fit rounded-lg border border-brand-secondary-600/20 bg-brand-secondary-600/5 p-5">
              <ShieldCheck className="h-6 w-6 text-brand-secondary-600" aria-hidden="true" />
              <h2 className="mt-4 font-display text-xl font-black text-dark">Trazabilidad</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">El sistema genera un código único y registra la recepción del caso para su seguimiento interno.</p>
              <p className="mt-5 text-sm leading-6 text-text-secondary">También puedes consultar información general en <a href="https://www.indecopi.gob.pe/libro-de-reclamaciones" target="_blank" rel="noreferrer" className="font-extrabold text-brand-secondary-600 underline">Indecopi</a>.</p>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}

