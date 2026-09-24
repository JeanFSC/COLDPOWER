import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type CategoryCardProps = {
  href: string;
  name: string;
  subtitle?: string;
  count?: number;
  imageSrc?: string;
  imageAlt?: string;
};

export function CategoryCard({
  href,
  name,
  subtitle,
  count,
  imageSrc = "/images/category-placeholder.svg",
  imageAlt = "",
}: CategoryCardProps) {
  const caption = subtitle ?? (typeof count === "number" ? `${count} ${count === 1 ? "referencia" : "referencias"}` : undefined);

  return (
    <Link href={href} prefetch={false} className="home-category-card group">
      <div className="home-category-image">
        <Image
          src={imageSrc}
          alt={imageAlt || name}
          fill
          sizes="(min-width: 1280px) 12vw, (min-width: 640px) 24vw, 44vw"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
      </div>
      <div className="home-category-copy">
        <h3 className="line-clamp-2">{name}</h3>
        {caption ? <p>{caption}</p> : null}
        <ArrowRight className="home-card-arrow" aria-hidden="true" />
      </div>
    </Link>
  );
}
