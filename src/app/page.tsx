import type { Metadata } from "next";
import { ApplicationSolutions } from "@/components/home/ApplicationSolutions";
import { AssistanceSection } from "@/components/home/AssistanceSection";
import { BenefitsBar } from "@/components/home/BenefitsBar";
import { BrandsSection } from "@/components/home/BrandsSection";
import { CategoriesGrid } from "@/components/home/CategoriesGrid";
import { Hero } from "@/components/home/Hero";
import { HomeFaq } from "@/components/home/HomeFaq";
import { ProductSection } from "@/components/home/ProductSection";
import { PromoBanner } from "@/components/home/PromoBanner";
import { TechnicalSearchGuide } from "@/components/home/TechnicalSearchGuide";
import { PublishedCmsBlocks } from "@/components/cms/PublishedCmsBlocks";
import {
  getCatalogBrands,
  getCatalogCategories,
  getCatalogProducts,
} from "@/lib/catalog-repository";
import { loadPublishedCms } from "@/lib/public-cms";
import { getPublicCompanySettings } from "@/lib/company-settings-runtime";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ColdPower | Catálogo técnico HVAC",
  description:
    "Encuentra equipos y repuestos HVAC por código, modelo o especificación. Revisa referencias publicadas y solicita una cotización trazable.",
};

export default async function Home() {
  const [catalogData, cms, settings] = await Promise.all([
    loadCatalogHomeData(),
    loadPublishedCms("home"),
    getPublicCompanySettings(),
  ]);

  return (
    <>
      <Hero settings={settings} />
      <CategoriesGrid
        categories={catalogData.categories}
        catalogUnavailable={catalogData.unavailable}
      />
      {cms ? <PublishedCmsBlocks blocks={cms.blocks} slot="after_categories" /> : null}
      <ProductSection
        products={catalogData.products}
        catalogUnavailable={catalogData.unavailable}
      />
      <TechnicalSearchGuide />
      <BenefitsBar settings={settings} />
      <PromoBanner />
      <ApplicationSolutions />
      <BrandsSection brands={catalogData.brands} />
      <AssistanceSection settings={settings} />
      <HomeFaq />
    </>
  );
}

async function loadCatalogHomeData() {
  try {
    const [categories, catalog, brands] = await Promise.all([
      getCatalogCategories(),
      getCatalogProducts({ pageSize: 24 }),
      getCatalogBrands(),
    ]);
    return { categories, products: catalog.products, brands, unavailable: false };
  } catch (error) {
    console.warn(
      "[ColdPower] Catálogo persistente no disponible para la portada.",
      error instanceof Error ? error.message : error,
    );
    return { categories: [], products: [], brands: [], unavailable: true };
  }
}
