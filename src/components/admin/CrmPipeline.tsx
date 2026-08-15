"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { opportunityStages, type OpportunityStage } from "@/lib/crm-validation";

const stageLabels: Record<OpportunityStage, string> = {
  NEW: "Nuevas", CONTACTED: "Contactadas", QUOTING: "Cotizando", QUOTE_SENT: "Cotización enviada", FOLLOW_UP: "Seguimiento", NEGOTIATION: "Negociación", ACCEPTED: "Aceptadas", SALE: "Venta", PAYMENT_PENDING: "Pago pendiente", PAID: "Pagadas", PREPARING: "Preparando", DELIVERED: "Entregadas", CLOSED: "Cerradas", LOST: "Perdidas", CANCELLED: "Canceladas", NO_RESPONSE: "Sin respuesta",
};
type Opportunity = { id: string; code: string; customerName: string; customerPhone: string | null; title: string; stage: OpportunityStage; totalAmount: string | null; currency: string | null; nextAction: string | null; followUpAt: string | Date | null; items: Array<{ id: string; productNameSnapshot: string; quantity: number }> };

function daysWithoutContact(date: string | Date | null | undefined) {
  if (!date) return "Sin contacto";
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  return days <= 0 ? "Hoy" : `${days} d sin contacto`;
}

export function CrmPipeline({ opportunities }: { opportunities: Opportunity[] }) {
  const router = useRouter();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function moveOpportunity(stage: OpportunityStage) {
    if (!draggedId || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/oportunidades/${draggedId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo mover la oportunidad.");
      setMessage("Etapa actualizada y auditada.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo mover la oportunidad."); } finally { setBusy(false); setDraggedId(null); }
  }

  return <section aria-label="Pipeline comercial" className="mt-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">Pipeline por oportunidad</p><h2 className="mt-1 font-display text-2xl font-black text-dark">Seguimiento comercial</h2></div>{message ? <p role="status" className="text-sm font-bold text-gray-text">{message}</p> : null}</div><div className="mt-4 grid gap-3 overflow-x-auto pb-3 xl:grid-cols-4 2xl:grid-cols-6">{opportunityStages.map((stage) => { const cards = opportunities.filter((opportunity) => opportunity.stage === stage); return <div key={stage} className="min-w-[250px] rounded-md border border-border bg-background p-3" onDragOver={(event) => event.preventDefault()} onDrop={() => void moveOpportunity(stage)}><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-extrabold text-dark">{stageLabels[stage]}</h3><span className="rounded-pill bg-white px-2 py-0.5 text-xs font-black text-gray-text">{cards.length}</span></div><div className="mt-3 grid gap-3">{cards.map((opportunity) => <article key={opportunity.id} draggable onDragStart={() => setDraggedId(opportunity.id)} className="cursor-grab rounded-md border border-border bg-white p-3 shadow-card active:cursor-grabbing"><p className="font-mono text-[10px] font-black tracking-[0.08em] text-gray-text">{opportunity.code}</p><h4 className="mt-2 text-sm font-extrabold text-dark">{opportunity.customerName}</h4><p className="mt-1 text-xs font-semibold text-gray-text">{opportunity.title}</p>{opportunity.items.length ? <p className="mt-2 text-xs text-gray-text">{opportunity.items.slice(0, 2).map((item) => `${item.productNameSnapshot} ×${item.quantity}`).join(" · ")}</p> : null}<div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-gray-text"><span>{opportunity.totalAmount ? `${opportunity.currency ?? ""} ${opportunity.totalAmount}` : "Monto pendiente"}</span><span>·</span><span>{daysWithoutContact(opportunity.followUpAt)}</span></div>{opportunity.nextAction ? <p className="mt-2 rounded-sm bg-background p-2 text-[11px] font-semibold text-gray-text">Próxima acción: {opportunity.nextAction}</p> : null}</article>)}</div>{cards.length === 0 ? <p className="mt-3 rounded-sm border border-dashed border-border p-3 text-xs text-gray-text">Sin oportunidades reales.</p> : null}</div>; })}</div></section>;
}
