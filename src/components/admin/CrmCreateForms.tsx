"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Customer = { id: string; name: string };
type Opportunity = { id: string; code: string; customerName: string };

export function CrmCreateForms({ customers, opportunities }: { customers: Customer[]; opportunities: Opportunity[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>, path: string) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    const data = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== ""));
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
      setMessage("Guardado en Neon."); form.reset(); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar."); } finally { setBusy(false); }
  }
  return <div className="mt-8 grid gap-5 lg:grid-cols-2">
    <form onSubmit={(event) => void submit(event, "/api/admin/oportunidades")} className="rounded-md border border-border bg-white p-5">
      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">Pipeline</p><h2 className="mt-1 font-display text-xl font-black text-dark">Nueva oportunidad</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2"><select required name="customerId" defaultValue="" className="h-10 rounded-md border border-border px-3 text-sm sm:col-span-2"><option value="">Cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select><input required name="title" placeholder="Necesidad comercial" className="h-10 rounded-md border border-border px-3 text-sm sm:col-span-2" /><select name="origin" defaultValue="WEB" className="h-10 rounded-md border border-border px-3 text-sm"><option value="WEB">Web</option><option value="WHATSAPP">WhatsApp</option><option value="TELEFONO">Teléfono</option><option value="LOCAL">Local</option><option value="REFERIDO">Referido</option><option value="CLIENTE_RECURRENTE">Cliente recurrente</option><option value="OTRO">Otro</option></select><select name="stage" defaultValue="NEW" className="h-10 rounded-md border border-border px-3 text-sm"><option value="NEW">Nueva</option><option value="CONTACTED">Contactada</option><option value="QUOTING">Cotizando</option><option value="QUOTE_SENT">Cotización enviada</option><option value="FOLLOW_UP">Seguimiento</option><option value="NEGOTIATION">Negociación</option><option value="ACCEPTED">Aceptada</option><option value="SALE">Venta</option></select><input name="nextAction" placeholder="Próxima acción" className="h-10 rounded-md border border-border px-3 text-sm" /><input name="followUpAt" type="datetime-local" className="h-10 rounded-md border border-border px-3 text-sm" /><button disabled={busy} className="rounded-pill bg-dark px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Crear oportunidad</button></div>
    </form>
    <form onSubmit={(event) => void submit(event, "/api/admin/actividades")} className="rounded-md border border-border bg-white p-5">
      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">Seguimientos</p><h2 className="mt-1 font-display text-xl font-black text-dark">Nueva actividad</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2"><select name="customerId" defaultValue="" className="h-10 rounded-md border border-border px-3 text-sm"><option value="">Cliente opcional</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select><select name="opportunityId" defaultValue="" className="h-10 rounded-md border border-border px-3 text-sm"><option value="">Oportunidad opcional</option>{opportunities.map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.code} · {opportunity.customerName}</option>)}</select><select required name="type" defaultValue="CALL" className="h-10 rounded-md border border-border px-3 text-sm"><option value="CALL">Llamada</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">Correo</option><option value="MEETING">Reunión</option><option value="TASK">Tarea</option><option value="NOTE">Nota</option></select><input required name="subject" placeholder="Asunto del contacto" className="h-10 rounded-md border border-border px-3 text-sm" /><textarea name="body" placeholder="Detalle del seguimiento" className="min-h-20 rounded-md border border-border px-3 py-2 text-sm sm:col-span-2" /><input name="dueAt" type="datetime-local" className="h-10 rounded-md border border-border px-3 text-sm" /><button disabled={busy} className="rounded-pill bg-dark px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Registrar actividad</button></div>
    </form>
    {message ? <p role="status" className="text-sm font-bold text-gray-text lg:col-span-2">{message}</p> : null}
  </div>;
}
