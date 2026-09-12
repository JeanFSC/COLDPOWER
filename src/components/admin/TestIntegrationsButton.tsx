"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, PlayCircle } from "lucide-react";

export function TestIntegrationsButton({ integrationKey, compact = false }: { integrationKey?: string; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      const url = integrationKey ? `/api/admin/configuracion/integraciones/${integrationKey}/probar` : "/api/admin/configuracion/integraciones/probar";
      const response = await fetch(url, { method: "POST" });
      const result = await response.json() as { error?: string; errorObject?: { message?: string } };
      if (!response.ok) throw new Error(result.errorObject?.message || result.error || "No se pudo probar la integración.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo probar la integración.");
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <button type="button" onClick={run} disabled={busy} className="inline-flex h-7 items-center gap-1 rounded-md border border-[#dce6ee] bg-white px-2 text-[10px] font-extrabold text-[#2277ee] transition hover:border-[#2277ee] disabled:opacity-50">
        {busy ? <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden="true" /> : <PlayCircle className="h-3 w-3" aria-hidden="true" />}
        Probar
      </button>
    );
  }
  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={run} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2277ee] px-3.5 text-[11px] font-extrabold text-white shadow-[0_6px_14px_rgba(34,119,238,0.18)] transition hover:bg-[#1769d4] disabled:opacity-60">
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PlayCircle className="h-4 w-4" aria-hidden="true" />}
        {busy ? "Probando…" : "Probar integración"}
      </button>
      {error ? <span role="alert" className="max-w-[220px] text-right text-[10px] font-semibold text-[#b42318]">{error}</span> : null}
    </div>
  );
}
