"use client";

import { useEffect, useMemo, useState } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";

export async function fetchQuoteLookup<T>(url: string, signal: AbortSignal, fallback: string): Promise<T[]> {
  const response = await fetch(url, { signal, cache: "no-store" });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(apiErrorMessage(payload?.error, fallback));
  if (!Array.isArray(payload?.items)) throw new Error(fallback);
  return payload.items as T[];
}

export function useQuoteLookup<T>(url: string | null, fallback: string) {
  const [attempt, setAttempt] = useState(0);
  const request = useMemo(() => url ? { url, attempt } : null, [url, attempt]);
  const [result, setResult] = useState<{
    request: typeof request;
    items: T[];
    error: string;
  }>({ request: null, items: [], error: "" });
  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetchQuoteLookup<T>(request.url, controller.signal, fallback)
        .then((items) => {
          if (!controller.signal.aborted) setResult({ request, items, error: "" });
        })
        .catch(() => {
          if (!controller.signal.aborted) setResult({ request, items: [], error: fallback });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [request, fallback]);
  const current = Boolean(request && result.request === request);
  return {
    items: current ? result.items : [],
    loading: Boolean(request && !current),
    error: current ? result.error : "",
    retry: () => setAttempt((value) => value + 1),
  };
}

export function QuoteLookupStatus({
  query, kind, loading, error, count, retry,
}: {
  query: string;
  kind: "clientes" | "productos";
  loading: boolean;
  error: string;
  count: number;
  retry: () => void;
}) {
  if (query.trim().length < 2) return (
    <p className="text-xs font-normal text-[#657f96]">Escribe al menos 2 caracteres para buscar {kind}.</p>
  );
  if (loading) return <p role="status" className="text-xs font-normal text-[#657f96]">Buscando {kind}…</p>;
  if (error) return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-600/20 bg-rose-600/5 p-3 text-xs font-normal text-rose-700">
      <span>{error}</span>
      <button type="button" onClick={retry} aria-label={`Reintentar búsqueda de ${kind}`} className="rounded-md border border-rose-600/20 px-3 py-2 font-bold hover:bg-rose-50">Reintentar</button>
    </div>
  );
  if (!count) return <p role="status" className="break-words text-xs font-normal text-[#657f96]">No se encontraron {kind} para «{query.trim()}».</p>;
  const label = count === 1 ? (kind === "clientes" ? "cliente encontrado" : "producto encontrado") : `${kind} encontrados`;
  return <p role="status" className="sr-only">{count} {label}.</p>;
}
