import type { Metadata } from "next";
import { AlertTriangle, Clock, Mail, MapPin, MessageCircle, Phone, type LucideIcon } from "lucide-react";
import { PublishedCmsBlocks } from "@/components/cms/PublishedCmsBlocks";
import { FinalCTA } from "@/components/shared/FinalCTA";
import { WhatsAppLeadButton } from "@/components/shared/WhatsAppLeadButton";
import { Button } from "@/components/shared/Button";
import { getPublicCompanySettings } from "@/lib/company-settings-runtime";
import { loadPublishedCms } from "@/lib/public-cms";

export const metadata: Metadata = {
  title: "Contacto | ColdPower",
  description: "Comunícate con ColdPower para cotizar equipos y repuestos con asesoría especializada.",
};

const pendingLabel = "Dato pendiente de configuración";

type ContactPageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = (await searchParams) ?? {};
  const context = getContactContext(getParam(params.motivo));
  const [cms, settings] = await Promise.all([loadPublishedCms("contacto"), getPublicCompanySettings()]);

  return (
    <>
      {cms ? <PublishedCmsBlocks blocks={cms.blocks} /> : null}

      <section className="bg-background py-10 sm:py-14">
        <div className="cp-container grid gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-brand-secondary-600">
              Contacto comercial
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-black leading-tight text-dark sm:text-6xl">
              {context.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-text-secondary">
              {context.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <WhatsAppLeadButton title="Solicitud desde contacto" variant="whatsapp" size="lg" className="w-full sm:w-auto">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Cotizar por WhatsApp
              </WhatsAppLeadButton>
              <Button href="/cotizacion" variant="outline" size="lg" className="w-full sm:w-auto">
                Ir a cotizacion
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-white p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-secondary-600">
                  Atención directa
                </p>
                <h2 className="mt-2 font-display text-2xl font-black text-dark">Canales comerciales</h2>
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full border border-action-accent-500/25 bg-action-accent-500/10 px-2.5 py-1 text-[10px] font-extrabold text-action-accent-700">
                Configuración en curso
              </span>
            </div>
            <div className="mt-6 grid gap-3">
              <ContactLine icon={Phone} label="Telefono" value={settings.phones?.[0]} />
              <ContactLine icon={MessageCircle} label="WhatsApp" value={settings.whatsapp} />
              <ContactLine icon={Mail} label="Correo" value={settings.email} />
              <ContactLine icon={Clock} label="Horario" value={settings.hours} />
            </div>
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-action-accent-500/25 bg-action-accent-500/10 p-4 text-sm leading-6 text-text-secondary">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-action-accent-600" aria-hidden="true" />
              <div>
                <p className="font-extrabold text-dark">Canal pendiente de configuración</p>
                <p className="mt-1">
                  Se mostrará cuando la empresa complete sus datos comerciales. Mientras tanto, puedes enviar una referencia por cotización.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface-page py-12 sm:py-16">
        <div className="cp-container grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-brand-secondary-600">
              Sedes y cobertura
            </p>
            <h2 className="mt-3 font-display text-3xl font-black text-dark">
              Atencion comercial y despachos coordinados
            </h2>
            <div className="mt-8 grid gap-5">
              {settings.locations?.length ? (
                settings.locations.map((location) => (
                  <article key={location.name} className="rounded-md border border-border bg-white p-5">
                    <h3 className="font-display text-xl font-black text-dark">{location.name}</h3>
                    <p className="mt-3 text-sm text-text-secondary">{location.address || pendingLabel}</p>
                    <p className="mt-2 text-sm text-text-secondary">{settings.hours || pendingLabel}</p>
                  </article>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-white p-5">
                  <p className="font-extrabold text-dark">Sedes pendientes de configuración</p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    La cobertura y las ubicaciones se mostrarán cuando existan datos comerciales confirmados.
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-lg border border-border bg-white p-6 shadow-card">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-brand-secondary-600">
              Mapa referencial
            </p>
            <div className="mt-5 flex min-h-80 flex-col justify-between rounded-md border border-dashed border-border bg-surface-page p-5">
              <div>
                <MapPin className="h-10 w-10 text-primary" aria-hidden="true" />
                <h3 className="mt-4 font-display text-2xl font-black text-dark">
                  Ubicación pendiente de configuración
                </h3>
                <p className="mt-3 text-sm leading-6 text-text-secondary">
                  La ubicación y los despachos se coordinarán directamente con un asesor cuando los datos estén disponibles.
                </p>
                <p className="mt-4 flex gap-2 rounded-md bg-white p-3 text-xs font-semibold leading-5 text-text-secondary">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  No se publica una dirección inventada.
                </p>
              </div>
              <Button href="/cotizacion" className="mt-6 w-full">Ir a cotizacion</Button>
            </div>
          </aside>
        </div>
      </section>

      <FinalCTA
        title="Tienes una referencia, foto o SKU?"
        description="Envia los datos disponibles y te ayudamos a convertirlos en una cotizacion clara."
        secondaryLabel="Explorar catalogo"
        secondaryHref="/catalogo"
      />
    </>
  );
}

const contactContexts = {
  "no-encontre": {
    title: "No encuentras el repuesto? Envíanos lo que tengas",
    description: "Comparte modelo, SKU, foto o la información disponible. El equipo te ayuda a identificar la referencia antes de coordinar.",
  },
  validacion: {
    title: "Valida una alternativa antes de cotizar",
    description: "Comparte la referencia original, el modelo del equipo y cualquier especificación disponible para revisar la alternativa.",
  },
  "ayuda-tecnica": {
    title: "Habla con un asesor técnico",
    description: "Cuéntanos qué necesitas resolver y te orientaremos con la información disponible del catálogo.",
  },
} as const;

function getContactContext(value: string | undefined) {
  return (value && value in contactContexts ? contactContexts[value as keyof typeof contactContexts] : undefined) ?? {
    title: "Envíe la referencia y avancemos con una cotización clara",
    description: "Comparte modelo, SKU, foto o la información disponible. El equipo te ayuda a validar la referencia antes de coordinar.",
  };
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function ContactLine({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null | undefined;
}) {
  const available = Boolean(value);
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-surface-page p-4">
      <Icon className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-text-secondary">{label}</p>
        <p className={`mt-1 font-extrabold ${available ? "text-dark" : "text-text-secondary"}`}>
          {available ? value : "Canal pendiente de configuración"}
        </p>
        {!available ? <p className="mt-1 text-xs leading-5 text-text-secondary">Se mostrará cuando la empresa complete sus datos comerciales.</p> : null}
      </div>
    </div>
  );
}
