import type { MetadataRoute } from "next";
import { categories } from "@/data/categories";
import { products } from "@/data/products";
import { siteConfig } from "@/lib/env";

const staticRoutes = [
  "",
  "/catalogo",
  "/buscar",
  "/cotizacion",
  "/nosotros",
  "/contacto",
  "/libro-de-reclamaciones",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteConfig.siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${siteConfig.siteUrl}/categoria/${category.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${siteConfig.siteUrl}/producto/${product.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: product.featured ? 0.9 : 0.75,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
