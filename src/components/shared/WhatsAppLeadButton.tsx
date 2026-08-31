"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/shared/Button";

export type WhatsAppLeadItem = { name: string; sku?: string; quantity?: number };
type Props = { children: ReactNode; title?: string; initialName?: string; initialPhone?: string; initialEmail?: string; productIds?: string[]; items?: WhatsAppLeadItem[]; className?: string; variant?: "primary" | "secondary" | "outline" | "ghost" | "whatsapp"; size?: "sm" | "md" | "lg"; disabled?: boolean; "aria-label"?: string };

export function WhatsAppLeadButton({ children, title, initialName = "", initialPhone = "", initialEmail = "", productIds = [], items = [], className, variant = "whatsapp", size = "md", disabled = false, "aria-label": ariaLabel }: Props) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { let cancelled = false; void fetch("/api/whatsapp/config", { cache: "no-store" }).then((response) => response.ok ? response.json() : { configured: false }).then((result: { configured?: boolean }) => { if (!cancelled) setConfigured(result.configured === true); }).catch(() => { if (!cancelled) setConfigured(false); }); return () => { cancelled = true; }; }, []);
  if (configured !== true) return null;

  async function submit() {
    setSubmitting(true); setError(""); const popup = window.open("about:blank", "_blank", "noopener,noreferrer");
    try { const response = await fetch("/api/whatsapp/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone, email, title, productIds, items }) }); const result = await response.json() as { url?: string; error?: string }; if (!response.ok || !result.url) throw new Error(result.error || "No se pudo registrar el lead."); if (popup) popup.location.href = result.url; else window.location.href = result.url; setOpen(false); } catch (submitError) { popup?.close(); setError(submitError instanceof Error ? submitError.message : "No se pudo registrar el lead."); } finally { setSubmitting(false); }
  }

  function openForm() { setName(initialName); setPhone(initialPhone); setEmail(initialEmail); setError(""); setOpen(true); }
  return <><Button type="button" variant={variant} size={size} className={className} disabled={disabled} aria-label={ariaLabel} onClick={openForm}>{children}</Button>{open ? <div className="fixed inset-0 z-[60] grid place-items-center bg-dark/55 p-4" role="dialog" aria-modal="true" aria-labelledby="whatsapp-lead-title"><div className="w-full max-w-md rounded-lg border border-border bg-white p-5 shadow-float sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">Antes de abrir WhatsApp</p><h2 id="whatsapp-lead-title" className="mt-2 font-display text-2xl font-black text-dark">Déjanos tus datos</h2></div><button type="button" className="text-sm font-bold text-gray-text" onClick={() => setOpen(false)}>Cerrar</button></div><p className="mt-3 text-sm leading-6 text-gray-text">Registraremos la oportunidad para que el equipo comercial pueda darle seguimiento.</p><div className="mt-5 grid gap-3"><label className="grid gap-1 text-sm font-bold text-dark">Nombre<input value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-md border border-border bg-background px-3" required /></label><label className="grid gap-1 text-sm font-bold text-dark">Teléfono / WhatsApp<input value={phone} onChange={(event) => setPhone(event.target.value)} className="h-11 rounded-md border border-border bg-background px-3" required /></label><label className="grid gap-1 text-sm font-bold text-dark">Correo (opcional)<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 rounded-md border border-border bg-background px-3" /></label></div>{error ? <p className="mt-4 rounded-md border border-danger/25 bg-danger/10 p-3 text-sm font-semibold text-danger" role="alert">{error}</p> : null}<div className="mt-5 flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="button" variant="whatsapp" disabled={submitting || !name.trim() || !phone.trim()} onClick={() => void submit()}>{submitting ? "Registrando..." : "Registrar y abrir"}</Button></div></div></div> : null}</>;
}
