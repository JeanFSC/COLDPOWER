"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MoreVertical, PlayCircle } from "lucide-react";
import { requestIntegrationTest } from "@/lib/integration-test-request";

export function TestIntegrationsButton({ integrationKey, compact = false }: { integrationKey?: string; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const errorId = useId();

  async function run() {
    setBusy(true);
    setError("");
    try {
      await requestIntegrationTest(integrationKey);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo probar la integración.");
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <div className="inline-flex min-w-0 flex-col items-end gap-1"><button type="button" onClick={run} disabled={busy} aria-busy={busy} aria-describedby={error ? errorId : undefined} className="inline-flex h-7 items-center gap-1 rounded-md border border-[#dce6ee] bg-white px-2 text-[10px] font-extrabold text-[#2277ee] transition hover:border-[#2277ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50">
        {busy ? <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden="true" /> : <PlayCircle className="h-3 w-3" aria-hidden="true" />}
        {busy ? "Probando…" : "Probar"}
      </button>{error ? <span id={errorId} role="alert" className="max-w-[220px] break-words text-right text-[10px] font-semibold text-[#b42318]">{error}</span> : null}</div>
    );
  }
  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={run} disabled={busy} aria-busy={busy} aria-describedby={error ? errorId : undefined} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2277ee] px-3.5 text-[11px] font-extrabold text-white shadow-[0_6px_14px_rgba(34,119,238,0.18)] transition hover:bg-[#1769d4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60">
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PlayCircle className="h-4 w-4" aria-hidden="true" />}
        {busy ? "Probando…" : "Probar integración"}
      </button>
      {error ? <span id={errorId} role="alert" className="max-w-[220px] break-words text-right text-[10px] font-semibold text-[#b42318]">{error}</span> : null}
    </div>
  );
}

export function IntegrationRowMenu({ integrationKey }: { integrationKey: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setOpen(false);
    setBusy(true);
    setError("");
    try {
      await requestIntegrationTest(integrationKey);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo probar la integración.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative inline-block shrink-0">
      {error ? <p role="alert" className="mb-2 max-w-[220px] break-words text-right text-[11px] font-semibold text-[#b42318]">{error}</p> : null}
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
