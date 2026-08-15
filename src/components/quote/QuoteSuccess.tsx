"use client";

import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { WhatsAppLeadButton } from "@/components/shared/WhatsAppLeadButton";
import type { QuotePayload } from "@/lib/quote";

type QuoteSuccessProps = { quoteId: string; receivedAt: string; payload: QuotePayload };

export function QuoteSuccess({ quoteId, receivedAt, payload }: QuoteSuccessProps) {
  return <section className="rounded-lg border border-teal/25 bg-white p-5 shadow-card sm:p-6" aria-live="polite">
    <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal">Solicitud registrada</p>
    <h2 className="mt-3 font-display text-3xl font-black text-dark">{quoteId}</h2>
    <p className="mt-3 text-sm leading-6 text-gray-text">Recibimos la información del formulario. La cotización final será confirmada por un asesor.</p>
    <dl className="mt-6 grid gap-3 rounded-md border border-border bg-background p-4 text-sm">
      <Row label="Cliente" value={payload.name} /><Row label="Tipo" value={payload.customerType === "company" ? "Empresa" : "Persona natural"} /><Row label="Documento" value={payload.documentNumber} /><Row label="Teléfono" value={payload.phone} /><Row label="Ubicación" value={[payload.department, payload.province, payload.district].join(" / ")} /><Row label="Contacto preferido" value={preferredContactLabel(payload.preferredContact)} /><Row label="Producto" value={payload.productName ?? "Por definir"} /><Row label="SKU" value={payload.sku ?? "Por definir"} /><Row label="Recibido" value={new Date(receivedAt).toLocaleString("es-PE")} />
    </dl>
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <WhatsAppLeadButton title={`Cotización ${quoteId}`} initialName={payload.name} initialPhone={payload.phone} initialEmail={payload.email} items={payload.productName ? [{ name: payload.productName, sku: payload.sku ?? undefined, quantity: 1 }] : []} className="w-full sm:w-auto"><MessageCircle className="h-5 w-5" aria-hidden="true" />Continuar por WhatsApp</WhatsAppLeadButton>
      <Button href="/catalogo" variant="outline" className="w-full sm:w-auto"><ArrowLeft className="h-5 w-5" aria-hidden="true" />Volver al catálogo</Button>
    </div>
  </section>;
}
function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4"><dt className="font-bold text-gray-text">{label}</dt><dd className="text-right font-extrabold text-dark">{value}</dd></div>; }
function preferredContactLabel(value: QuotePayload["preferredContact"]) { if (value === "phone") return "Llamada telefónica"; if (value === "email") return "Correo electrónico"; return "WhatsApp"; }
