import { ArrowRight, Mail, MessageCircle, PhoneCall, Upload } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { WhatsAppLeadButton } from "@/components/shared/WhatsAppLeadButton";
import { SectionTitle } from "@/components/shared/SectionTitle";
import type { CompanySettings } from "@/lib/company-settings";

export function AssistanceSection({ settings }: { settings: CompanySettings }) {
  const phone = settings.phones?.[0]?.trim();
  const email = settings.email?.trim();

  return (
    <section className="bg-white py-10 sm:py-14" data-home-block="assistance">
      <div className="cp-container grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
        <div>
          <SectionTitle
            eyebrow="Asesoría técnica"
            title="¿No encuentras el repuesto que necesitas?"
            description="Envíanos el modelo, código o una foto de la placa. El equipo comercial revisará el requerimiento y te indicará el siguiente paso."
          />
          <div className="mt-7 flex flex-wrap gap-3">
            <Button href="/contacto?motivo=no-encontre" size="md">
              <Upload className="h-4 w-4" aria-hidden="true" />
              Solicitar ayuda
            </Button>
            <WhatsAppLeadButton title="Asistencia técnica" variant="whatsapp" size="md">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Consultar por WhatsApp
            </WhatsAppLeadButton>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-page p-6">
          <p className="font-mono text-xs font-extrabold uppercase tracking-[0.14em] text-brand-secondary-600">
            Canales disponibles
          </p>
          <div className="mt-5 grid gap-4 text-sm text-text-secondary">
            {phone ? (
              <a
                className="flex items-center gap-3 font-semibold hover:text-brand-secondary-600"
                href={"tel:" + phone.replace(/\s/g, "")}
              >
                <PhoneCall className="h-5 w-5 text-brand-secondary-600" aria-hidden="true" />
                {phone}
              </a>
            ) : null}
            {email ? (
              <a
                className="flex items-center gap-3 break-all font-semibold hover:text-brand-secondary-600"
                href={"mailto:" + email}
              >
                <Mail className="h-5 w-5 shrink-0 text-brand-secondary-600" aria-hidden="true" />
                {email}
              </a>
            ) : null}
            {!phone && !email ? (
              <p className="flex items-start gap-3">
                <ArrowRight
                  className="mt-0.5 h-5 w-5 shrink-0 text-brand-secondary-600"
                  aria-hidden="true"
                />
                Usa el formulario para enviar tu requerimiento.
              </p>
            ) : (
              <p className="flex items-start gap-3">
                <ArrowRight
                  className="mt-0.5 h-5 w-5 shrink-0 text-brand-secondary-600"
                  aria-hidden="true"
                />
                Incluye el código o modelo para agilizar la revisión.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
