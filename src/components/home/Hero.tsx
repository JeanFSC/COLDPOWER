import Image from "next/image";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { company } from "@/data/company";
import { createWhatsAppLink } from "@/lib/whatsapp";

const whatsappHref = createWhatsAppLink({
  phone: company.whatsapp,
  message: "Hola ColdPower, deseo recibir asesoría para cotizar un equipo o repuesto de refrigeración.",
});

export function Hero() {
  return (
    <section id="hero" className="relative isolate overflow-hidden bg-dark text-white">
      <Image
        src="/images/hero-coldpower.svg"
        alt="Equipo de aire acondicionado y refrigeración en primer plano para validación técnica antes de comprar"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-dark via-dark/85 to-dark/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-dark/90 via-transparent to-dark/40" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />

      <div className="relative mx-auto flex min-h-[80svh] max-w-7xl flex-col justify-center gap-8 px-4 py-16 sm:px-6 lg:px-8">
        <BrandLogo variant="light" size="lg" href={null} />

        <div className="max-w-2xl">
          <h1 className="font-display text-4xl font-black leading-[1.06] text-white sm:text-5xl lg:text-6xl">
            Equipos y repuestos de refrigeración{" "}
            <span className="text-primary">listos para validar</span> antes de comprar
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-gray-light sm:text-lg">
            Cotiza con marca, modelo, capacidad o SKU. Revisamos compatibilidad, precio referencial
            y disponibilidad antes de coordinar la entrega.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              variant="whatsapp"
              size="lg"
              className="w-full sm:w-auto"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Cotizar por WhatsApp
            </Button>
            <Button href="/catalogo" variant="outline" size="lg" className="w-full sm:w-auto">
              Explorar catálogo
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
