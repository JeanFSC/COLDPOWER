import { ArrowRight, Mail, MessageCircle, PhoneCall, Upload } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { WhatsAppLeadButton } from "@/components/shared/WhatsAppLeadButton";
import { SectionTitle } from "@/components/shared/SectionTitle";
import type { CompanySettings } from "@/lib/company-settings";

export function AssistanceSection({ settings }: { settings: CompanySettings }) {
  const phone = settings.phones?.[0]?.trim();
  const email = settings.email?.trim();
  const hasDirectChannels = Boolean(phone || email);

  return (
    <section className="bg-brand-primary-900 py-12 text-white sm:py-16" data-home-block="assistance">
      <div className="cp-container grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <SectionTitle eyebrow="Asistencia tecnica" title="No encuentras el repuesto que necesitas?" description="Envia modelo, codigo o una foto de la placa. Ventas puede validar la alternativa, disponibilidad y condiciones antes de cotizar." dark />
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button href="/contacto?motivo=no-encontre" variant="primary" size="lg"><Upload className="h-5 w-5" aria-hidden="true" />Solicitar ayuda</Button>
            <WhatsAppLeadButton title="Asistencia tecnica" variant="whatsapp" size="lg"><MessageCircle className="h-5 w-5" aria-hidden="true" />Consultar por WhatsApp</WhatsAppLeadButton>
          </div>
        </div>
        <div className="self-start rounded-md border border-white/15 bg-white/8 p-6">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">
            {hasDirectChannels ? "Canales disponibles" : "Siguiente paso"}
          </p>
          <div className="mt-5 grid gap-4 text-sm text-gray-light">
            {phone ? <a className="flex items-center gap-3 hover:text-white" href={"tel:" + phone.replace(/\s/g, "")}><PhoneCall className="h-5 w-5 text-amber-300" aria-hidden="true" />{phone}</a> : null}
            {email ? <a className="flex items-center gap-3 hover:text-white" href={"mailto:" + email}><Mail className="h-5 w-5 text-amber-300" aria-hidden="true" />{email}</a> : null}
            {hasDirectChannels ? (
              <p className="flex items-center gap-3"><ArrowRight className="h-5 w-5 text-amber-300" aria-hidden="true" />Respuesta comercial con codigo de seguimiento.</p>
            ) : (
              <p className="flex items-start gap-3"><ArrowRight className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />Usa el formulario para enviar modelo, codigo o una foto de la placa. El equipo te respondera con un codigo de seguimiento.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
