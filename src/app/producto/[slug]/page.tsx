import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogUnavailable } from "@/components/catalog/CatalogUnavailable";
import { ProductDetail } from "@/components/product/ProductDetail";
import { getCatalogProductBySlug } from "@/lib/catalog-repository";
import { evaluateProductPublication } from "@/lib/publication";
import type { Product } from "@/types/product";

export const dynamic = "force-dynamic";

type ProductPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const product = await getCatalogProductBySlug(slug);
    if (!product) return { title: "Producto no encontrado" };
    const publication = evaluateProductPublication(product);
    return { title: product.name, description: product.shortDescription, robots: publication.isPublic ? { index: true, follow: true } : { index: false, follow: false } };
  } catch (error) {
    console.warn("[ColdPower] Metadata de producto no disponible.", error instanceof Error ? error.message : error);
    return { title: "Catálogo temporalmente no disponible", robots: { index: false, follow: false } };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (product === null) {
    return (
      <CatalogUnavailable
        title="La ficha técnica está temporalmente no disponible"
        description="No podemos mostrar esta ficha técnica en este momento. Inténtalo nuevamente en unos minutos o solicita ayuda técnica."
      />
    );
  }
  if (!product) notFound();

  return <ProductDetail product={product} />;
}

async function loadProduct(slug: string): Promise<Product | undefined | null> {
  try {
    return await getCatalogProductBySlug(slug);
  } catch (error) {
    console.warn("[ColdPower] Ficha de producto persistente no disponible.", error instanceof Error ? error.message : error);
    return null;
  }
}
