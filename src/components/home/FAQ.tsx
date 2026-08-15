"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { faqItems } from "@/data/faq";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { cn } from "@/lib/utils";

const extraFaqItems = [
  {
    id: "stock-confirmado",
    question: "¿El stock se confirma antes de pagar?",
    answer:
      "Sí. La atención por cotización permite validar disponibilidad, compatibilidad y condiciones comerciales antes de cerrar la compra.",
  },
  {
    id: "productos-nuevos-probados",
    question: "¿Los productos son nuevos o probados?",
    answer:
      "La condición del producto debe indicarse en cada cotización. Para equipos y repuestos críticos se validan estado, procedencia y garantía.",
  },
  {
    id: "metodos-pago",
    question: "¿Qué métodos de pago aceptan?",
    answer:
      "Los medios de pago se confirman con el asesor junto con la cotizacion y la disponibilidad comercial.",
  },
] as const;

const items = [...faqItems, ...extraFaqItems];

export function FAQ() {
  const [openId, setOpenId] = useState<string>(items[0]?.id ?? "");

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <SectionTitle
          eyebrow="FAQ"
          title="Dudas frecuentes antes de cotizar"
          description="Resolvemos los puntos clave sobre garantía, envíos, stock y métodos de pago para una compra más segura."
        />

        <div className="grid gap-3">
          {items.map((item) => {
            const isOpen = item.id === openId;
            const panelId = `${item.id}-panel`;

            return (
              <article key={item.id} className="rounded-md border border-border bg-background">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenId(isOpen ? "" : item.id)}
                >
                  <span className="font-extrabold text-dark">{item.question}</span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-primary transition-transform",
                      isOpen && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>
                <div
                  id={panelId}
                  className={cn(
                    "grid transition-all duration-200",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-7 text-gray-text">{item.answer}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
