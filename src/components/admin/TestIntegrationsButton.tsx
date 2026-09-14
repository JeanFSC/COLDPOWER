"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MoreVertical, PlayCircle } from "lucide-react";

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

export function IntegrationRowMenu({ integrationKey }: { integrationKey: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    setOpen(false);
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/configuracion/integraciones/${integrationKey}/probar`, { method: "POST" });
      if (response.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative inline-block shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={busy}
        aria-label="Acciones de la integración"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#8296a9] transition hover:bg-[#f1f4f7] hover:text-[#304b66] disabled:opacity-50"
      >
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <MoreVertical className="h-4 w-4" aria-hidden="true" />}
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} aria-label="Cerrar" />
          <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-[#dce6ee] bg-white p-1 shadow-[0_12px_28px_rgba(16,42,67,0.14)]">
            <button type="button" onClick={run} className="block w-full rounded-md px-3 py-2 text-left text-[11px] font-bold text-[#304b66] hover:bg-[#f4f8fb]">
              Probar conexión
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
