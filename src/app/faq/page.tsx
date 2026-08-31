import type { Metadata } from "next";
import { ClipboardCheck, Headset, ShieldCheck, Truck } from "lucide-react";
import { faqItems } from "@/data/faq";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { Button } from "@/components/shared/Button";

export const metadata: Metadata = {
  title: "FAQ y confianza técnica",
  description: "Respuestas sobre compatibilidad, cotización, garantías, envíos y atención técnica ColdPower.",
};

const trustPoints = [
  { icon: ShieldCheck, title: "Datos trazables", description: "Mostramos SKU, marca, estado y el nivel de validación disponible." },
  { icon: ClipboardCheck, title: "Compatibilidad revisable", description: "Puedes enviar modelo, placa o especificación para confirmar antes de comprar." },
  { icon: Truck, title: "Entrega coordinada", description: "Confirmamos cobertura, disponibilidad real y condiciones antes del despacho." },
  { icon: Headset, title: "Asesoría comercial", description: "Un asesor conserva el contexto de tu solicitud y te propone el siguiente paso." },
];

export default function FaqPage() {
  return (
    <main className="bg-background">
      <section className="bg-brand-primary-900 py-12 text-white sm:py-16">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
          <SectionTitle eyebrow="Ayuda para comprar" title="Confianza técnica antes de cotizar" description="Resolvemos las dudas que más impactan una compra B2B: identidad, compatibilidad, disponibilidad, entrega y siguiente paso comercial." dark />
        </div>
      </section>

      <section className="py-10 sm:py-14" aria-labelledby="confianza-title">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Confianza</p><h1 id="confianza-title" className="mt-2 font-display text-3xl font-black text-dark">Qué puedes esperar de ColdPower</h1></div>
            <Button href="/contacto?motivo=ayuda-tecnica" variant="outline">Hablar con un asesor</Button>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trustPoints.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-md border border-border bg-white p-5 shadow-card"><Icon className="h-6 w-6 text-primary" aria-hidden="true" /><h2 className="mt-4 font-bold text-dark">{title}</h2><p className="mt-2 text-sm leading-6 text-gray-text">{description}</p></article>)}
          </div>
        </div>
      </section>

      <section className="border-t border-border py-10 sm:py-14" aria-labelledby="questions-title">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">FAQ</p>
          <h2 id="questions-title" className="mt-2 font-display text-3xl font-black text-dark">Preguntas frecuentes</h2>
          <div className="mt-7 grid gap-3">
            {faqItems.map((item) => <details key={item.id} className="rounded-md border border-border bg-white p-5"><summary className="cursor-pointer font-bold text-dark">{item.question}</summary><p className="mt-3 max-w-3xl text-sm leading-7 text-gray-text">{item.answer}</p></details>)}
          </div>
        </div>
      </section>
    </main>
  );
}
