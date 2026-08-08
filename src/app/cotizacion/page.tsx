import type { Metadata } from "next";
import { CartQuotePanel } from "@/components/cart/CartQuotePanel";
import { QuoteForm } from "@/components/quote/QuoteForm";
import { QuoteSummary } from "@/components/quote/QuoteSummary";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { getProductBySlug } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Solicitar cotización",
  description: "Registra una solicitud de cotización para equipos y repuestos de refrigeración ColdPower.",
};

type QuotePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function QuotePage({ searchParams }: QuotePageProps) {
  const params = await searchParams;
  const productSlug = getParam(params.producto);
  const product = productSlug ? getProductBySlug(productSlug) : undefined;

  return (
    <section className="bg-background py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <SectionTitle
            eyebrow="Cotización"
            title="Solicita ayuda para encontrar la pieza correcta"
            description="Registra una solicitud de cotización y continúa la coordinación por WhatsApp con un asesor ColdPower."
          />
        </div>

        <div className="mt-8 grid w-full min-w-0 max-w-full gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="grid w-full min-w-0 max-w-full gap-6">
            <QuoteSummary product={product} />
            <CartQuotePanel />
          </div>
          <QuoteForm initialProductSlug={product?.slug} />
        </div>
      </div>
    </section>
  );
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
