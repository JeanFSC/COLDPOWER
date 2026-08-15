import { Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { getPublicCompanySettings } from "@/lib/company-settings-runtime";
import { createWhatsAppLink } from "@/lib/whatsapp";

export async function TopBar() {
  const settings = await getPublicCompanySettings();
  const phone = settings.phones?.[0];
  const whatsappHref = settings.whatsapp ? createWhatsAppLink({ phone: settings.whatsapp, message: "Hola ColdPower, necesito asesoría técnica." }) : null;
  const contactItems = [
    phone ? { icon: Phone, label: phone, href: "tel:" + phone.replace(/\s/g, "") } : null,
    whatsappHref ? { icon: MessageCircle, label: "WhatsApp comercial", href: whatsappHref } : null,
    settings.email ? { icon: Mail, label: settings.email, href: "mailto:" + settings.email } : null,
  ].filter(Boolean) as Array<{ icon: typeof Phone; label: string; href: string }>;

  if (contactItems.length === 0) return null;

  return (
    <div className="bg-dark text-white">
      <div className="cp-container flex min-h-8 items-center justify-between gap-4 py-1.5 text-[11px] font-semibold">
        <p className="hidden items-center gap-2 text-gray-light sm:flex"><ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />Atencion comercial ColdPower</p>
        <div className="ml-auto flex min-w-0 items-center gap-4 overflow-x-auto text-gray-light">
          {contactItems.slice(0, 2).map(({ icon: Icon, label, href }) => <a key={label} href={href} className="inline-flex shrink-0 items-center gap-1.5 hover:text-white"><Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />{label}</a>)}
        </div>
      </div>
    </div>
  );
}
