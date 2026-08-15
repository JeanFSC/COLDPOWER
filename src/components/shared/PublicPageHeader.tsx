import type { ReactNode } from "react";

type PublicPageHeaderProps = { eyebrow?: string; title: string; description?: string; children?: ReactNode };

export function PublicPageHeader({ eyebrow, title, description, children }: PublicPageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-secondary-600">{eyebrow}</p> : null}
        <h1 className="mt-2 font-display text-4xl font-black leading-tight tracking-tight text-brand-primary-900 sm:text-5xl">{title}</h1>
        {description ? <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary">{description}</p> : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </header>
  );
}
