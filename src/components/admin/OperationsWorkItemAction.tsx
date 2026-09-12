"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OperationsWorkItemAction({
  workItemId,
  taken = false,
  assigneeId,
  assignees = [],
  resolvable = false,
  reassignable = false,
}: {
  workItemId: string;
  taken?: boolean;
  assigneeId?: string | null;
  assignees?: Array<{ id: string; label: string }>;
  resolvable?: boolean;
  reassignable?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showReassign, setShowReassign] = useState(false);
  const [nextAssigneeId, setNextAssigneeId] = useState(assigneeId ?? "");
  const [reason, setReason] = useState("");
  async function runAction(
    action: "take" | "resolve" | "reassign",
    details: Record<string, string | null> = {},
  ) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/operaciones/${encodeURIComponent(workItemId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...details }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: unknown };
      if (!response.ok)
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : action === "resolve"
              ? "No se pudo resolver la tarea."
              : action === "reassign"
                ? "No se pudo reasignar la tarea."
                : "No se pudo tomar la tarea.",
        );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : action === "resolve"
            ? "No se pudo resolver la tarea."
            : action === "reassign"
              ? "No se pudo reasignar la tarea."
              : "No se pudo tomar la tarea.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (taken && !resolvable && !reassignable)
    return <span className="text-[9px] font-semibold text-[#8195aa]">Asignada</span>;
  return (
    <span className="inline-flex items-center gap-2">
      {!taken ? (
        <button
          type="button"
          onClick={() => void runAction("take")}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md border border-[#dce6ee] px-2 py-1.5 text-[9px] font-extrabold text-[#304b66] hover:border-[#2277ee] hover:text-[#2277ee] disabled:opacity-50"
        >
          {busy ? "Tomando…" : "Tomar"}
        </button>
      ) : null}
      {resolvable ? (
        <button
          type="button"
          onClick={() => void runAction("resolve")}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md border border-[#b7e2ce] bg-[#f2fbf5] px-2 py-1.5 text-[9px] font-extrabold text-[#287d4d] hover:border-[#3aa965] disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Resolver"}
        </button>
      ) : null}
      {reassignable ? (
        <button
          type="button"
          onClick={() => setShowReassign((current) => !current)}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md border border-[#dce6ee] px-2 py-1.5 text-[9px] font-extrabold text-[#526b84] hover:border-[#2277ee] hover:text-[#2277ee] disabled:opacity-50"
        >
          Reasignar
        </button>
      ) : null}
      {showReassign ? (
        <span className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-[#dce6ee] bg-[#fbfcfd] p-1.5">
          <label className="sr-only" htmlFor={`assignee-${workItemId}`}>
            Nuevo responsable
          </label>
          <select
            id={`assignee-${workItemId}`}
            value={nextAssigneeId}
            onChange={(event) => setNextAssigneeId(event.target.value)}
            className="h-7 max-w-[140px] rounded-md border border-[#dce6ee] bg-white px-1.5 text-[9px] font-bold text-[#304b66]"
          >
            <option value="">Sin asignar</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.label}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor={`reason-${workItemId}`}>
            Motivo de reasignación
          </label>
          <input
            id={`reason-${workItemId}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Motivo requerido"
            className="h-7 w-[130px] rounded-md border border-[#dce6ee] bg-white px-1.5 text-[9px] text-[#304b66]"
          />
          <button
            type="button"
            onClick={() => void runAction("reassign", { assigneeId: nextAssigneeId || null, reason })}
            disabled={busy || !reason.trim()}
            className="h-7 rounded-md bg-[#2277ee] px-2 text-[9px] font-extrabold text-white disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </span>
      ) : null}
      {message ? (
        <span role="alert" className="max-w-[120px] text-[9px] font-semibold text-[#d94848]">
          {message}
        </span>
      ) : null}
    </span>
  );
}
