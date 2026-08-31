import type { Metadata } from "next";
import { ApplicationSolutions } from "@/components/home/ApplicationSolutions";
import { AssistanceSection } from "@/components/home/AssistanceSection";
import { BenefitsBar } from "@/components/home/BenefitsBar";
import { BrandsSection } from "@/components/home/BrandsSection";
import { CategoriesGrid } from "@/components/home/CategoriesGrid";
import { ComplementsSection } from "@/components/home/ComplementsSection";
import { Hero } from "@/components/home/Hero";
import { ProductSection } from "@/components/home/ProductSection";
import { PromoBanner } from "@/components/home/PromoBanner";
import { TechnicalSearchGuide } from "@/components/home/TechnicalSearchGuide";
import { BannerPair } from "@/components/home/BannerPair";
import { PublishedCmsBlocks } from "@/components/cms/PublishedCmsBlocks";
import { getCatalogBrands, getCatalogCategories, getCatalogProducts } from "@/lib/catalog-repository";
import { loadPublishedCms } from "@/lib/public-cms";
import { getPublicCompanySettings } from "@/lib/company-settings-runtime";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ColdPower | Catálogo técnico HVAC",
  description: "Encuentra equipos y repuestos HVAC por código, modelo o especificación. Valida compatibilidad y solicita una cotización trazable.",
};

export default async function Home() {
  const [catalogData, cms, settings] = await Promise.all([loadCatalogHomeData(), loadPublishedCms("home"), getPublicCompanySettings()]);
  return (
    <>
      {cms ? <PublishedCmsBlocks blocks={cms.blocks} /> : null}
      <Hero />
      <BenefitsBar />
      <CategoriesGrid categories={catalogData.categories} />
      <ProductSection products={catalogData.products} />
      <PromoBanner />
      <BannerPair banners={[]} />
      <TechnicalSearchGuide />
      <ApplicationSolutions />
      <ComplementsSection />
      <BrandsSection brands={catalogData.brands} />
      <AssistanceSection settings={settings} />
    </>
  );
}

async function loadCatalogHomeData() {
  try {
    const [categories, catalog, brands] = await Promise.all([
      getCatalogCategories(),
      getCatalogProducts({ pageSize: 8 }),
      getCatalogBrands(),
    ]);
    return { categories, products: catalog.products, brands };
  } catch (error) {
    console.warn("[ColdPower] Catálogo persistente no disponible para la portada.", error instanceof Error ? error.message : error);
    return { categories: [], products: [], brands: [] };
  }
}
