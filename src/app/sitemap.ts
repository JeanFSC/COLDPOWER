import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/env";
import { getAllCatalogProductsForSitemap } from "@/lib/catalog-sitemap";
import { getCatalogCategories } from "@/lib/catalog-repository";
import { getPublicCompanySettings } from "@/lib/company-settings-runtime";

const staticRoutes = ["", "/catalogo", "/buscar", "/cotizacion", "/faq", "/nosotros", "/contacto", "/libro-de-reclamaciones"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const settings = await getPublicCompanySettings();
  const legalRoutes = settings.legalPagesPublished ? ["/terminos", "/privacidad", "/cambios-y-devoluciones"] : [];
  const staticEntries: MetadataRoute.Sitemap = [...staticRoutes, ...legalRoutes].map((route) => ({ url: `${siteConfig.siteUrl}${route}`, lastModified: now, changeFrequency: route === "" ? "weekly" : "monthly", priority: route === "" ? 1 : 0.7 }));
  try {
    const [categories, products] = await Promise.all([getCatalogCategories(), getAllCatalogProductsForSitemap()]);
    const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({ url: `${siteConfig.siteUrl}/categoria/${category.slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.8 }));
    const productEntries: MetadataRoute.Sitemap = products.map((product) => ({ url: `${siteConfig.siteUrl}/producto/${product.slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.75 }));
    return [...staticEntries, ...categoryEntries, ...productEntries];
  } catch (error) {
    console.warn("[ColdPower] Sitemap sin catálogo persistente.", error instanceof Error ? error.message : error);
    return staticEntries;
  }
}
