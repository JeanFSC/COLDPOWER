import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { branches } from "@/data/branches";
import { categories } from "@/data/categories";
import { company } from "@/data/company";
import { Badge } from "@/components/shared/Badge";
import { BrandLogo } from "@/components/shared/BrandLogo";

const interestLinks = [
  { label: "Inicio", href: "/" },
  { label: "Catálogo", href: "/catalogo" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Contacto", href: "/contacto" },
  { label: "Cotización", href: "/cotizacion" },
] as const;

const paymentMethods = ["Transferencia", "Yape", "Plin", "Tarjeta previa coordinación"] as const;

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1.2fr] lg:px-8">
        <div>
          <BrandLogo variant="light" />
          <p className="mt-4 max-w-sm text-sm leading-6 text-gray-light">
            Equipos y repuestos de refrigeración, aire acondicionado y línea blanca con cotización
            asistida, validación técnica y coordinación comercial para todo el Perú.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {paymentMethods.map((method) => (
              <Badge
                key={method}
                variant="tech"
                className="bg-white/8 text-gray-light ring-white/10"
              >
                {method}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-[0.16em] text-primary">
            Links de interés
          </h2>
          <ul className="mt-4 grid gap-3">
            {interestLinks.map((link) => (
              <li key={link.href}>
                <Link
                  className="text-sm font-semibold text-gray-light hover:text-white"
                  href={link.href}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-[0.16em] text-primary">
            Categorías
          </h2>
          <ul className="mt-4 grid gap-3">
            {categories.slice(0, 7).map((category) => (
              <li key={category.id}>
                <Link
                  className="text-sm font-semibold text-gray-light hover:text-white"
                  href={`/categoria/${category.slug}`}
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-[0.16em] text-primary">
            Contacto
          </h2>
          <div className="mt-4 grid gap-4">
            {branches.map((branch) => (
              <address key={branch.id} className="not-italic">
                <p className="text-sm font-extrabold text-white">{branch.name}</p>
                <p className="mt-1 flex gap-2 text-sm leading-6 text-gray-light">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-teal" aria-hidden="true" />
                  {branch.address}
                </p>
                <a
                  className="mt-2 flex gap-2 text-sm font-semibold text-gray-light hover:text-white"
                  href={`tel:${branch.phone.replace(/\s/g, "")}`}
                >
                  <Phone className="h-4 w-4 text-teal" aria-hidden="true" />
                  {branch.phone}
                </a>
              </address>
            ))}
            <a
              className="flex gap-2 text-sm font-semibold text-gray-light hover:text-white"
              href={`mailto:${company.commercialEmail}`}
            >
              <Mail className="h-4 w-4 text-teal" aria-hidden="true" />
              {company.commercialEmail}
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs font-semibold text-gray-light sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>Copyright {currentYear} © ColdPower. Todos los derechos reservados.</p>
          <Link
            href="/libro-de-reclamaciones"
            className="inline-flex w-fit rounded-md border border-white/15 px-3 py-2 text-white transition hover:border-primary hover:text-primary"
          >
            Libro de reclamaciones
          </Link>
        </div>
      </div>
    </footer>
  );
}
