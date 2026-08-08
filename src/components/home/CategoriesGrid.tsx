import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { categories } from "@/data/categories";
import { products } from "@/data/products";
import { SectionTitle } from "@/components/shared/SectionTitle";

function getProductCount(slug: string) {
  return products.filter((product) => product.category === slug).length;
}

export function CategoriesGrid() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="Líneas de producto"
          title="Nuestras categorías"
          description="Desliza para explorar equipos y repuestos de refrigeración por sistema."
        />

        <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
          {categories.map((category) => {
            const count = getProductCount(category.slug);

            return (
              <Link
                key={category.id}
                href={`/categoria/${category.slug}`}
                className="group relative flex h-36 w-[260px] shrink-0 snap-start overflow-hidden rounded-lg bg-dark text-white shadow-card transition hover:-translate-y-1 hover:shadow-hover sm:h-40 sm:w-[300px]"
              >
                <Image
                  src={category.image}
                  alt={`Línea de producto ${category.name}`}
                  fill
                  sizes="(min-width: 640px) 300px, 260px"
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-dark via-dark/85 to-dark/10" />

                <div className="relative z-10 flex w-full flex-col justify-end p-5">
                  <span className="mb-2 h-1 w-9 rounded-full bg-primary" />
                  <h3 className="max-w-[65%] text-base font-extrabold uppercase leading-tight tracking-wide text-white">
                    {category.name}
                  </h3>
                  <div className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-gray-light">
                    <span>
                      {count > 0
                        ? `${count} ${count === 1 ? "referencia" : "referencias"}`
                        : "Bajo consulta"}
                    </span>
                    <ChevronRight
                      className="h-4 w-4 text-primary transition group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
