import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import type { CatalogCategory } from "@/lib/catalog-repository";
import { BrandLogo } from "@/components/shared/BrandLogo";
import type { CompanySettings } from "@/lib/company-settings";

const interestLinks = [
  { label: "Inicio", href: "/" },
  { label: "Catalogo", href: "/catalogo" },
  { label: "Preguntas frecuentes", href: "/faq" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Contacto", href: "/contacto" },
  { label: "Cotizacion", href: "/cotizacion" },
] as const;

export function Footer({ categories, settings }: { categories: CatalogCategory[]; settings: CompanySettings }) {
  const currentYear = new Date().getFullYear();
  const publicCategories = categories.filter((category) => category.productCount > 0).slice(0, 6);
  const hasContactDetails = Boolean(
    settings.locations?.length ||
      settings.phones?.length ||
      settings.email ||
      settings.paymentMethods?.length ||
      Object.keys(settings.legalLinks ?? {}).length,
  );
  return (
    <footer className="bg-dark text-white">
      <div className="cp-container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.25fr_0.9fr_0.9fr_1.1fr] lg:py-12">
        <div>
          <BrandLogo variant="light" />
          <p className="mt-4 max-w-sm text-sm leading-6 text-gray-light">Repuestos para refrigeracion, linea blanca y HVAC con busqueda tecnica y cotizacion asistida.</p>
        </div>
        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Ayuda</h2>
          <ul className="mt-4 grid gap-2.5">{interestLinks.map((link) => <li key={link.href}><Link className="text-sm font-semibold text-gray-light transition hover:text-white" href={link.href}>{link.label}</Link></li>)}</ul>
          <Link href="/libro-de-reclamaciones" className="mt-5 inline-flex text-sm font-semibold text-gray-light transition hover:text-white">Libro de reclamaciones</Link>
        </div>
        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Categorias</h2>
          {publicCategories.length > 0 ? (
            <ul className="mt-4 grid gap-2.5">{publicCategories.map((category) => <li key={category.id}><Link className="text-sm font-semibold text-gray-light transition hover:text-white" href={"/categoria/" + category.slug}>{category.name}</Link></li>)}</ul>
          ) : (
            <Link href="/catalogo" className="mt-4 inline-flex text-sm font-semibold text-gray-light transition hover:text-white">Explorar catálogo</Link>
          )}
        </div>
        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Contacto</h2>
          {hasContactDetails ? (
            <div className="mt-4 grid gap-3">
              {settings.locations?.map((location) => <address key={location.name} className="not-italic"><p className="text-sm font-extrabold text-white">{location.name}</p>{location.address ? <p className="mt-1 flex gap-2 text-sm leading-5 text-gray-light"><MapPin className="mt-1 h-4 w-4 shrink-0 text-teal" aria-hidden="true" />{location.address}</p> : null}</address>)}
              {settings.phones?.map((phone) => <a key={phone} className="flex gap-2 text-sm font-semibold text-gray-light hover:text-white" href={"tel:" + phone.replace(/\s/g, "")}><Phone className="h-4 w-4 text-teal" aria-hidden="true" />{phone}</a>)}
              {settings.email ? <a className="flex gap-2 text-sm font-semibold text-gray-light hover:text-white" href={"mailto:" + settings.email}><Mail className="h-4 w-4 text-teal" aria-hidden="true" />{settings.email}</a> : null}
              {settings.paymentMethods?.length ? <p className="text-xs font-semibold text-gray-light">Medios de pago confirmados: {settings.paymentMethods.join(", ")}</p> : null}
              {settings.legalLinks ? <div className="flex flex-wrap gap-3 text-xs font-semibold text-gray-light">{Object.entries(settings.legalLinks).map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}</div> : null}
            </div>
          ) : (
            <Link href="/contacto" className="mt-4 inline-flex text-sm font-semibold text-gray-light transition hover:text-white">Abrir formulario de contacto</Link>
          )}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="cp-container flex flex-col gap-2 py-4 text-xs font-semibold text-gray-light sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright {currentYear} ColdPower. Todos los derechos reservados.</p>
          <p>Catalogo tecnico para Peru</p>
        </div>
      </div>
    </footer>
  );
}
