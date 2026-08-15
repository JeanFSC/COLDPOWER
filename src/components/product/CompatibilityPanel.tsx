"use client";

import { useState } from "react";
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import type { Product } from "@/types/product";
import { evaluateCompatibility, type CompatibilityEvaluation } from "@/lib/compatibility";
import { trackCatalogEvent } from "@/lib/analytics";
import { Button } from "@/components/shared/Button";

type CompatibilityPanelProps = { product: Product };

const stateClasses = {
  confirmed: "border-success/30 bg-success/10 text-success",
  "specification-match": "border-primary/30 bg-primary/10 text-primary",
  "validation-required": "border-warning/40 bg-warning/15 text-warning-dark",
  "not-compatible": "border-danger/30 bg-danger/10 text-danger",
};

export function CompatibilityPanel({ product }: CompatibilityPanelProps) {
  const [equipmentModel, setEquipmentModel] = useState("");
  const [evaluation, setEvaluation] = useState<CompatibilityEvaluation>(() => evaluateCompatibility(product));
  const icon = evaluation.state === "confirmed" ? CheckCircle2 : evaluation.state === "not-compatible" ? XCircle : HelpCircle;

  return (
    <section id="compatibilidad" className="rounded-lg border border-border bg-white p-5 shadow-card sm:p-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">Validación técnica</p>
        <h2 className="mt-2 font-display text-2xl font-black text-dark">¿Es compatible con tu equipo?</h2>
        <p className="mt-2 text-sm leading-6 text-gray-text">Ingresa modelo, serie o referencia del equipo. El resultado orienta la búsqueda y no reemplaza la revisión de un asesor.</p>
      </div>

      <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => {
        event.preventDefault();
        const nextEvaluation = evaluateCompatibility(product, equipmentModel);
        setEvaluation(nextEvaluation);
        trackCatalogEvent("compatibility_checked", { productId: product.id, state: nextEvaluation.state });
      }}>
        <label className="sr-only" htmlFor="equipment-model">Modelo del equipo</label>
        <input id="equipment-model" value={equipmentModel} onChange={(event) => setEquipmentModel(event.target.value)} placeholder="Ej. ZR72KC, Mabe 220 V" className="h-12 min-w-0 flex-1 rounded-pill border border-border bg-background px-4 text-sm font-semibold text-dark outline-none transition placeholder:text-gray-text/70 focus:border-primary focus:ring-2 focus:ring-primary/15" />
        <Button type="submit" size="md">Comprobar compatibilidad</Button>
      </form>

      <div className={`mt-5 flex items-start gap-3 rounded-md border p-4 ${stateClasses[evaluation.state]}`} role="status" aria-live="polite">
        {(() => { const EvaluationIcon = icon; return <EvaluationIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />; })()}
        <div><p className="font-extrabold">{evaluation.label}</p><p className="mt-1 text-sm leading-6 opacity-90">{evaluation.reason}</p></div>
      </div>

      {evaluation.state !== "confirmed" && evaluation.state !== "not-compatible" ? <Button href={`/contacto?producto=${encodeURIComponent(product.slug)}#solicitud`} variant="outline" size="sm" className="mt-4">Solicitar validación técnica</Button> : null}
    </section>
  );
}
