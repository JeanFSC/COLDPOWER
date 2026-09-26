import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import type { CatalogCategory } from "@/lib/catalog-repository";
import { BrandLogo } from "@/components/shared/BrandLogo";
import type { CompanySettings } from "@/lib/company-settings";
import { createWhatsAppLink } from "@/lib/whatsapp";
import { NewsletterForm } from "@/components/layout/NewsletterForm";
import { SocialIcon } from "@/components/layout/SocialIcon";
import { paymentMethodLabel } from "@/lib/payment-display";

function getPaymentMethodLabels(methods?: string[] | null) {
  return Array.from(new Set((methods ?? []).map((method) => paymentMethodLabel(method)).filter(Boolean))).join(" · ");
}

const socialMeta = {
  facebook: { label: "Facebook", color: "#1877f2" },
  instagram: { label: "Instagram", color: "#d946ef" },
  linkedin: { label: "LinkedIn", color: "#0a66c2" },
  youtube: { label: "YouTube", color: "#ff0000" },
} as const;

export function Footer({ categories, settings }: { categories: CatalogCategory[]; settings: CompanySettings }) {
  const currentYear = new Date().getFullYear();
  const publicCategories = categories.filter((category) => category.productCount > 0).slice(0, 5);
  const whatsappHref = settings.whatsapp ? createWhatsAppLink({ phone: settings.whatsapp, message: "Hola ColdPower, necesito asesoría técnica." }) : null;
  const configuredLegalLinks = Object.entries(settings.legalLinks ?? {});
  const requiredLegalLinks = [["Términos y condiciones", "/terminos"], ["Política de privacidad", "/privacidad"]] as const;
  const complaintLink = ["Libro de reclamaciones", "/libro-de-reclamaciones"] as const;
  const legalLinks = settings.legalPagesPublished
    ? [...requiredLegalLinks, ...configuredLegalLinks.filter(([label, href]) => ![...requiredLegalLinks, complaintLink].some(([requiredLabel, requiredHref]) => requiredLabel === label || requiredHref === href))]
    : [];
  const socialLinks = Object.entries(settings.socials ?? {}).filter(([key, value]) => Boolean(value && key in socialMeta));
  const paymentMethods = getPaymentMethodLabels(settings.paymentMethods);

  return (
    <footer className="home-footer">
      <div className="home-wide-container home-footer-grid">
        <div className="home-footer-brand">
          <BrandLogo variant="light" size="lg" showTagline />
          <p>Repuestos para refrigeración, aire acondicionado y línea blanca. Tu proyecto, nuestro respaldo.</p>
          {socialLinks.length > 0 ? (
            <div className="home-footer-socials">
              {socialLinks.map(([label, href]) => {
                const key = label.toLowerCase() as keyof typeof socialMeta;
                const meta = socialMeta[key];
                return meta ? <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={meta.label} style={{ color: meta.color }}><SocialIcon name={key} /></a> : null;
              })}
            </div>
          ) : null}
        </div>

        <FooterList title="Categorías" links={[{ label: "Explorar catálogo", href: "/catalogo" }, ...publicCategories.map((category) => ({ label: category.name, href: `/categoria/${category.slug}` })), { label: "Solicitar cotización", href: "/cotizacion" }]} />
        <FooterList title="Ayuda" links={[{ label: "¿Cómo comprar?", href: "/faq" }, { label: "Solicitar una cotización", href: "/cotizacion" }, { label: "Envío y entrega", href: "/contacto" }, { label: "Preguntas frecuentes", href: "/faq" }]} />
        <FooterList title="Mi cuenta" links={[{ label: "Ingresar", href: "/cuenta" }, { label: "Mis cotizaciones", href: "/cuenta/cotizaciones" }, { label: "Mis pedidos", href: "/cuenta/pedidos" }, { label: "Lista de deseos", href: "/cuenta" }]} />

        <div className="home-footer-contact">
          <h2>Contáctanos</h2>
          {settings.phones?.map((phone) => <a key={phone} href={`tel:${phone.replace(/\s/g, "")}`}><Phone aria-hidden="true" />{phone}</a>)}
          {settings.email ? <a href={`mailto:${settings.email}`}><Mail aria-hidden="true" />{settings.email}</a> : null}
          {settings.locations?.map((location) => <span key={location.name}><MapPin aria-hidden="true" />{location.name}{location.address ? `, ${location.address}` : ""}</span>)}
          {whatsappHref ? <a href={whatsappHref} target="_blank" rel="noreferrer" className="home-footer-whatsapp"><MessageCircle aria-hidden="true" />Escríbenos por WhatsApp</a> : null}
          {paymentMethods ? <p className="home-footer-payment"><strong>Medios de pago:</strong> {paymentMethods}</p> : null}
        </div>

        <div className="home-footer-newsletter"><NewsletterForm /></div>
      </div>
      <div className="home-footer-bottom">
        <div className="home-wide-container">
          <p>© {currentYear} ColdPower. Todos los derechos reservados.</p>
          <div>{legalLinks.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}<Link href={complaintLink[1]}>{complaintLink[0]}</Link><a href="/sitemap.xml">Mapa del sitio</a></div>
        </div>
      </div>
    </footer>
  );
}

function FooterList({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return <div className="home-footer-list"><h2>{title}</h2><ul>{links.map((link) => <li key={link.label}><Link href={link.href} prefetch={false}>{link.label}</Link></li>)}</ul></div>;
}
