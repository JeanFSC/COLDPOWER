import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CatalogUnavailable } from "@/components/catalog/CatalogUnavailable";
import { ProductDetail } from "@/components/product/ProductDetail";
import { getCatalogProductBySlug } from "@/lib/catalog-repository";
import { evaluateProductPublication } from "@/lib/publication";
import type { Product } from "@/types/product";

export const revalidate = 300;

type ProductPageProps = { params: Promise<{ slug: string }> };

const getCachedProduct = cache(async (slug: string) => getCatalogProductBySlug(slug));

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const product = await getCachedProduct(slug);
    if (!product) return { title: "Producto no encontrado", robots: { index: false, follow: false } };
    const publication = evaluateProductPublication(product);
    const image = product.images[0] ?? "/images/og/og-tienda.webp";
    return {
      title: product.name,
      description: product.shortDescription,
      alternates: { canonical: `/producto/${product.slug}` },
      openGraph: { title: product.name, description: product.shortDescription, type: "website", images: [{ url: image, alt: product.name }] },
      robots: publication.isPublic ? { index: true, follow: true } : { index: false, follow: false },
    };
  } catch (error) {
    console.warn("[ColdPower] Metadata de producto no disponible.", error instanceof Error ? error.message : error);
    return { title: "Catálogo temporalmente no disponible", robots: { index: false, follow: false } };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (product === null) {
    return <CatalogUnavailable title="La ficha técnica está temporalmente no disponible" description="No podemos mostrar esta ficha técnica en este momento. Inténtalo nuevamente en unos minutos o solicita ayuda técnica." />;
  }
  if (!product) notFound();

  const image = product.images[0] ?? "/images/og/og-tienda.webp";
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.shortDescription,
    image: [image],
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    offers: product.price !== null ? {
      "@type": "Offer",
      price: product.price.toFixed(2),
      priceCurrency: product.priceCurrency ?? "PEN",
      availability: product.status === "out-of-stock" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url: `/producto/${product.slug}`,
    } : undefined,
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: "/" },
      { "@type": "ListItem", position: 2, name: "Catálogo", item: "/catalogo" },
      { "@type": "ListItem", position: 3, name: product.name, item: `/producto/${product.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <ProductDetail product={product} />
    </>
  );
}

async function loadProduct(slug: string): Promise<Product | undefined | null> {
  try {
    return await getCachedProduct(slug);
  } catch (error) {
    console.warn("[ColdPower] Ficha de producto persistente no disponible.", error instanceof Error ? error.message : error);
    return null;
  }
}

