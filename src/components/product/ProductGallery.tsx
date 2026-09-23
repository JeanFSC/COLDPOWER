"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/types/product";

type ProductGalleryProps = { product: Product };

export function ProductGallery({ product }: ProductGalleryProps) {
  const images = product.images.length > 0 ? product.images : ["/images/products/product-placeholder.webp"];
  const [activeImage, setActiveImage] = useState(images[0]);
  const isReferenceImage = activeImage.includes("/categories/") || activeImage.includes("/families/") || activeImage.includes("/products/") || activeImage.includes("placeholder") || activeImage.includes("reference");

  return (
    <div className="space-y-4">
      <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-white p-5 shadow-card">
        <Image src={activeImage} alt={product.name} fill priority sizes="(min-width: 1024px) 560px, 100vw" className="object-contain p-4" />
        {isReferenceImage ? <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-pill bg-brand-primary-900/85 px-3 py-1.5 text-xs font-bold text-white"><ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />Imagen referencial</span> : null}
      </div>
      {images.length > 1 ? (
        <div className="flex gap-3 overflow-x-auto pb-1" aria-label="Imágenes del producto">
          {images.map((image, index) => <button key={image} type="button" onClick={() => setActiveImage(image)} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-white p-1 transition ${activeImage === image ? "border-brand-secondary-600 ring-2 ring-brand-secondary-600/20" : "border-border"}`} aria-label={`Ver imagen ${index + 1} de ${product.name}`} aria-pressed={activeImage === image}><Image src={image} alt="" fill sizes="64px" className="object-contain p-1" /></button>)}
        </div>
      ) : null}
    </div>
  );
}

