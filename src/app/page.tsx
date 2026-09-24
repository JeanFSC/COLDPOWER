import type { Metadata } from "next";
import { ApplicationSolutions } from "@/components/home/ApplicationSolutions";
import { BrandsSection } from "@/components/home/BrandsSection";
import { CategoriesGrid } from "@/components/home/CategoriesGrid";
import { Hero } from "@/components/home/Hero";
import { NewArrivalsSection } from "@/components/home/NewArrivalsSection";
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

export const revalidate = 300;

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

  const orderedProducts = orderHomeProducts(catalogData.products);

  return (
    <>
      <Hero settings={settings} />
      <CategoriesGrid
        categories={catalogData.categories}
        catalogUnavailable={catalogData.unavailable}
      />
      {cms ? <PublishedCmsBlocks blocks={cms.blocks} slot="after_categories" /> : null}
      <ProductSection products={orderedProducts} catalogUnavailable={catalogData.unavailable} />
      <TechnicalSearchGuide />
      <PromoBanner settings={settings} />
      <ApplicationSolutions />
      <BrandsSection brands={catalogData.brands} />
      <NewArrivalsSection products={orderedProducts.slice(6, 12)} settings={settings} />
    </>
  );
}

async function loadCatalogHomeData() {
  try {
    const [categories, catalog, brands] = await Promise.all([
      getCatalogCategories(),
      getCatalogProducts({ pageSize: 48, sort: "updated" }),
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

function orderHomeProducts(products: Awaited<ReturnType<typeof getCatalogProducts>>["products"]) {
  const rules = [
    /motocompresor|compresor(?!a)/i,
    /motor.*vent|ventilador/i,
    /control|termostat/i,
    /refrigerante/i,
    /h[eé]lice|ventilador/i,
    /v[aá]lvula/i,
    /presostat/i,
    /tarjeta/i,
    /bomba.*drenaje|drenaje/i,
    /condensador/i,
    /rel[eé]|protector/i,
    /filtro.*secador/i,
  ];
  const used = new Set<string>();
  const selected: typeof products = [];

  for (const rule of rules) {
    const match = products.find(
      (product) => !used.has(product.id) && rule.test(`${product.name} ${product.family ?? ""}`),
    );
    if (match) {
      used.add(match.id);
      selected.push(match);
    }
  }

  for (const product of products) {
    if (selected.length >= 24) break;
    if (!used.has(product.id)) {
      used.add(product.id);
      selected.push(product);
    }
  }

  return selected;
}
