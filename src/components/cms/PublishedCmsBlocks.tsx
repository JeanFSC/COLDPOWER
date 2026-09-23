import Image from "next/image";
import Link from "next/link";

type PublishedCmsBlock = { blockKey: string; type: string; status: string; payload: unknown };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
function safeHref(value: unknown): string | null {
  const href = asText(value);
  return href.startsWith("/") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
    ? href
    : null;
}
function safeImageSrc(value: unknown): string | null {
  const src = asText(value);
  return src.startsWith("/api/media/") || src.startsWith("https://") ? src : null;
}

function BlockContent({ block }: { block: PublishedCmsBlock }) {
  const payload = asRecord(block.payload);
  const title = asText(payload.title);
  const subtitle = asText(payload.subtitle);
  const body = asText(payload.body) || asText(payload.text);
  const imageSrc = safeImageSrc(payload.imageUrl ?? payload.image);
  const ctaLabel = asText(payload.ctaLabel);
  const ctaHref = safeHref(payload.ctaHref);

  if (block.type === "hero" || block.type === "banner") {
    return (
      <section className="relative overflow-hidden bg-dark text-white">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={asText(payload.altText)}
            fill
            sizes="100vw"
            className="object-cover opacity-35"
          />
        ) : null}
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          {title ? (
            <h2 className="max-w-3xl font-display text-3xl font-black sm:text-5xl">{title}</h2>
          ) : null}
          {subtitle ? (
            <p className="mt-4 max-w-2xl text-lg leading-8 text-gray-light">{subtitle}</p>
          ) : null}
          {ctaLabel && ctaHref ? (
            <Link
              href={ctaHref}
              className="mt-6 inline-flex rounded-md bg-primary px-5 py-3 text-sm font-extrabold text-white"
            >
              {ctaLabel}
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  if (block.type === "contact") {
    const fields = ["phone", "whatsapp", "email", "schedule"]
      .map((key) => ({ key, value: asText(payload[key]) }))
      .filter((field) => field.value);
    if (!title && !fields.length) return null;
    return (
      <section className="bg-background py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {title ? <h2 className="font-display text-3xl font-black text-dark">{title}</h2> : null}
          {fields.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {fields.map((field) => (
                <p
                  key={field.key}
                  className="rounded-md border border-border bg-white p-4 text-sm text-gray-text"
                >
                  <span className="font-extrabold text-dark">{field.key}: </span>
                  {field.value}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (block.type === "links") {
    const links = Array.isArray(payload.links) ? payload.links : [];
    const validLinks = links.flatMap((item) => {
      const link = asRecord(item);
      const href = safeHref(link.href);
      const label = asText(link.label);
      return href && label ? [{ href, label }] : [];
    });
    if (!title && !validLinks.length) return null;
    return (
      <section className="bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {title ? <h2 className="font-display text-3xl font-black text-dark">{title}</h2> : null}
          {validLinks.length ? (
            <div className="mt-5 flex flex-wrap gap-3">
              {validLinks.map((link) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  className="rounded-md border border-border px-4 py-2 text-sm font-bold text-dark hover:border-primary hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (!title && !body) return null;
  return (
    <section className="bg-white py-10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {title ? <h2 className="font-display text-3xl font-black text-dark">{title}</h2> : null}
        {body ? (
          <p className="mt-4 whitespace-pre-line text-base leading-8 text-gray-text">{body}</p>
        ) : null}
      </div>
    </section>
  );
}

export function PublishedCmsBlocks({
  blocks,
  slot = "after_categories",
}: {
  blocks: PublishedCmsBlock[];
  slot?: string;
}) {
  const publishedBlocks = blocks.filter((block) => {
    if (block.status !== "PUBLISHED") return false;
    const blockSlot = asText(asRecord(block.payload).slot);
    if (blockSlot) return blockSlot === slot;
    return slot === "after_categories" && block.type !== "hero" && block.type !== "banner";
  });
  if (!publishedBlocks.length) return null;
  return (
    <div data-cms-published="true">
      {publishedBlocks.map((block) => (
        <BlockContent key={block.blockKey} block={block} />
      ))}
    </div>
  );
}
