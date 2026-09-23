import { MessageCircle, Truck } from "lucide-react";
import { getPublicCompanySettings } from "@/lib/company-settings-runtime";
import { createWhatsAppLink } from "@/lib/whatsapp";

export async function TopBar() {
  const settings = await getPublicCompanySettings();
  const whatsappHref = settings.whatsapp
    ? createWhatsAppLink({ phone: settings.whatsapp, message: "Hola ColdPower, necesito asesoría técnica." })
    : null;
  const coverage = settings.coverage?.trim() || "Despachos coordinados";

  return (
    <div className="bg-primary text-white">
      <div className="cp-container flex min-h-8 items-center justify-between gap-4 overflow-hidden py-1.5 text-[11px] font-semibold">
        <div className="flex min-w-0 items-center gap-3 overflow-x-auto whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" aria-hidden="true" />
            {coverage}
          </span>
          <span className="hidden h-3.5 w-px bg-white/35 sm:block" aria-hidden="true" />
          <span className="hidden sm:inline">Catálogo técnico especializado</span>
          <span className="hidden h-3.5 w-px bg-white/35 md:block" aria-hidden="true" />
          <span className="hidden md:inline">Asesoría comercial especializada</span>
        </div>
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap hover:text-brand-primary-900"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            ¿Necesitas ayuda? Escríbenos por WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  );
}
