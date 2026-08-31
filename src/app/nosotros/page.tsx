import type { Metadata } from "next";
import {
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  MapPinned,
  PackageCheck,
  PhoneCall,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";
import { PublishedCmsBlocks } from "@/components/cms/PublishedCmsBlocks";
import { FinalCTA } from "@/components/shared/FinalCTA";
import { loadPublishedCms } from "@/lib/public-cms";

export const metadata: Metadata = {
  title: "Nosotros | ColdPower",
  description: "Conoce ColdPower, tienda especializada en equipos y repuestos de refrigeración, aire acondicionado y línea blanca con garantía, asesoría y envíos a todo el Perú.",
};

const values = [
  { title: "Confianza", description: "Cotizaciones claras y validación previa de compatibilidad.", icon: CheckCircle2 },
  { title: "Garantía", description: "Condiciones comerciales confirmadas por asesor antes de cerrar la compra.", icon: ShieldCheck },
  { title: "Asesoría especializada", description: "Acompañamiento para identificar equipo, repuesto, SKU y aplicación correcta.", icon: Wrench },
  { title: "Rapidez", description: "Atención enfocada en resolver disponibilidad y alternativas sin fricción.", icon: Gauge },
  { title: "Cobertura nacional", description: "Coordinación de envíos y despachos a diferentes ciudades del Perú.", icon: Truck },
] as const;

const workSteps = [
  { title: "Escuchamos tu necesidad", description: "Recibimos modelo, capacidad, código, foto o referencia del repuesto.", icon: PhoneCall },
  { title: "Validamos compatibilidad", description: "Revisamos aplicación, SKU y datos técnicos antes de recomendar una opción.", icon: ClipboardCheck },
  { title: "Te cotizamos con claridad", description: "Compartimos precio referencial, estado de stock y condiciones de atención.", icon: PackageCheck },
  { title: "Coordinamos entrega o recojo", description: "Definimos el siguiente paso comercial sin simular checkout ni pago online.", icon: Truck },
] as const;

export default async function AboutPage() {
  const cms = await loadPublishedCms("nosotros");
  return (
    <>
      {cms ? <PublishedCmsBlocks blocks={cms.blocks} /> : null}
      <section className="relative overflow-hidden bg-dark text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(242,98,11,0.30),transparent_30%),linear-gradient(135deg,#0E1320,#172033)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:px-8 lg:py-20">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Nosotros</p><h1 className="mt-5 font-display text-4xl font-black leading-tight tracking-normal sm:text-6xl">Una compra técnica necesita asesoría, no solo un botón de compra</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-gray-light">ColdPower está pensado para cotizar equipos, repuestos de refrigeración, aire acondicionado y línea blanca con revisión de compatibilidad, disponibilidad referencial y coordinación directa con un asesor.</p></div>
          <div className="rounded-lg border border-white/10 bg-white/8 p-6 shadow-float"><MapPinned className="h-10 w-10 text-primary" aria-hidden="true" /><p className="mt-5 text-sm font-extrabold uppercase tracking-[0.16em] text-gray-light">Atención nacional</p><p className="mt-3 font-display text-3xl font-black">Equipos y repuestos para validar antes de coordinar</p><p className="mt-4 text-sm leading-7 text-gray-light">Priorizamos cotización asistida, trazabilidad comercial y comunicación directa antes de separar una pieza crítica.</p></div>
        </div>
      </section>
      <section className="bg-white py-14 sm:py-18"><div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Quiénes somos</p><h2 className="mt-3 font-display text-3xl font-black text-dark">Una operación comercial enfocada en reducir errores de compatibilidad</h2></div><div className="grid gap-5 text-base leading-8 text-gray-text"><p>ColdPower atiende solicitudes de equipos de refrigeración y aire acondicionado, repuestos críticos y línea blanca mediante cotización asistida. La prioridad es confirmar la pieza correcta antes de hablar de entrega o separación.</p><p>Combinamos búsqueda técnica, fichas claras y cotización asistida para ayudarte a encontrar la referencia adecuada con información comercial confirmada y acompañamiento directo.</p></div></div></section>
      <section className="bg-background py-14 sm:py-18"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="max-w-3xl"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Cómo trabajamos</p><h2 className="mt-3 font-display text-3xl font-black text-dark">Un flujo claro para compras técnicas de alto impacto</h2></div><div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{workSteps.map((step, index) => { const Icon = step.icon; return <article key={step.title} className="rounded-md border border-border bg-white p-5"><div className="flex items-center justify-between"><Icon className="h-7 w-7 text-primary" aria-hidden="true" /><span className="font-mono text-xs font-black text-gray-text">0{index + 1}</span></div><h3 className="mt-4 font-display text-xl font-black text-dark">{step.title}</h3><p className="mt-3 text-sm leading-6 text-gray-text">{step.description}</p></article>; })}</div></div></section>
      <section className="bg-white py-14 sm:py-18"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="max-w-3xl"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Por qué elegir ColdPower</p><h2 className="mt-3 font-display text-3xl font-black text-dark">Valores comerciales para una cotización más confiable</h2></div><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">{values.map((value) => { const Icon = value.icon; return <article key={value.title} className="rounded-md border border-border bg-white p-5"><Icon className="h-7 w-7 text-primary" aria-hidden="true" /><h3 className="mt-4 font-display text-xl font-black text-dark">{value.title}</h3><p className="mt-3 text-sm leading-6 text-gray-text">{value.description}</p></article>; })}</div></div></section>
      <FinalCTA title="¿Buscas un equipo o repuesto específico?" description="Cuéntanos marca, modelo, capacidad y referencia. Un asesor puede ayudarte a validar la opción correcta." secondaryLabel="Ver catálogo" secondaryHref="/catalogo" />
    </>
  );
}
