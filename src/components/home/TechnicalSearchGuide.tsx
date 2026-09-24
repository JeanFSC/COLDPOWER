import Link from "next/link";
import { ArrowRight, BadgeCheck, Barcode, Boxes, FileSearch, Ruler, UserRound } from "lucide-react";

const steps = [
  { label: "Modelo del equipo", example: "Ej: R404A, 12000 BTU", icon: FileSearch, href: "/buscar" },
  { label: "Marca y ficha", example: "Ej: Embraco, LG, York", icon: BadgeCheck, href: "/catalogo" },
  { label: "Medida exacta", example: "Ej: 1/4”, 3/8”, 3000 mm", icon: Ruler, href: "/catalogo" },
  { label: "Código o SKU", example: "Ej: S13008, XR60CX", icon: Barcode, href: "/buscar" },
  { label: "Por aplicación", example: "Ej: cámara, exhibidora", icon: Boxes, href: "/catalogo" },
  { label: "Habla con un asesor", example: "Envíanos una foto", icon: UserRound, href: "/contacto" },
] as const;

export function TechnicalSearchGuide() {
  return (
    <section className="home-section home-section-white home-guide" data-home-block="technical-search">
      <div className="home-container">
        <div className="home-section-heading">
          <div>
            <h2 className="home-section-title">Avanza con el dato que ya tienes</h2>
            <p className="home-section-subtitle">Encuentra más rápido la referencia que necesitas</p>
          </div>
        </div>
        <div className="home-guide-grid">
          {steps.map(({ label, example, icon: Icon, href }) => (
            <Link key={label} href={href} prefetch={false} className="home-guide-card">
              <span className="home-guide-icon"><Icon aria-hidden="true" /></span>
              <span className="home-guide-copy"><strong>{label}</strong><small>{example}</small></span>
              <ArrowRight className="home-guide-arrow" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
