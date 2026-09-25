import Link from "next/link";
import type { Product } from "@/types/product";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { AddToQuoteButton } from "@/components/cart/AddToQuoteButton";
import { ProductMedia } from "@/components/catalog/ProductMedia";
import { HomeFavoriteButton } from "@/components/home/HomeFavoriteButton";
import { formatProductPrice } from "@/lib/formatters";

type HomeProductCardProps = { product: Product; priority?: boolean; compact?: boolean; isBestSeller?: boolean };

function isPurchasable(product: Product) {
  return product.price !== null && product.availabilityStatus !== "out_of_stock" && product.status !== "out-of-stock";
}

export function HomeProductCard({ product, priority = false, compact = false, isBestSeller = false }: HomeProductCardProps) {
  const productHref = `/producto/${product.slug}`;
  const purchasable = isPurchasable(product);

  return (
    <article className={`home-product-card group ${compact ? "home-product-card-compact" : ""}`}>
      <div className="home-product-media-wrap">
        {isBestSeller ? <span className="home-product-badge">Más vendido</span> : null}
        <Link href={productHref} prefetch={false} aria-label={`Ver ${product.name}`} className="block">
          <ProductMedia
            product={product}
            priority={priority}
            sizes="(min-width: 1440px) 14vw, (min-width: 768px) 28vw, 44vw"
            className="home-product-media"
          />
        </Link>
        <HomeFavoriteButton productId={product.id} productName={product.name} />
      </div>
      <div className="home-product-copy">
        <h3 className="home-product-name">
          <Link href={productHref} prefetch={false} className="hover:text-brand-secondary-600">
            {product.name}
          </Link>
        </h3>
        <p className="home-product-sku">Cód. {product.sku}</p>
        {product.brand ? <p className="home-product-brand">{product.brand}</p> : null}
        <p className={product.price === null ? "home-product-price home-product-price-muted" : "home-product-price"}>
          {product.price === null ? "Precio bajo cotización" : formatProductPrice(product.price, product.priceCurrency ?? "PEN")}
        </p>
        <div className="home-product-action">
          {purchasable ? (
            <AddToCartButton productId={product.id} purchasable label="Agregar" className="w-full text-white" />
          ) : (
            <AddToQuoteButton productId={product.id} label="Cotizar" variant="primary" className="w-full text-white" />
          )}
        </div>
      </div>
    </article>
  );
}
