import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/types/product";
import type { CompanySettings } from "@/lib/company-settings";
import { HomeProductCard } from "@/components/home/HomeProductCard";
import { AssistanceSection } from "@/components/home/AssistanceSection";

export function NewArrivalsSection({ products, settings }: { products: Product[]; settings: CompanySettings }) {
  return (
    <section className="home-section home-section-soft home-lower-section" data-home-block="new-arrivals">
      <div className="home-container">
        <div className="home-lower-grid">
          <div className="home-new-main">
            <div className="home-section-heading home-section-heading-compact">
              <div>
                <h2 className="home-section-title">Nuevos ingresos</h2>
                <p className="home-section-subtitle">Las últimas referencias en nuestro catálogo</p>
              </div>
              <Link href="/catalogo?orden=updated" prefetch={false} className="home-section-link">Ver todos <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
            {products.length > 0 ? (
              <div className="home-product-grid home-new-product-grid">
                {products.map((product) => <HomeProductCard key={product.id} product={product} compact />)}
              </div>
            ) : (
              <div className="home-empty-products">Las nuevas referencias aparecerán aquí cuando sean publicadas.</div>
            )}
          </div>

          <aside className="home-rail" aria-label="Ofertas y herramientas">
            <PromoRail image="rail-ofertas-mes.webp" className="home-rail-offers" title={<>OFERTAS<br /><strong>del MES</strong></>} description="Equipos, repuestos y herramientas" href="/catalogo?vista=ofertas" button="Ver ofertas" />
            <PromoRail image="rail-herramientas-instalacion.webp" className="home-rail-tools" title={<>Herramientas<br />y equipos de instalación</>} description="Todo para un trabajo profesional" href="/catalogo?familia=herramientas" button="Ver productos" />
          </aside>

          <div className="home-help-main">
            <AssistanceSection settings={settings} />
          </div>
        </div>
      </div>
    </section>
  );
}

function PromoRail({ image, className, title, description, href, button }: { image: string; className: string; title: React.ReactNode; description: string; href: string; button: string }) {
  return (
    <div className={`home-rail-card ${className}`}>
      <Image src={`/images/home-espejo/${image}`} alt="" fill sizes="(min-width: 1280px) 20vw, 100vw" className="object-cover" />
      <div className="home-rail-shade" aria-hidden="true" />
      <div className="home-rail-copy">
        <h3>{title}</h3>
        <p>{description}</p>
        <Link href={href} prefetch={false} className="home-rail-button">{button} <ArrowRight aria-hidden="true" /></Link>
      </div>
    </div>
  );
}
