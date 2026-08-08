import { company } from "@/data/company";
import { createWhatsAppLink } from "@/lib/whatsapp";
import { WhatsAppFloatingButton } from "@/components/shared/WhatsAppFloatingButton";

const whatsappHref = createWhatsAppLink({
  phone: company.whatsapp,
  message: "Hola ColdPower, deseo recibir asesoría para cotizar un equipo o repuesto de refrigeración.",
});

export function WhatsAppCTA() {
  return <WhatsAppFloatingButton href={whatsappHref} />;
}
