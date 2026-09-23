import type { Metadata } from "next";
import Image from "next/image";
import { ClipboardCheck, Headset, ShieldCheck, Truck } from "lucide-react";
import { faqItems } from "@/data/faq";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { Button } from "@/components/shared/Button";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Respuestas sobre compatibilidad, cotización, garantías, envíos y atención técnica ColdPower.",
};

const trustPoints = [
  { icon: ShieldCheck, title: "Datos trazables", description: "Mostramos SKU, marca, estado y el nivel de validación disponible." },
  { icon: ClipboardCheck, title: "Compatibilidad revisable", description: "Puedes enviar modelo, placa o especificación antes de comprar." },
  { icon: Truck, title: "Entrega coordinada", description: "Confirmamos cobertura y condiciones antes del despacho." },
  { icon: Headset, title: "Asesoría comercial", description: "Un asesor conserva el contexto de tu solicitud." },
];

export default function FaqPage() {
  return (
    <div className="bg-background">
      <section className="relative isolate overflow-hidden bg-brand-primary-900 py-12 text-white sm:py-16">
        <Image src="/images/info/faq-tecnico.webp" alt="" fill sizes="100vw" className="-z-20 object-cover object-center opacity-35" />
        <div className="absolute inset-0 -z-10 bg-brand-primary-900/85" aria-hidden="true" />
        <div className="cp-container"><SectionTitle eyebrow="Ayuda para comprar" title="Confianza técnica antes de cotizar" description="Resolvemos dudas sobre identidad, compatibilidad, disponibilidad, entrega y siguiente paso comercial." dark /></div>
      </section>
      <section className="py-10 sm:py-14" aria-labelledby="confianza-title">
        <div className="cp-container">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-secondary-600">Confianza</p><h1 id="confianza-title" className="mt-2 font-display text-3xl font-black text-dark">Qué puedes esperar de ColdPower</h1></div><Button href="/contacto?motivo=ayuda-tecnica" variant="outline">Hablar con un asesor</Button></div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{trustPoints.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-md border border-border bg-white p-5 shadow-card"><Icon className="h-6 w-6 text-brand-secondary-600" aria-hidden="true" /><h2 className="mt-4 font-bold text-dark">{title}</h2><p className="mt-2 text-sm leading-6 text-gray-text">{description}</p></article>)}</div>
        </div>
      </section>
      <section className="border-t border-border py-10 sm:py-14" aria-labelledby="questions-title">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-secondary-600">FAQ</p><h2 id="questions-title" className="mt-2 font-display text-3xl font-black text-dark">Preguntas frecuentes</h2><div className="mt-7 grid gap-3">{faqItems.map((item) => <details key={item.id} className="rounded-md border border-border bg-white p-5"><summary className="cursor-pointer font-bold text-dark">{item.question}</summary><p className="mt-3 max-w-3xl text-sm leading-7 text-gray-text">{item.answer}</p></details>)}</div></div>
      </section>
    </div>
  );
}

