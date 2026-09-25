import { ArrowLeft, MessageCircle, SearchX } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/shared/Button";
import { WhatsAppLeadButton } from "@/components/shared/WhatsAppLeadButton";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { SearchBar } from "@/components/shared/SearchBar";
import { CategoryCard } from "@/components/home/CategoryCard";
import { getCatalogCategories } from "@/lib/catalog-repository";

export default async function NotFound() {
  let categories: Awaited<ReturnType<typeof getCatalogCategories>> = [];
  try {
    categories = (await getCatalogCategories()).filter((category) => category.productCount > 0).slice(0, 4);
  } catch {
    categories = [];
  }
  return (
    <section className="bg-surface-page px-4 py-12 sm:px-6 sm:py-20">
      <div className="cp-container">
        <div className="mx-auto max-w-3xl rounded-lg border border-border bg-white p-8 text-center shadow-card sm:p-12">
          <div className="flex justify-center"><BrandLogo /></div>
          <figure className="relative mx-auto mt-7 aspect-[4/3] w-full max-w-sm overflow-hidden rounded-lg border border-border bg-surface-page">
            <Image src="/images/404/repuesto-perdido.webp" alt="Ilustración de un repuesto HVAC que no se encuentra." fill sizes="(min-width: 768px) 28vw, 100vw" className="object-cover" />
          </figure>
          <p className="mt-7 font-mono text-xs font-bold uppercase tracking-[0.18em] text-brand-secondary-600">Error 404</p>
          <h1 className="mt-4 font-display text-4xl font-black tracking-tight text-dark">No encontramos esta página</h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-text-secondary">Busca por código, modelo o marca, o vuelve al catálogo técnico.</p>
          <SearchBar id="not-found-search" className="mx-auto mt-7 max-w-2xl" placeholder="Ej. Embraco, R404A, SKU..." />
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Button href="/catalogo" variant="outline" size="lg"><ArrowLeft className="h-5 w-5" aria-hidden="true" />Volver al catálogo</Button><WhatsAppLeadButton title="Página no encontrada" variant="whatsapp" size="lg"><MessageCircle className="h-5 w-5" aria-hidden="true" />Cotizar por WhatsApp</WhatsAppLeadButton></div>
        </div>
        {categories.length > 0 ? <div className="mx-auto mt-10 max-w-5xl"><div className="flex items-center gap-2 text-sm font-extrabold text-dark"><SearchX className="h-4 w-4 text-brand-secondary-600" aria-hidden="true" />Explora categorías publicadas</div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{categories.map((category) => <CategoryCard key={category.id} href={`/categoria/${category.slug}`} name={category.name} count={category.productCount} />)}</div></div> : null}
      </div>
    </section>
  );
}
