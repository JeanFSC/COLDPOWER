"use client";

import { useCallback, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { publishNotificationConfirmation } from "@/components/admin/useConfirmedNotifications";
import { apiErrorMessage } from "@/lib/api-error-message";

export function MarkAsReadButton({ id, isUnread }: { id: string; isUnread: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (nextState = isUnread ? "READ" : "UNREAD") => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/notificaciones/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: nextState }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(apiErrorMessage(result.error, "No se pudo actualizar la lectura."));
      publishNotificationConfirmation(result);
      if (typeof result.unreadCount !== "number") setError("Lectura guardada. No se pudieron actualizar los contadores; recarga para consultarlos.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la lectura.");
    } finally {
      setBusy(false);
    }
  }, [id, isUnread]);

  return (
    <div className="space-y-2">
    <button
      type="button"
      onClick={() => { void run(); }}
      disabled={busy}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 shadow-2xs transition-colors hover:bg-slate-50 disabled:opacity-60"
    >
      {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-emerald-600" />}
      <span>{isUnread ? "Marcar como leída" : "Marcar como no leída"}</span>
    </button>
    {error ? <p role="alert" className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
