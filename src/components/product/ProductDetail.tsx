import Link from "next/link";
import { HelpCircle, ShieldCheck } from "lucide-react";
import type { Product } from "@/types/product";
import { ProductGallery } from "@/components/product/ProductGallery";
import { TechnicalIdentity } from "@/components/product/TechnicalIdentity";
import { CompatibilityPanel } from "@/components/product/CompatibilityPanel";
import { TransactionBox } from "@/components/product/TransactionBox";
import { ProductAnchors } from "@/components/product/ProductAnchors";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { AddToQuoteButton } from "@/components/cart/AddToQuoteButton";
import { Button } from "@/components/shared/Button";
import { getCatalogRelatedProducts } from "@/lib/catalog-repository";

type ProductDetailProps = { product: Product };

export async function ProductDetail({ product }: ProductDetailProps) {
  const relatedProducts = await getCatalogRelatedProducts(product.id, product.familyId);
  const quoteHref = "/cotizacion?producto=" + encodeURIComponent(product.slug) + "&sku=" + encodeURIComponent(product.sku);

  return (
    <main className="bg-background pb-24 lg:pb-0">
      <div className="cp-container py-5 sm:py-7">
        <nav className="text-xs font-semibold text-text-secondary" aria-label="Breadcrumb">
          <Link href="/catalogo" className="hover:text-primary">Catalogo</Link><span className="mx-2">/</span><span className="text-dark">{product.name}</span>
        </nav>
        <ProductAnchors />
        <section className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-10">
          <ProductGallery product={product} />
          <div className="min-w-0 space-y-7">
            <TechnicalIdentity product={product} />
            <div className="lg:sticky lg:top-28"><TransactionBox product={product} /></div>
            <CompatibilityPanel product={product} />
          </div>
        </section>
        <section id="descripcion" className="mt-12 grid gap-8 border-t border-border pt-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-brand-secondary-600">Informacion de producto</p>
            <h2 className="mt-2 font-display text-3xl font-black text-dark">Descripcion tecnica</h2>
            <p className="mt-4 max-w-3xl leading-8 text-text-secondary">{product.longDescription}</p>
            {product.compatibilityBrands && product.compatibilityBrands.length > 0 ? (
              <div className="mt-6 rounded-md border border-brand-secondary-600/20 bg-brand-secondary-600/5 p-5">
                <h3 className="flex items-center gap-2 font-bold text-dark"><ShieldCheck className="h-5 w-5 text-brand-secondary-600" aria-hidden="true" />Marcas mencionadas en la fuente</h3>
                <ul className="mt-3 grid gap-2 text-sm font-semibold text-text-secondary">{product.compatibilityBrands.map((item) => <li key={item}>{item}</li>)}</ul>
                <p className="mt-3 text-xs leading-5 text-text-secondary">Esta informacion proviene del inventario y no confirma compatibilidad con un modelo especifico.</p>
              </div>
            ) : null}
          </div>
          <aside className="h-fit rounded-md border border-border bg-white p-5">
            <h2 className="flex items-center gap-2 font-display text-xl font-black text-dark"><HelpCircle className="h-5 w-5 text-primary" aria-hidden="true" />Necesitas ayuda?</h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary">Comparte el modelo del equipo y el SKU para que un asesor revise la referencia.</p>
            <Link href="/contacto#solicitud" className="mt-4 inline-flex text-sm font-extrabold text-primary hover:underline">Solicitar asesoria tecnica</Link>
          </aside>
        </section>
        <section id="alternativas" className="mt-12 border-t border-border pt-10">
          <h2 className="font-display text-3xl font-black text-dark">Productos relacionados</h2>
          {relatedProducts.length > 0 ? <div className="mt-7"><ProductGrid products={relatedProducts} /></div> : <p className="mt-4 rounded-md border border-dashed border-border bg-white p-5 text-sm leading-6 text-text-secondary">Aun no hay relaciones validadas para esta referencia.</p>}
        </section>
        <section id="complementos" className="mt-10 rounded-lg border border-border bg-white p-6">
          <h2 className="font-display text-2xl font-black text-dark">Relaciones del catalogo</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Las relaciones se muestran unicamente cuando estan registradas y validadas en el catalogo.</p>
          <Link href="/catalogo" className="mt-4 inline-flex text-sm font-extrabold text-primary hover:underline">Volver al catalogo</Link>
        </section>
        <section id="preguntas" className="mt-10 border-b border-border pb-12">
          <h2 className="font-display text-2xl font-black text-dark">Preguntas frecuentes sobre esta referencia</h2>
          <details className="mt-4 rounded-md border border-border bg-white p-4"><summary className="cursor-pointer font-bold text-dark">El precio y el stock son definitivos?</summary><p className="mt-3 text-sm leading-6 text-text-secondary">No. El asesor confirma precio final, stock, cobertura y compatibilidad antes de aceptar la cotizacion.</p></details>
          <details className="mt-3 rounded-md border border-border bg-white p-4"><summary className="cursor-pointer font-bold text-dark">Puedo cotizar sin crear una cuenta?</summary><p className="mt-3 text-sm leading-6 text-text-secondary">Si. Puedes agregar la referencia a cotizacion o solicitar ayuda tecnica sin iniciar sesion.</p></details>
        </section>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 p-3 shadow-[0_-8px_24px_rgba(7,32,56,0.12)] backdrop-blur lg:hidden" aria-label="Acciones rápidas del producto">
        <div className="mx-auto flex max-w-lg gap-2">
          {product.price !== null ? (
            <>
              <AddToCartButton productId={product.id} purchasable size="md" className="min-w-0 flex-1" />
              <AddToQuoteButton productId={product.id} size="md" className="shrink-0 px-4" />
            </>
          ) : (
            <>
              <AddToQuoteButton productId={product.id} label="Agregar a cotización" size="md" variant="primary" className="min-w-0 flex-1" />
              <Button href={quoteHref} variant="outline" size="md" className="shrink-0 px-4">Cotizar ahora</Button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
