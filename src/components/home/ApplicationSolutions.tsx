import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const solutions = [
  { label: "Refrigeración comercial", description: "Exhibidoras, vitrinas, cuartos fríos", image: "job-refrigeracion-comercial.webp", query: "refrigeracion-comercial" },
  { label: "Cámaras frigoríficas", description: "Paneles, unidades, control", image: "job-camaras-frigorificas.webp", query: "camaras-frigorificas" },
  { label: "Aire acondicionado", description: "Residencial y comercial", image: "job-aire-acondicionado.webp", query: "aire-acondicionado" },
  { label: "Línea blanca", description: "Refrigeradoras, lavadoras, cocinas", image: "job-linea-blanca.webp", query: "linea-blanca" },
  { label: "Industria alimentaria", description: "Proceso y conservación", image: "job-industria-alimentaria.webp", query: "industria-alimentaria" },
  { label: "Mantenimiento y servicio", description: "Herramientas y consumibles", image: "job-mantenimiento-servicio.webp", query: "mantenimiento" },
] as const;

export function ApplicationSolutions() {
  return (
    <section className="home-section home-section-white home-solutions" data-home-block="application-solutions">
      <div className="home-container">
        <div className="home-section-heading">
          <div>
            <h2 className="home-section-title">Busca por el trabajo que necesitas resolver</h2>
            <p className="home-section-subtitle">Soluciones para cada tipo de proyecto o equipo</p>
          </div>
        </div>
        <div className="home-solutions-grid">
          {solutions.map(({ label, description, image, query }) => (
            <Link key={label} href={`/catalogo?aplicacion=${query}`} prefetch={false} className="home-solution-card group">
              <div className="home-solution-image"><Image src={`/images/home-espejo/${image}`} alt={label} fill sizes="(min-width: 1280px) 16vw, 45vw" className="object-cover transition duration-300 group-hover:scale-105" /></div>
              <div className="home-solution-copy"><strong>{label}</strong><small>{description}</small><ArrowRight aria-hidden="true" /></div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
