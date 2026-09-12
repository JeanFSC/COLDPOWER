"use client";

import { useState } from "react";

type Candidate = { id: string; sku: string; name: string };
type Decision = "pending" | "different" | "confirmed" | "keep_both";

export function DuplicateDecisionControl({ productId, currentDecision, currentCanonicalProductId, candidates, onSaved }: { productId: string; currentDecision: string; currentCanonicalProductId: string | null; candidates: Candidate[]; onSaved?: () => void }) {
  const [decision, setDecision] = useState<Decision>((["pending", "different", "confirmed", "keep_both"] as string[]).includes(currentDecision) ? currentDecision as Decision : "pending");
  const [canonicalProductId, setCanonicalProductId] = useState(currentCanonicalProductId ?? "");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/catalogo/${productId}/duplicate`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, canonicalProductId: decision === "confirmed" ? canonicalProductId : null, note }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
      setMessage("Guardado"); onSaved?.();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Error"); }
    finally { setBusy(false); }
  }
  return <div className="mt-3 space-y-2 rounded-md border border-border bg-background p-2"><select aria-label="Decisión de duplicado" value={decision} onChange={(event) => setDecision(event.target.value as Decision)} className="h-8 w-full rounded-md border border-border bg-white px-2 text-xs font-semibold text-dark"><option value="pending">Pendiente</option><option value="different">Son diferentes</option><option value="confirmed">Duplicado confirmado</option><option value="keep_both">Mantener ambos</option></select>{decision === "confirmed" ? <select aria-label="Producto canónico" value={canonicalProductId} onChange={(event) => setCanonicalProductId(event.target.value)} className="h-8 w-full rounded-md border border-border bg-white px-2 text-xs text-dark"><option value="">Selecciona canónico</option>{candidates.filter((candidate) => candidate.id !== productId).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.sku} · {candidate.name}</option>)}</select> : null}<input aria-label="Nota de duplicado" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nota opcional" className="h-8 w-full rounded-md border border-border bg-white px-2 text-xs" /><div className="flex items-center gap-2"><button type="button" onClick={save} disabled={busy || (decision === "confirmed" && !canonicalProductId)} className="rounded-md bg-primary px-2 py-1.5 text-xs font-bold text-white disabled:opacity-50">{busy ? "..." : "Guardar decisión"}</button>{message ? <span className="text-[10px] text-gray-text">{message}</span> : null}</div></div>;
}
