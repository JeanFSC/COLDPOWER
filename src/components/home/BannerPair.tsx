import Image from "next/image";
import Link from "next/link";

type Banner = {
  title: string;
  body?: string;
  href?: string;
  imageSrc?: string;
  imageAlt?: string;
};

export function BannerPair({ banners }: { banners: Banner[] }) {
  const visible = banners.filter((banner) => banner.title.trim()).slice(0, 2);
  if (visible.length === 0) return null;

  return (
    <section className="bg-surface-page py-10 sm:py-14">
      <div className="cp-container grid gap-4 sm:grid-cols-2">
        {visible.map((banner) => {
          const content = <><div>{banner.imageSrc ? <div className="relative aspect-[16/7] overflow-hidden rounded-md bg-white"><Image src={banner.imageSrc} alt={banner.imageAlt ?? ""} fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" /></div> : null}<h2 className="mt-4 font-display text-2xl font-black text-white">{banner.title}</h2>{banner.body ? <p className="mt-2 text-sm leading-6 text-gray-light">{banner.body}</p> : null}</div></>;
          return banner.href ? <Link key={banner.title} href={banner.href} className="rounded-lg bg-dark p-5 transition hover:shadow-hover">{content}</Link> : <article key={banner.title} className="rounded-lg bg-dark p-5">{content}</article>;
        })}
      </div>
    </section>
  );
}
