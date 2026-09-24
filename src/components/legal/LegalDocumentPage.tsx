import { AlertTriangle, ArrowUpRight, FileText } from "lucide-react";
import Link from "next/link";
import { PublicPageHeader } from "@/components/shared/PublicPageHeader";
import { reviewNotice, type LegalDocument } from "@/lib/legal-documents";

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <main className="bg-surface-page py-10 sm:py-14">
      <div className="cp-container">
        <PublicPageHeader eyebrow="Información institucional" title={document.title} description={document.description}>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-900">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Borrador en revisión
          </div>
        </PublicPageHeader>

        <div className="mt-7 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3.5 text-sm leading-6 text-amber-950 sm:px-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div>
              <p className="font-extrabold">Documento en revisión legal</p>
              <p className="mt-0.5">{reviewNotice}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24">
            <nav aria-label="Contenido del documento" className="rounded-lg border border-border bg-white p-4 shadow-card">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">Contenido</p>
              <ol className="mt-3 grid gap-1.5">
                {document.sections.map((section, index) => (
                  <li key={section.title}>
                    <a href={`#legal-section-${index + 1}`} className="block rounded-md px-2 py-1.5 text-xs font-semibold leading-5 text-text-secondary transition hover:bg-brand-secondary-600/5 hover:text-brand-primary-900">
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="min-w-0 rounded-lg border border-border bg-white p-6 shadow-card sm:p-9">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5 text-xs text-text-secondary">
              <p><span className="font-bold text-dark">Estado:</span> {document.lastReview}</p>
              <p>ColdPower · versión de trabajo</p>
            </div>

            <div className="mt-7 grid gap-8">
              {document.sections.map((section, index) => (
                <section key={section.title} id={`legal-section-${index + 1}`} className="scroll-mt-24">
                  <h2 className="font-display text-xl font-black leading-tight text-brand-primary-900 sm:text-2xl">{section.title}</h2>
                  {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-3 text-[15px] leading-7 text-text-secondary">{paragraph}</p>)}
                  {section.bullets ? <ul className="mt-3 grid gap-2.5 pl-5 text-[15px] leading-7 text-text-secondary marker:text-brand-secondary-600 list-disc">{section.bullets.map((bullet) => <li key={bullet} className="pl-1">{bullet}</li>)}</ul> : null}
                </section>
              ))}
            </div>

            {document.relatedLinks?.length ? <div className="mt-9 border-t border-border pt-6">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-text-secondary">Documentos relacionados</p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {document.relatedLinks.map((link) => <Link key={link.href} href={link.href} className="inline-flex items-center gap-1.5 rounded-md border border-brand-secondary-600/25 px-3 py-2 text-sm font-extrabold text-brand-secondary-600 transition hover:bg-brand-secondary-600/5">{link.label}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>)}
              </div>
            </div> : null}
          </article>
        </div>
      </div>
    </main>
  );
}
