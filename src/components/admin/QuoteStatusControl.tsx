"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { quoteActionsForStatus, quoteStatusLabels, type QuoteDisplayStatus, type QuoteWorkflowStatus } from "@/lib/quote-workflow";

type Props = { quoteId: string; status: string };

function readApiError(payload: unknown) {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
    if (typeof error === "object" && error !== null && "message" in error) return String((error as { message?: unknown }).message ?? "");
  }
  return "No se pudo actualizar la cotización.";
}

export function QuoteStatusControl({ quoteId, status }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelReason, setShowCancelReason] = useState(false);
  const displayStatus = (status in quoteStatusLabels ? status : "DRAFT") as QuoteDisplayStatus;
  const actions = quoteActionsForStatus(displayStatus);
  const nextStatus = (action: string): QuoteWorkflowStatus | null => action === "cancel" ? "CANCELLED" : action === "send" || action === "resend" ? "SENT" : action === "follow_up" ? "FOLLOW_UP" : action === "accept" ? "ACCEPTED" : action === "reject" ? "REJECTED" : action === "expire" ? "EXPIRED" : null;

  function apply(action: string) {
    const workflowStatus = nextStatus(action);
    if (!workflowStatus) return;
    setError(null);
    startTransition(async () => {
      const reason = workflowStatus === "CANCELLED" ? cancelReason.trim() : undefined;
      if (workflowStatus === "CANCELLED" && !reason) { setShowCancelReason(true); return; }
      const response = await fetch(`/api/admin/cotizaciones/${encodeURIComponent(quoteId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflowStatus, reason }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setError(readApiError(payload)); return; }
      router.refresh();
    });
  }

  return <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-extrabold text-dark">{quoteStatusLabels[displayStatus]}</span>{actions.filter((action) => nextStatus(action)).slice(0, 2).map((action) => <button key={action} type="button" disabled={isPending} onClick={() => apply(action)} className="rounded-md border border-border bg-white px-2.5 py-1 text-[11px] font-bold text-dark hover:border-primary disabled:opacity-50">{action === "cancel" ? "Cancelar" : action === "accept" ? "Aceptar" : action === "reject" ? "Rechazar" : action === "follow_up" ? "Seguimiento" : action === "expire" ? "Vencer" : "Enviar"}</button>)}{showCancelReason ? <div className="basis-full rounded-lg border border-warning/25 bg-warning/5 p-2"><label className="grid gap-1 text-[11px] font-bold text-dark">Motivo de cancelación<textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className="mt-1 min-h-16 rounded border border-border p-2 font-normal" maxLength={500} /></label><button type="button" disabled={isPending || !cancelReason.trim()} onClick={() => apply("cancel")} className="mt-2 rounded-md bg-danger px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50">Confirmar cancelación</button></div> : null}{error ? <span className="text-xs font-semibold text-danger" role="alert">{error}</span> : null}</div>;
}

// Legacy persisted values retained for migration and audit only: borrador, enviada, evaluacion, requiere_info, cotizada, aprobada, convertida, cerrada.
