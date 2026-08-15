"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const statusOptions = [
  { value: "borrador", label: "Borrador" },
  { value: "enviada", label: "Enviada" },
  { value: "evaluacion", label: "En evaluacion" },
  { value: "requiere_info", label: "Requiere informacion" },
  { value: "cotizada", label: "Cotizada" },
  { value: "aprobada", label: "Aprobada" },
  { value: "convertida", label: "Convertida" },
  { value: "cerrada", label: "Cerrada" },
  { value: "nuevo", label: "Nuevo (legacy)" },
  { value: "contactado", label: "Contactado (legacy)" },
  { value: "cerrado", label: "Cerrado (legacy)" },
] as const;

type QuoteStatus = (typeof statusOptions)[number]["value"];

function readApiError(payload: unknown) {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
    if (typeof error === "object" && error !== null && "message" in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  return "No se pudo actualizar el estado.";
}

export function QuoteStatusControl({ quoteId, status }: { quoteId: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(nextStatus: QuoteStatus) {
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/admin/cotizaciones/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(readApiError(payload));
        return;
      }

      router.refresh();
    });
  }

  return (
    <div>
      <select
        aria-label={`Estado de ${quoteId}`}
        className="rounded-md border border-border bg-white px-3 py-2 text-sm font-bold text-dark disabled:opacity-55"
        value={status}
        disabled={isPending}
        onChange={(event) => handleChange(event.target.value as QuoteStatus)}
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-xs text-danger" role="alert" aria-live="assertive">{error}</p> : null}
    </div>
  );
}
