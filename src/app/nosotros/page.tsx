import type { Metadata } from "next";
import Image from "next/image";
import { CheckCircle2, ClipboardCheck, ShieldCheck, Truck, Wrench } from "lucide-react";
import { FinalCTA } from "@/components/shared/FinalCTA";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Nosotros",
  description: "Conoce el enfoque de ColdPower para equipos, repuestos y cotización técnica.",
};

const values = [
  ["Confianza", "Cotizaciones claras y validación previa.", CheckCircle2],
  ["Garantía", "Condiciones confirmadas por un asesor.", ShieldCheck],
  ["Asesoría", "Ayuda para identificar SKU y aplicación.", Wrench],
  ["Cobertura", "Coordinación de despachos según destino.", Truck],
] as const;

const timeline = [
  ["01", "Identificamos", "Recibimos modelo, código, foto o referencia."],
  ["02", "Validamos", "Revisamos SKU, familia y datos disponibles."],
  ["03", "Cotizamos", "Compartimos el siguiente paso comercial."],
  ["04", "Coordinamos", "Definimos entrega o recojo antes de cerrar."],
] as const;

export default function AboutPage() {
  return (
    <div className="bg-background">
      <section className="bg-brand-primary-900 text-white">
        <div className="cp-container grid gap-8 py-12 sm:py-16 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:py-20">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-action-accent-500">Nosotros</p><h1 className="mt-4 max-w-2xl font-display text-4xl font-black leading-tight tracking-[-0.04em] sm:text-6xl">Una compra técnica necesita asesoría, no solo un botón.</h1><p className="mt-5 max-w-xl text-base leading-7 text-white/75">ColdPower conecta búsqueda técnica, fichas claras y cotización asistida para equipos y repuestos de refrigeración, aire acondicionado y línea blanca.</p></div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/15 shadow-float"><Image src="/images/info/nosotros-almacen.webp" alt="Equipo ColdPower revisando una referencia en un almacén técnico" fill priority sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" /><span className="absolute bottom-3 left-3 rounded-pill bg-brand-primary-900/80 px-3 py-1.5 text-[11px] font-bold text-white">Imagen referencial</span></div>
        </div>
      </section>
      <section className="bg-white py-12 sm:py-16"><div className="cp-container grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-secondary-600">Cómo trabajamos</p><h2 className="mt-3 max-w-md font-display text-3xl font-black text-dark">Reducimos errores antes de separar una pieza crítica.</h2></div><div className="grid gap-3 sm:grid-cols-2">{timeline.map(([number, title, description]) => <article key={number} className="rounded-md border border-border bg-surface-page p-5"><div className="flex items-center justify-between"><span className="font-mono text-xs font-black text-brand-secondary-600">{number}</span><ClipboardCheck className="h-5 w-5 text-brand-secondary-600" aria-hidden="true" /></div><h3 className="mt-5 font-display text-xl font-black text-dark">{title}</h3><p className="mt-2 text-sm leading-6 text-gray-text">{description}</p></article>)}</div></div></section>
      <section className="bg-background py-12 sm:py-16"><div className="cp-container"><div className="max-w-2xl"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-secondary-600">Principios</p><h2 className="mt-3 font-display text-3xl font-black text-dark">Lo que cuidamos en cada solicitud</h2></div><div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{values.map(([title, description, Icon]) => <article key={title} className="rounded-md border border-border bg-white p-5 shadow-card"><Icon className="h-6 w-6 text-brand-secondary-600" aria-hidden="true" /><h3 className="mt-4 font-display text-xl font-black text-dark">{title}</h3><p className="mt-2 text-sm leading-6 text-gray-text">{description}</p></article>)}</div></div></section>
      <FinalCTA title="¿Buscas un equipo o repuesto específico?" description="Cuéntanos marca, modelo, capacidad y referencia para revisar el siguiente paso." secondaryLabel="Ver catálogo" secondaryHref="/catalogo" />
    </div>
  );
}
