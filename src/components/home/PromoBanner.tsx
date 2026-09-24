import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageCircle, PackageCheck, ShieldCheck } from "lucide-react";
import type { CompanySettings } from "@/lib/company-settings";

const benefits = [
  { label: "Asesoría técnica especializada", icon: ShieldCheck },
  { label: "Productos originales y alternativos", icon: CheckCircle2 },
  { label: "Envíos a todo el Perú", icon: PackageCheck },
  { label: "Soporte por WhatsApp", icon: MessageCircle, whatsapp: true },
] as const;

export function PromoBanner({ settings }: { settings?: CompanySettings }) {
  const coverage = settings?.coverage?.trim() || "Envíos a todo el Perú";
  const labels = benefits.map((benefit) => benefit.label === "Envíos a todo el Perú" ? coverage : benefit.label);

  return (
    <section className="home-section home-section-soft home-promo-section" data-home-block="promo-banner">
      <div className="home-promo-card">
        <Image src="/images/home-espejo/banner-navy.webp" alt="Instalación técnica de refrigeración" fill sizes="(min-width: 1280px) 1760px, 100vw" className="home-promo-image" />
        <div className="home-promo-shade" aria-hidden="true" />
        <div className="home-promo-content home-container">
          <div className="home-promo-copy">
            <h2>Tu proyecto, nuestro respaldo</h2>
            <p>Repuestos, asesoría y soluciones para que tu operación nunca se detenga.</p>
            <Link href="/cotizacion" className="home-button home-button-orange">Solicitar cotización <ArrowRight aria-hidden="true" /></Link>
          </div>
        </div>
        <div className="home-promo-benefits" aria-label="Beneficios de ColdPower">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            const isWhatsapp = "whatsapp" in benefit && benefit.whatsapp;
            return (
            <span key={labels[index]} className={isWhatsapp ? "is-whatsapp" : ""}>
              <Icon aria-hidden="true" />
              {labels[index]}
            </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
