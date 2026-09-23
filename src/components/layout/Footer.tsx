import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import type { CatalogCategory } from "@/lib/catalog-repository";
import { BrandLogo } from "@/components/shared/BrandLogo";
import type { CompanySettings } from "@/lib/company-settings";
import { createWhatsAppLink } from "@/lib/whatsapp";

const paymentMethodLabels: Record<string, string> = {
  BANK_TRANSFER: "Transferencia bancaria",
  CASH: "Efectivo",
  CREDIT_CARD: "Tarjetas",
  DEBIT_CARD: "Tarjetas",
  PLIN: "Plin",
  TRANSFER: "Transferencia bancaria",
  YAPE: "Yape",
};

function getPaymentMethodLabels(methods?: string[] | null) {
  return Array.from(new Set((methods ?? []).map((method) => paymentMethodLabels[method] ?? method.replaceAll("_", " ")).filter(Boolean))).join(" · ");
}

export function Footer({ categories, settings }: { categories: CatalogCategory[]; settings: CompanySettings }) {
  const currentYear = new Date().getFullYear();
  const publicCategories = categories.filter((category) => category.productCount > 0).slice(0, 5);
  const whatsappHref = settings.whatsapp ? createWhatsAppLink({ phone: settings.whatsapp, message: "Hola ColdPower, necesito asesoría técnica." }) : null;
  const legalLinks = Object.entries(settings.legalLinks ?? {});
  const socialLinks = Object.entries(settings.socials ?? {});
  const paymentMethods = getPaymentMethodLabels(settings.paymentMethods);
  const hasContactDetails = Boolean(settings.locations?.length || settings.phones?.length || settings.email || whatsappHref);

  return (
    <footer className="cp-texture-dark text-white">
      <div className="cp-container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.9fr_0.9fr_0.9fr_1.25fr] lg:py-12">
        <div>
          <BrandLogo variant="light" />
          <p className="mt-4 max-w-xs text-sm leading-6 text-gray-light">
            Repuestos para refrigeración, aire acondicionado y línea blanca. Tu proyecto, nuestro respaldo.
          </p>
          {socialLinks.length > 0 ? (
            <div className="mt-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-secondary-600">Síguenos</p>
              <div className="mt-3 flex flex-wrap gap-2">
              {socialLinks.map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-bold capitalize text-gray-light transition hover:border-white/40 hover:text-white">
                  {label}
                </a>
              ))}
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-secondary-600">Categorías</h2>
          <ul className="mt-4 grid gap-2.5">
            <li><Link className="text-sm font-semibold text-gray-light transition hover:text-white" href="/catalogo" prefetch={false}>Explorar catálogo</Link></li>
            {publicCategories.map((category) => <li key={category.id}><Link className="text-sm font-semibold text-gray-light transition hover:text-white" href={`/categoria/${category.slug}`} prefetch={false}>{category.name}</Link></li>)}
            <li><Link className="text-sm font-semibold text-gray-light transition hover:text-white" href="/cotizacion" prefetch={false}>Solicitar cotización</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-secondary-600">Ayuda</h2>
          <ul className="mt-4 grid gap-2.5">
            <li><Link className="text-sm font-semibold text-gray-light transition hover:text-white" href="/faq" prefetch={false}>Preguntas frecuentes</Link></li>
            <li><Link className="text-sm font-semibold text-gray-light transition hover:text-white" href="/contacto" prefetch={false}>Contacto</Link></li>
            <li><Link className="text-sm font-semibold text-gray-light transition hover:text-white" href="/libro-de-reclamaciones" prefetch={false}>Libro de reclamaciones</Link></li>
            <li><Link className="text-sm font-semibold text-gray-light transition hover:text-white" href="/nosotros" prefetch={false}>Nosotros</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-secondary-600">Mi cuenta</h2>
          <ul className="mt-4 grid gap-2.5">
            <li><Link className="text-sm font-semibold text-gray-light transition hover:text-white" href="/cuenta" prefetch={false}>Ingresar</Link></li>
            <li><Link className="text-sm font-semibold text-gray-light transition hover:text-white" href="/cuenta/cotizaciones" prefetch={false}>Mis cotizaciones</Link></li>
            <li><Link className="text-sm font-semibold text-gray-light transition hover:text-white" href="/cuenta/pedidos" prefetch={false}>Mis pedidos</Link></li>
            <li><Link className="text-sm font-semibold text-gray-light transition hover:text-white" href="/carrito" prefetch={false}>Carrito de compra</Link></li>
            <li><Link className="text-sm font-semibold text-gray-light transition hover:text-white" href="/cuenta/pagos" prefetch={false}>Mis pagos</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-secondary-600">Contáctanos</h2>
          <div className="mt-4 grid gap-3">
            {settings.locations?.map((location) => <address key={location.name} className="not-italic"><p className="text-sm font-extrabold text-white">{location.name}</p>{location.address ? <p className="mt-1 flex gap-2 text-sm leading-5 text-gray-light"><MapPin className="mt-1 h-4 w-4 shrink-0 text-teal" aria-hidden="true" />{location.address}</p> : null}</address>)}
            {settings.phones?.map((phone) => <a key={phone} className="flex gap-2 text-sm font-semibold text-gray-light hover:text-white" href={`tel:${phone.replace(/\s/g, "")}`}><Phone className="h-4 w-4 text-teal" aria-hidden="true" />{phone}</a>)}
            {settings.email ? <a className="flex gap-2 break-all text-sm font-semibold text-gray-light hover:text-white" href={`mailto:${settings.email}`}><Mail className="h-4 w-4 shrink-0 text-teal" aria-hidden="true" />{settings.email}</a> : null}
            {whatsappHref ? <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 rounded-md bg-whatsapp px-3 py-2 text-sm font-extrabold text-white transition hover:bg-success"><MessageCircle className="h-4 w-4" aria-hidden="true" />Escríbenos por WhatsApp</a> : null}
            {paymentMethods ? <p className="text-xs font-semibold leading-5 text-gray-light"><span className="font-extrabold text-white">Medios de pago:</span> {paymentMethods}</p> : null}
            {!hasContactDetails ? <Link href="/contacto" className="text-sm font-semibold text-gray-light underline decoration-white/30 underline-offset-4 hover:text-white">Abrir formulario de contacto</Link> : null}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="cp-container flex flex-col gap-3 py-4 text-xs font-semibold text-gray-light sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} ColdPower. Todos los derechos reservados.</p>
          <div className="flex flex-wrap gap-3">
            {legalLinks.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}
            <Link href="/libro-de-reclamaciones">Libro de reclamaciones</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
