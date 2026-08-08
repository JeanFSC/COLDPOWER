"use client";

import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/shared/Button";
import type { QuotePayload } from "@/lib/quote";

type QuoteSuccessProps = {
  quoteId: string;
  receivedAt: string;
  payload: QuotePayload;
  whatsappHref: string;
};

export function QuoteSuccess({ quoteId, receivedAt, payload, whatsappHref }: QuoteSuccessProps) {
  return (
    <section
      className="rounded-lg border border-teal/25 bg-white p-5 shadow-card sm:p-6"
      aria-live="polite"
    >
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal">
        Solicitud registrada
      </p>
      <h2 className="mt-3 font-display text-3xl font-black text-dark">{quoteId}</h2>
      <p className="mt-3 text-sm leading-6 text-gray-text">
        Registramos la información del formulario. La cotización final será confirmada por un
        asesor.
      </p>

      <dl className="mt-6 grid gap-3 rounded-md border border-border bg-background p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="font-bold text-gray-text">Cliente</dt>
          <dd className="text-right font-extrabold text-dark">{payload.name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="font-bold text-gray-text">Teléfono</dt>
          <dd className="text-right font-extrabold text-dark">{payload.phone}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="font-bold text-gray-text">Producto</dt>
          <dd className="text-right font-extrabold text-dark">
            {payload.productName ?? "Por definir"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="font-bold text-gray-text">SKU</dt>
          <dd className="text-right font-mono font-extrabold text-dark">
            {payload.sku ?? "Por definir"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="font-bold text-gray-text">Recibido</dt>
          <dd className="text-right font-extrabold text-dark">
            {new Date(receivedAt).toLocaleString("es-PE")}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          variant="whatsapp"
          className="w-full sm:w-auto"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          Continuar por WhatsApp
        </Button>
        <Button href="/catalogo" variant="outline" className="w-full sm:w-auto">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          Volver al catálogo
        </Button>
      </div>
    </section>
  );
}
