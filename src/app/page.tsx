import type { Metadata } from "next";
import { CategoriesGrid } from "@/components/home/CategoriesGrid";
import { FAQ } from "@/components/home/FAQ";
import { Hero } from "@/components/home/Hero";
import { ProductSection } from "@/components/home/ProductSection";
import { PromoBanner } from "@/components/home/PromoBanner";
import { Testimonials } from "@/components/home/Testimonials";
import { FinalCTA } from "@/components/shared/FinalCTA";

export const metadata: Metadata = {
  title: "ColdPower | Equipos y repuestos de refrigeración con garantía",
  description:
    "Cotiza equipos y repuestos de refrigeración, aire acondicionado y línea blanca con asesoría especializada, garantía y envíos a todo el Perú.",
};

export default function Home() {
  return (
    <>
      <Hero />
      <CategoriesGrid />
      <ProductSection />
      <PromoBanner />
      <Testimonials />
      <FAQ />
      <FinalCTA
        eyebrow="Atención especializada"
        title="¿No estás seguro de qué equipo o repuesto necesitas?"
        description="Escríbenos con marca, modelo, capacidad y foto del repuesto. Un asesor puede ayudarte a validar compatibilidad antes de comprar."
        primaryLabel="Hablar con un especialista"
        secondaryLabel="Ver catálogo"
        secondaryHref="/catalogo"
      />
    </>
  );
}
