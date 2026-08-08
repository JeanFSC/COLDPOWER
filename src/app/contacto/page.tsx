import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { FinalCTA } from "@/components/shared/FinalCTA";
import { Button } from "@/components/shared/Button";
import { branches } from "@/data/branches";
import { company } from "@/data/company";
import { createWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contacto | ColdPower",
  description:
    "Comunícate con ColdPower para cotizar equipos y repuestos de refrigeración con asesoría especializada.",
};

const whatsappHref = createWhatsAppLink({
  phone: company.whatsapp,
  message: "Hola ColdPower, deseo recibir asesoría para cotizar un equipo o repuesto de refrigeración.",
});

export default function ContactPage() {
  return (
    <>
      <section className="bg-dark px-4 py-14 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
              Contacto
            </p>
            <h1 className="mt-5 font-display text-4xl font-black leading-tight tracking-normal sm:text-6xl">
              Envíanos la referencia y avanzamos con una cotización clara
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-light">
              WhatsApp es el canal operativo temporal para validar compatibilidad, disponibilidad y
              el siguiente paso comercial.
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
              <Button href="/cotizacion" variant="outline" size="lg" className="w-full sm:w-auto">
                Ir a cotización
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/8 p-6 shadow-float">
            <h2 className="font-display text-2xl font-black">Canales comerciales</h2>
            <div className="mt-6 grid gap-4">
              <ContactLine icon={Phone} label="Teléfono" value={company.primaryPhone} />
              <ContactLine icon={MessageCircle} label="WhatsApp" value={company.primaryPhone} />
              <ContactLine icon={Mail} label="Correo" value={company.commercialEmail} />
              <ContactLine icon={Clock} label="Horario" value={company.schedule} />
            </div>
            <div className="mt-5 rounded-md border border-primary/30 bg-primary/10 p-4 text-sm leading-6 text-gray-light">
              <p className="font-extrabold text-white">Datos comerciales por confirmar</p>
              <p className="mt-1">
                Teléfono, RUC, dirección y redes siguen como placeholders hasta cargar datos reales
                de operación.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-14 sm:py-18">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
              Sedes y cobertura
            </p>
            <h2 className="mt-3 font-display text-3xl font-black text-dark">
              Atención comercial y despachos coordinados
            </h2>
            <div className="mt-8 grid gap-5">
              {branches.map((branch) => (
                <article key={branch.id} className="rounded-md border border-border bg-white p-5">
                  <h3 className="font-display text-xl font-black text-dark">{branch.name}</h3>
                  <p className="mt-3 flex gap-2 text-sm leading-6 text-gray-text">
                    <MapPin className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {branch.address}
                  </p>
                  <p className="mt-2 flex gap-2 text-sm leading-6 text-gray-text">
                    <Phone className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {branch.phone}
                  </p>
                  <p className="mt-2 flex gap-2 text-sm leading-6 text-gray-text">
                    <Clock className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {branch.schedule}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-border bg-white p-6 shadow-card">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
              Mapa referencial
            </p>
            <div className="mt-5 flex min-h-80 flex-col justify-between rounded-md border border-dashed border-border bg-background p-5">
              <div>
                <MapPin className="h-10 w-10 text-primary" aria-hidden="true" />
                <h3 className="mt-4 font-display text-2xl font-black text-dark">
                  Ubicación comercial por confirmar
                </h3>
                <p className="mt-3 text-sm leading-6 text-gray-text">
                  En esta V1 no se integra Google Maps. La ubicación y los despachos se coordinan
                  directamente con un asesor.
                </p>
                <p className="mt-4 flex gap-2 rounded-md bg-white p-3 text-xs font-semibold leading-5 text-gray-text">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Este bloque queda preparado para reemplazarse por datos reales antes de publicar.
                </p>
              </div>
              <Button href="/cotizacion" className="mt-6 w-full">
                Ir a cotización
              </Button>
            </div>
          </aside>
        </div>
      </section>

      <FinalCTA
        title="¿Tienes una referencia, foto o SKU?"
        description="Envíanos los datos disponibles y te ayudamos a convertirlos en una cotización clara."
        secondaryLabel="Explorar catálogo"
        secondaryHref="/catalogo"
      />
    </>
  );
}

function ContactLine({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-md border border-white/10 bg-white/8 p-4">
      <Icon className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-gray-light">
          {label}
        </p>
        <p className="mt-1 font-extrabold text-white">{value}</p>
      </div>
    </div>
  );
}
