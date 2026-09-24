"use client";

import { useState, type FormEvent } from "react";

const inputClass = "mt-2 h-11 w-full rounded-md border border-border bg-white px-3 text-sm font-semibold text-brand-primary-900 outline-none transition placeholder:text-text-secondary/70 focus:border-brand-secondary-600 focus:ring-2 focus:ring-brand-secondary-600/10";
const textareaClass = "mt-2 min-h-32 w-full rounded-md border border-border bg-white px-3 py-3 text-sm font-semibold text-brand-primary-900 outline-none transition placeholder:text-text-secondary/70 focus:border-brand-secondary-600 focus:ring-2 focus:ring-brand-secondary-600/10";
type Receipt = { ticketNumber: string; data: Record<string, string>; submittedAt: string };

export function ComplaintsForm() {
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setMessage("");
    setErrors({});
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
    const payload = { ...data };
    payload.requestId = crypto.randomUUID();
    try {
      const response = await fetch("/api/libro-de-reclamaciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = (await response.json()) as { success?: boolean; message?: string; ticketNumber?: string; errors?: Record<string, string> };
      if (!response.ok || !result.success) {
        setState("error");
        setMessage(result.message ?? "Revisa los datos e intenta nuevamente.");
        setErrors(result.errors ?? {});
        return;
      }
      setState("success");
      setMessage(result.message ?? "Solicitud registrada correctamente.");
      setReceipt({ ticketNumber: result.ticketNumber ?? "No asignado", data, submittedAt: new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date()) });
      event.currentTarget.reset();
    } catch {
      setState("error");
      setMessage("No hay conexión con el canal de reclamaciones. Intenta nuevamente.");
    }
  }

  function downloadReceipt() {
    if (!receipt) return;
    const text = [
      "COLDPOWER — LIBRO DE RECLAMACIONES",
      `Número correlativo: ${receipt.ticketNumber}`,
      `Fecha de recepción: ${receipt.submittedAt}`,
      `Titular: ${receipt.data.name}`,
      `Documento: ${receipt.data.documentType} ${receipt.data.documentNumber}`,
      `Tipo: ${receipt.data.complaintType === "QUEJA" ? "Queja" : "Reclamo"}`,
      `Producto o referencia: ${receipt.data.productReference || "No indicado"}`,
      "",
      "Detalle:",
      receipt.data.detail,
      "",
      "Esta copia confirma la recepción de la solicitud y conserva su número correlativo para seguimiento.",
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `libro-reclamaciones-${receipt.ticketNumber}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (state === "success") {
    return <div className="rounded-lg border border-success/30 bg-success/10 p-6 text-sm leading-6 text-brand-primary-900" role="status" aria-live="polite"><p className="font-display text-2xl font-black">Solicitud registrada</p><p className="mt-2">{message}</p><p className="mt-3 font-bold">Número correlativo: {receipt?.ticketNumber}</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" className="inline-flex h-10 items-center justify-center rounded-pill bg-brand-primary-900 px-4 text-sm font-extrabold text-white" onClick={downloadReceipt}>Descargar copia</button><button type="button" className="inline-flex h-10 items-center justify-center rounded-pill border border-brand-secondary-600 px-4 text-sm font-extrabold text-brand-secondary-600" onClick={() => window.print()}>Imprimir copia</button></div><button type="button" className="mt-5 font-extrabold text-brand-secondary-600 underline" onClick={() => { setState("idle"); setMessage(""); setReceipt(null); }}>Registrar otra solicitud</button></div>;
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-xs font-extrabold text-brand-primary-900">Nombre completo<input name="name" required className={inputClass} autoComplete="name" aria-invalid={Boolean(errors.name)} />{errors.name ? <span className="mt-1 block text-xs font-semibold text-danger">{errors.name}</span> : null}</label>
        <label className="text-xs font-extrabold text-brand-primary-900">Tipo de documento<select name="documentType" defaultValue="DNI" className={inputClass} aria-invalid={Boolean(errors.documentType)}><option value="DNI">DNI</option><option value="CE">Carné de extranjería</option><option value="RUC">RUC</option><option value="PASAPORTE">Pasaporte</option></select>{errors.documentType ? <span className="mt-1 block text-xs font-semibold text-danger">{errors.documentType}</span> : null}</label>
        <label className="text-xs font-extrabold text-brand-primary-900">Número de documento<input name="documentNumber" required className={inputClass} aria-invalid={Boolean(errors.documentNumber)} />{errors.documentNumber ? <span className="mt-1 block text-xs font-semibold text-danger">{errors.documentNumber}</span> : null}</label>
        <label className="text-xs font-extrabold text-brand-primary-900">Correo electrónico<input name="email" type="email" required className={inputClass} autoComplete="email" aria-invalid={Boolean(errors.email)} />{errors.email ? <span className="mt-1 block text-xs font-semibold text-danger">{errors.email}</span> : null}</label>
        <label className="text-xs font-extrabold text-brand-primary-900">Teléfono<input name="phone" type="tel" required className={inputClass} autoComplete="tel" aria-invalid={Boolean(errors.phone)} />{errors.phone ? <span className="mt-1 block text-xs font-semibold text-danger">{errors.phone}</span> : null}</label>
        <label className="text-xs font-extrabold text-brand-primary-900 sm:col-span-2">Dirección<input name="address" required className={inputClass} autoComplete="street-address" aria-invalid={Boolean(errors.address)} />{errors.address ? <span className="mt-1 block text-xs font-semibold text-danger">{errors.address}</span> : null}</label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-xs font-extrabold text-brand-primary-900">Tipo de solicitud<select name="complaintType" defaultValue="RECLAMO" className={inputClass}><option value="RECLAMO">Reclamo</option><option value="QUEJA">Queja</option></select></label>
        <label className="text-xs font-extrabold text-brand-primary-900">Producto o referencia (opcional)<input name="productReference" className={inputClass} placeholder="SKU, pedido o referencia" /></label>
      </div>
      <label className="text-xs font-extrabold text-brand-primary-900">Detalle de la solicitud<textarea name="detail" required className={textareaClass} aria-invalid={Boolean(errors.detail)} />{errors.detail ? <span className="mt-1 block text-xs font-semibold text-danger">{errors.detail}</span> : null}</label>
      <label className="flex items-start gap-3 text-xs font-semibold leading-5 text-text-secondary"><input name="consent" value="true" type="checkbox" required className="mt-1 h-4 w-4 rounded border-border accent-brand-secondary-600" /><span>Declaro que la información proporcionada es verdadera y autorizo su uso para atender esta solicitud.</span></label>
      {errors.consent ? <span className="-mt-3 text-xs font-semibold text-danger">{errors.consent}</span> : null}
      {message && state === "error" ? <p className="rounded-md border border-danger/25 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger" role="alert">{message}</p> : null}
      <button type="submit" disabled={state === "sending"} className="inline-flex h-12 items-center justify-center rounded-pill bg-primary px-5 text-sm font-extrabold text-white shadow-card transition hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-60">{state === "sending" ? "Registrando…" : "Enviar solicitud"}</button>
    </form>
  );
}
