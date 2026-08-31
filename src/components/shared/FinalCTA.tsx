import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { WhatsAppLeadButton } from "@/components/shared/WhatsAppLeadButton";

type FinalCTAProps = { eyebrow?: string; title: string; description: string; primaryLabel?: string; primaryHref?: string; secondaryLabel?: string; secondaryHref?: string; className?: string };

export function FinalCTA({ eyebrow = "Asesoría ColdPower", title, description, primaryLabel = "Cotizar por WhatsApp", primaryHref, secondaryLabel, secondaryHref, className = "" }: FinalCTAProps) {
  return <section className={`bg-dark px-4 py-14 text-white sm:px-6 lg:px-8 ${className}`}><div className="mx-auto flex max-w-4xl flex-col items-center text-center"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">{eyebrow}</p><h2 className="mt-4 font-display text-3xl font-black tracking-normal sm:text-4xl">{title}</h2><p className="mt-4 max-w-2xl text-base leading-7 text-gray-light">{description}</p><div className="mt-7 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">{primaryHref ? <Button href={primaryHref} variant="whatsapp" size="lg" className="w-full sm:w-auto"><MessageCircle className="h-5 w-5" aria-hidden="true" />{primaryLabel}</Button> : <WhatsAppLeadButton title={title} variant="whatsapp" size="lg" className="w-full sm:w-auto"><MessageCircle className="h-5 w-5" aria-hidden="true" />{primaryLabel}</WhatsAppLeadButton>}{secondaryLabel && secondaryHref ? <Button href={secondaryHref} variant="outline" size="lg" className="w-full sm:w-auto">{secondaryLabel}<ArrowRight className="h-5 w-5" aria-hidden="true" /></Button> : null}</div></div></section>;
}
