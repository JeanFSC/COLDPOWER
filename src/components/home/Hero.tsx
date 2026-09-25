import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Cog,
  Factory,
  ShieldCheck,
  Snowflake,
  Truck,
  WashingMachine,
} from "lucide-react";
import type { CompanySettings } from "@/lib/company-settings";

const applicationLinks = [
  { label: "Refrigeración comercial", icon: Building2, href: "/catalogo?aplicacion=refrigeracion-comercial" },
  { label: "Aire acondicionado", icon: Snowflake, href: "/catalogo?aplicacion=aire-acondicionado" },
  { label: "Línea blanca", icon: WashingMachine, href: "/catalogo?aplicacion=linea-blanca" },
  { label: "Industria alimentaria", icon: Factory, href: "/catalogo?aplicacion=industria-alimentaria" },
] as const;

const priority = "high";

export function Hero({ settings }: { settings?: CompanySettings }) {
  const coverage = settings?.coverage?.trim() || "Envíos a todo el Perú";

  return (
    <section className="home-hero" data-home-block="hero">
      <picture className="home-hero-picture">
        <source
          media="(max-width: 1023px)"
          srcSet="/images/home-espejo/hero-mobile-390.webp 390w, /images/home-espejo/hero-mobile-780.webp 780w"
          sizes="100vw"
        />
        <img
          src="/images/home-espejo/hero-desktop.webp"
          alt="Equipos de refrigeración y climatización en una instalación técnica"
          width="1920"
          height="430"
          sizes="100vw"
          decoding="async"
          fetchPriority={priority}
          className="home-hero-image"
        />
      </picture>
      <div className="home-hero-shade" aria-hidden="true" />
      <div className="home-container home-hero-inner">
        <div className="home-hero-copy">
          <p className="home-hero-eyebrow">Repuestos y soluciones técnicas</p>
          <h1>Todo para refrigeración<br />y aire acondicionado<br /><span>en un solo lugar</span></h1>
          <div className="home-hero-benefits">
            <span><Truck aria-hidden="true" />Miles de productos</span>
            <span><Cog aria-hidden="true" />Asesoría técnica especializada</span>
            <span><ShieldCheck aria-hidden="true" />Marcas líderes y garantía</span>
          </div>
          <div className="home-hero-actions">
            <Link href="/cotizacion" className="home-button home-button-orange">Solicitar cotización <ArrowRight aria-hidden="true" /></Link>
            <Link href="/catalogo" className="home-button home-button-white">Explorar catálogo</Link>
          </div>
          <span className="sr-only">{coverage}</span>
        </div>

        <Link href="/contacto?motivo=proyecto" className="home-hero-script">
          Tu proyecto,<br />nuestro respaldo
          <span aria-hidden="true" />
        </Link>

        <div className="home-hero-applications" aria-label="Aplicaciones atendidas">
          {applicationLinks.map(({ label, icon: Icon, href }) => (
            <Link key={label} href={href}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
