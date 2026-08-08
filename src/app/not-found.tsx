import { MessageCircle } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { company } from "@/data/company";
import { createWhatsAppLink } from "@/lib/whatsapp";

const whatsappHref = createWhatsAppLink({
  phone: company.whatsapp,
  message: "Hola ColdPower, no encontré la página o producto que buscaba y necesito asesoría.",
});

export default function NotFound() {
  return (
    <section className="bg-background px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-lg bg-dark p-8 text-center text-white shadow-float sm:p-10">
        <div className="flex justify-center">
          <BrandLogo variant="light" compact />
        </div>
        <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
          Error 404
        </p>
        <h1 className="mt-4 font-display text-4xl font-black tracking-normal">
          No encontramos esta página
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-gray-light">
          El producto o sección que buscas puede haber cambiado.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button href="/catalogo" variant="outline" size="lg" className="w-full sm:w-auto">
            Volver al catálogo
          </Button>
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
        </div>
      </div>
    </section>
  );
}
