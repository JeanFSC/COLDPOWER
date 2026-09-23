"use client";

import { useState } from "react";
import { BellRing, Check, LoaderCircle } from "lucide-react";
import { notificationPreferenceOptions } from "@/lib/notification-preferences";

export function NotificationPreferencesPanel({ initialPreferences }: { initialPreferences: Record<string, boolean> }) {
  const [preferences, setPreferences] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(notificationPreferenceOptions.map((option) => [option.key, initialPreferences[option.key] ?? initialPreferences["*"] !== false])),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/notificaciones/preferencias", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      if (!response.ok) throw new Error("No se pudieron guardar las preferencias.");
      setMessage("Preferencias guardadas.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron guardar las preferencias.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs" aria-labelledby="notification-preferences-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600"><BellRing className="h-4 w-4" /></span>
          <div>
            <h3 id="notification-preferences-title" className="text-xs font-bold tracking-tight text-slate-900">Preferencias personales</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Elige qué avisos internos quieres recibir. Esta configuración solo afecta a tu usuario.</p>
          </div>
        </div>
        <button type="button" onClick={() => void save()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {busy ? "Guardando…" : "Guardar preferencias"}
        </button>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {notificationPreferenceOptions.map((option) => (
          <label key={option.key} className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 transition-colors hover:border-blue-100 hover:bg-blue-50/40">
            <input type="checkbox" checked={preferences[option.key] !== false} onChange={(event) => setPreferences((current) => ({ ...current, [option.key]: event.target.checked }))} className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <span className="min-w-0"><span className="block text-[11px] font-semibold text-slate-700">{option.label}</span><span className="mt-0.5 block text-[10px] leading-snug text-slate-400">{option.description}</span></span>
          </label>
        ))}
      </div>
      {message ? <p role="status" className={`mt-3 text-[11px] font-medium ${message.includes("guardadas") ? "text-emerald-600" : "text-rose-600"}`}>{message}</p> : null}
    </section>
  );
}
