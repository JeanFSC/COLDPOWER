"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

const questions = [
  {
    id: "find",
    question: "¿Cómo encuentro una referencia?",
    answer:
      "Puedes buscar por SKU, nombre, marca, modelo o especificaciones técnicas desde el catálogo. Los filtros se aplican sobre las referencias publicadas.",
  },
  {
    id: "without-sku",
    question: "¿Qué hago si no tengo el código?",
    answer:
      "Comparte el modelo, la marca o una foto de la placa desde Contacto. Esa información ayuda al equipo a revisar el requerimiento.",
  },
  {
    id: "price",
    question: "¿El precio y la disponibilidad están confirmados?",
    answer:
      "La ficha muestra únicamente los datos publicados. Precio, disponibilidad y condiciones se confirman en la cotización comercial vigente.",
  },
  {
    id: "delivery",
    question: "¿Coordinan el despacho?",
    answer:
      "Sí. El destino, el peso, la disponibilidad y las condiciones de despacho se coordinan antes de cerrar la solicitud.",
  },
] as const;

export function HomeFaq() {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <section className="bg-white py-10 sm:py-14" data-home-block="faq">
      <div className="cp-container">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
              Preguntas frecuentes
            </p>
            <h2 className="mt-3 font-display text-3xl font-black text-dark sm:text-4xl">
              Antes de solicitar tu cotización
            </h2>
          </div>
          <Link
            href="/faq"
            prefetch={false}
            className="inline-flex items-center gap-2 text-sm font-bold text-brand-secondary-600 hover:text-dark"
          >
            Ver todas <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="mt-7 grid gap-3 lg:grid-cols-2">
          {questions.map((item) => {
            const isOpen = openId === item.id;
            const answerId = "home-faq-answer-" + item.id;
            return (
              <div key={item.id} className="rounded-xl border border-border bg-surface-page">
                <button
                  type="button"
                  className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-extrabold text-brand-primary-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-secondary-600"
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    className={
                      "h-5 w-5 shrink-0 text-brand-secondary-600 transition " +
                      (isOpen ? "rotate-180" : "")
                    }
                    aria-hidden="true"
                  />
                </button>
                {isOpen ? (
                  <div
                    id={answerId}
                    className="border-t border-border px-5 pb-5 pt-3 text-sm leading-6 text-text-secondary"
                  >
                    {item.answer}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
