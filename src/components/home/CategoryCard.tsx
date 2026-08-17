import Image from "next/image";
import Link from "next/link";

type CategoryCardProps = {
  href: string;
  name: string;
  count?: number;
  imageSrc?: string;
  imageAlt?: string;
};

export function CategoryCard({ href, name, count, imageSrc = "/images/category-placeholder.svg", imageAlt = "" }: CategoryCardProps) {
  return (
    <Link href={href} prefetch={false} className="group rounded-md border border-border bg-white p-3 transition hover:-translate-y-0.5 hover:border-brand-secondary-600 hover:shadow-card">
      <div className="relative aspect-square overflow-hidden rounded-md bg-surface-page">
        <Image src={imageSrc} alt={imageAlt} fill sizes="(min-width: 1024px) 16vw, 45vw" className="object-contain p-3 transition duration-300 group-hover:scale-105" />
      </div>
      <h3 className="mt-2 text-sm font-extrabold leading-5 text-dark">{name}</h3>
      {count !== undefined ? <p className="mt-1 font-mono text-[11px] font-semibold text-text-secondary">{count} referencias</p> : null}
    </Link>
  );
}
