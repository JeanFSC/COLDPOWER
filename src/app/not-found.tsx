import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { WhatsAppLeadButton } from "@/components/shared/WhatsAppLeadButton";
import { BrandLogo } from "@/components/shared/BrandLogo";

export default function NotFound() {
  return (
    <section className="bg-surface-page px-4 py-16 sm:px-6 sm:py-24">
      <div className="cp-container max-w-3xl rounded-lg border border-border bg-white p-8 text-center shadow-card sm:p-12"><div className="flex justify-center"><BrandLogo /></div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-brand-secondary-600">Error 404</p>
        <h1 className="mt-4 font-display text-4xl font-black tracking-tight text-dark">No encontramos esta pagina</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-text-secondary">El producto o seccion que buscas puede haber cambiado.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button href="/catalogo" variant="outline" size="lg" className="w-full sm:w-auto"><ArrowLeft className="h-5 w-5" aria-hidden="true" />Volver al catalogo</Button>
          <WhatsAppLeadButton title="Pagina no encontrada" variant="whatsapp" size="lg" className="w-full sm:w-auto"><MessageCircle className="h-5 w-5" aria-hidden="true" />Cotizar por WhatsApp</WhatsAppLeadButton>
        </div>
      </div>
    </section>
  );
}
