import Image from "next/image";

export function CatalogHero({ eyebrow, title, description, image = "/images/categories/refrigeracion.webp" }: { eyebrow: string; title: string; description?: string; image?: string }) {
  return (
    <section className="relative isolate overflow-hidden bg-brand-primary-900 text-white">
      <Image src={image} alt="" fill sizes="100vw" className="-z-20 object-cover object-center opacity-70" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-primary-900 via-brand-primary-900/95 to-brand-primary-900/55" aria-hidden="true" />
      <div className="cp-container flex min-h-[176px] items-center py-7 lg:h-[206px] lg:min-h-0">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] font-extrabold uppercase tracking-[0.16em] text-action-accent-500">{eyebrow}</p>
          <h1 className="mt-3 font-display text-3xl font-black tracking-[-0.03em] sm:text-4xl">{title}</h1>
          {description ? <p className="mt-3 hidden max-w-xl text-sm leading-6 text-white/75 sm:block">{description}</p> : null}
        </div>
      </div>
    </section>
  );
}
