import type { Metadata } from "next";
import { CatalogUnavailable } from "@/components/catalog/CatalogUnavailable";
import { CartQuotePanel } from "@/components/cart/CartQuotePanel";
import { QuoteForm } from "@/components/quote/QuoteForm";
import { QuoteSummary } from "@/components/quote/QuoteSummary";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { getCatalogProductBySlug, getCatalogStats } from "@/lib/catalog-repository";
import { getPublicCompanySettings } from "@/lib/company-settings-runtime";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Solicitar cotizacion",
  description: "Registra una solicitud de cotizacion para equipos y repuestos de ColdPower.",
};

type QuotePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function QuotePage({ searchParams }: QuotePageProps) {
  const params = await searchParams;
  const productSlug = getParam(params.producto);
  const [product, companySettings] = await Promise.all([loadQuoteProduct(productSlug), getPublicCompanySettings()]);

  if (product === null) {
    return (
      <CatalogUnavailable
        title="Las cotizaciones estan temporalmente no disponibles"
        description="No podemos preparar la cotización en este momento. Inténtalo nuevamente cuando el catálogo vuelva a estar disponible."
      />
    );
  }

  return (
    <section className="bg-background py-8 sm:py-12">
      <div className="cp-container">
        <div className="max-w-3xl">
          <SectionTitle
            eyebrow="Cotizacion"
            title="Solicita una cotizacion con contexto"
            description="Selecciona un producto o describe lo que necesitas. El equipo validara compatibilidad, disponibilidad y precio final."
          />
        </div>
        <div className="mt-8 grid w-full min-w-0 max-w-full gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
          <div className="grid w-full min-w-0 max-w-full content-start gap-6">
            <QuoteSummary product={product} />
            <CartQuotePanel />
          </div>
          <QuoteForm companySettings={companySettings} initialProduct={product ? { id: product.id, slug: product.slug, name: product.name, brand: product.brand, sku: product.sku, category: product.category, status: product.status } : undefined} />
        </div>
      </div>
    </section>
  );
}

async function loadQuoteProduct(productSlug: string | undefined) {
  try {
    if (productSlug) return await getCatalogProductBySlug(productSlug);
    await getCatalogStats();
    return undefined;
  } catch (error) {
    console.warn("[ColdPower] Cotizacion persistente no disponible.", error instanceof Error ? error.message : error);
    return null;
  }
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
