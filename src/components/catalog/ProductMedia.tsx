import Image from "next/image";
import { resolveProductImage } from "@/lib/product-image";
import type { Product } from "@/types/product";

type ProductMediaProps = {
  product: Pick<Product, "name" | "images" | "family" | "category">;
  priority?: boolean;
  sizes?: string;
  className?: string;
};

export function ProductMedia({ product, priority = false, sizes = "(min-width: 1280px) 240px, (min-width: 640px) 33vw, 50vw", className = "" }: ProductMediaProps) {
  const media = resolveProductImage(product);

  return (
    <div className={"relative aspect-square overflow-hidden bg-surface-page " + className}>
      <Image src={media.src} alt={product.name} fill priority={priority} sizes={sizes} className="object-contain p-5 transition duration-300 group-hover:scale-105" />
      {media.isReference ? <span className="absolute bottom-2 left-2 rounded-pill bg-dark/80 px-2 py-1 text-[10px] font-bold text-white">Imagen referencial</span> : null}
    </div>
  );
}
