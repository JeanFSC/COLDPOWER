"use client";

import { useState } from "react";
import { CreditCard, LoaderCircle } from "lucide-react";
import { Button } from "@/components/shared/Button";

export function PayOrderButton({ orderCode, label = "Pagar ahora" }: { orderCode: string; label?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/cuenta/pedidos/${encodeURIComponent(orderCode)}/pagar`, { method: "POST", credentials: "include" });
      const result = (await response.json().catch(() => ({}))) as { paymentUrl?: string | null; message?: string; error?: { message?: string } };
      if (response.ok && result.paymentUrl) { window.location.assign(result.paymentUrl); return; }
      setError(result.message ?? result.error?.message ?? "No se pudo iniciar el pago.");
    } catch {
      setError("No hay conexión. Inténtalo nuevamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button type="button" variant="primary" onClick={() => void start()} disabled={pending}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CreditCard className="h-4 w-4" aria-hidden="true" />}
        {pending ? "Abriendo pasarela…" : label}
      </Button>
      {error ? <p className="mt-2 text-sm font-semibold text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
