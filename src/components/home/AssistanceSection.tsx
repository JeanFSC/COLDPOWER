import Link from "next/link";
import { ArrowRight, Camera, ClipboardList, FileCode2, MessageCircle, ScanLine } from "lucide-react";
import type { CompanySettings } from "@/lib/company-settings";
import { HomeFaq } from "@/components/home/HomeFaq";
import { createWhatsAppLink } from "@/lib/whatsapp";

const adviceSteps = [
  { label: "Envíanos una foto", icon: Camera },
  { label: "Indica modelo", icon: ScanLine },
  { label: "Comparte el código", icon: FileCode2 },
  { label: "Cuéntanos tu proyecto", icon: ClipboardList },
] as const;

export function AssistanceSection({ settings }: { settings: CompanySettings }) {
  const whatsappHref = settings.whatsapp ? createWhatsAppLink({ phone: settings.whatsapp, message: "Hola ColdPower, necesito ayuda para encontrar un repuesto." }) : "/contacto?motivo=no-encontre";

  return (
    <div className="home-help-layout" data-home-block="assistance">
      <HomeFaq />
      <div className="home-advice-block">
        <h2 className="home-help-title">¿No encuentras el repuesto que necesitas?</h2>
        <p className="home-help-subtitle">Nuestro equipo te ayuda a ubicarlo. Envíanos el modelo, una foto o la especificación técnica.</p>
        <div className="home-advice-grid">
          {adviceSteps.map(({ label, icon: Icon }) => (
            <span key={label} className="home-advice-card"><Icon aria-hidden="true" /><strong>{label}</strong></span>
          ))}
        </div>
        <Link href={whatsappHref} target={whatsappHref.startsWith("http") ? "_blank" : undefined} rel={whatsappHref.startsWith("http") ? "noreferrer" : undefined} className="home-button home-button-orange home-help-button">
          <MessageCircle aria-hidden="true" />Solicitar ayuda por WhatsApp <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
