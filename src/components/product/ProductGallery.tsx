"use client";

import Image from "next/image";
import { FileText, ImageIcon } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/types/product";

type ProductGalleryProps = {
  product: Product;
};

export function ProductGallery({ product }: ProductGalleryProps) {
  const images = product.images.length > 0 ? product.images : ["/images/product-placeholder-repuesto.svg"];
  const [activeImage, setActiveImage] = useState(images[0]);
  const isReferenceImage = activeImage.includes("/cat-") || activeImage.includes("placeholder");

  return (
    <div className="space-y-4">
      <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-white p-5 shadow-card">
        <Image
          src={activeImage}
          alt={product.name}
          fill
          priority
          sizes="(min-width: 1024px) 400px, 100vw"
          className="object-contain p-4"
        />
        {isReferenceImage ? (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-pill bg-dark/85 px-3 py-1.5 text-xs font-bold text-white">
            <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Imagen referencial
          </span>
        ) : null}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1" aria-label="Imágenes del producto">
        {images.map((image, index) => (
          <button
            key={image}
            type="button"
            onClick={() => setActiveImage(image)}
            className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-white p-1 transition ${
              activeImage === image ? "border-primary ring-2 ring-primary/20" : "border-border"
            }`}
            aria-label={`Ver imagen ${index + 1} de ${product.name}`}
            aria-pressed={activeImage === image}
          >
            <Image src={image} alt="" fill sizes="64px" className="object-contain p-1" />
          </button>
        ))}
      </div>

      <section id="documentos" className="rounded-md border border-border bg-background p-4">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="font-bold text-dark">Documentos técnicos</h2>
            <p className="mt-1 text-sm leading-6 text-gray-text">
              Ficha técnica y manuales disponibles cuando la documentación de esta referencia haya sido verificada.
            </p>
            <span className="mt-2 inline-flex rounded-pill bg-warning/25 px-3 py-1 text-xs font-bold text-warning-dark">
              Documentación en validación
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
