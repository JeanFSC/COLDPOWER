import Image from "next/image";
import type { Product } from "@/types/product";

type ProductMediaProps = {
  product: Pick<Product, "name" | "images">;
  priority?: boolean;
  sizes?: string;
  className?: string;
};

export function ProductMedia({ product, priority = false, sizes = "(min-width: 1280px) 240px, (min-width: 640px) 33vw, 50vw", className = "" }: ProductMediaProps) {
  const image = product.images[0] ?? "/images/product-placeholder-repuesto.svg";
  const isReference = image.includes("/cat-") || image.includes("placeholder");

  return (
    <div className={"relative aspect-square overflow-hidden bg-surface-page " + className}>
      <Image src={image} alt={product.name} fill priority={priority} sizes={sizes} className="object-contain p-5 transition duration-300 group-hover:scale-105" />
      {isReference ? <span className="absolute bottom-2 left-2 rounded-pill bg-dark/80 px-2 py-1 text-[10px] font-bold text-white">Imagen referencial</span> : null}
    </div>
  );
}
