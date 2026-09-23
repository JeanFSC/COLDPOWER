"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";

export function MarkAsReadButton({ id, isUnread }: { id: string; isUnread: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const autoMarked = useRef(false);

  const run = useCallback(async (nextState = isUnread ? "READ" : "UNREAD") => {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/notificaciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: nextState }),
      });
      if (response.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }, [id, isUnread, router]);

  useEffect(() => {
    if (!isUnread || autoMarked.current) return;
    autoMarked.current = true;
    void run("READ");
  }, [isUnread, run]);

  return (
    <button
      type="button"
      onClick={() => void run()}
      disabled={busy}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 shadow-2xs transition-colors hover:bg-slate-50 disabled:opacity-60"
    >
      {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-emerald-600" />}
      <span>{isUnread ? "Marcar como leída" : "Marcar como no leída"}</span>
    </button>
  );
}
