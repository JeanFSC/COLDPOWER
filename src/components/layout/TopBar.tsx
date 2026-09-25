import { ArrowRightLeft, Cog, MessageCircle, Truck } from "lucide-react";
import { getPublicCompanySettings } from "@/lib/company-settings-runtime";
import { createWhatsAppLink } from "@/lib/whatsapp";

export async function TopBar() {
  const settings = await getPublicCompanySettings();
  const whatsappHref = settings.whatsapp ? createWhatsAppLink({ phone: settings.whatsapp, message: "Hola ColdPower, necesito asesoría técnica." }) : null;

  return (
    <div className="home-utility-bar" role="region" aria-label="Información de servicio">
      <div className="home-wide-container home-utility-inner">
        <div className="home-utility-items">
          <span><Truck aria-hidden="true" />Envíos a todo el Perú</span>
          <i aria-hidden="true" />
          <span><ArrowRightLeft aria-hidden="true" />Repuestos originales y alternativos</span>
          <i aria-hidden="true" />
          <span><Cog aria-hidden="true" />Asesoría técnica especializada</span>
        </div>
        {whatsappHref ? <a href={whatsappHref} target="_blank" rel="noreferrer" className="home-utility-whatsapp"><MessageCircle aria-hidden="true" />¿Necesitas ayuda? Escríbenos por WhatsApp</a> : null}
      </div>
    </div>
  );
}
