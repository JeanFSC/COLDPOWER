import { CheckCircle2 } from "lucide-react";
import type { Product } from "@/types/product";
import { ProductMedia } from "@/components/catalog/ProductMedia";
import { Badge } from "@/components/shared/Badge";

type QuoteSummaryProps = { product?: Product };
const statusLabel: Record<Product["status"], string> = {
  "in-stock": "Disponible",
  "low-stock": "Stock limitado",
  "on-request": "Consultar disponibilidad",
  "out-of-stock": "No disponible",
};

export function QuoteSummary({ product }: QuoteSummaryProps) {
  return (
    <aside className="rounded-lg border border-border bg-white p-5 shadow-card sm:p-6">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-brand-secondary-600">Productos en tu solicitud</p>
      <h2 className="mt-2 font-display text-2xl font-black text-dark">{product ? "Referencia seleccionada" : "¿Qué repuesto necesitas?"}</h2>
      <p className="mt-2 text-sm leading-6 text-text-secondary">Completa tus datos y un asesor validará compatibilidad, disponibilidad y precio final.</p>
      {product ? (
        <div className="mt-6 overflow-hidden rounded-md border border-border">
          <ProductMedia product={product} sizes="160px" className="group" />
          <div className="p-4">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-brand-secondary-600">{product.brand}</p>
            <h3 className="mt-2 text-base font-extrabold leading-6 text-dark">{product.name}</h3>
            <p className="mt-2 font-mono text-xs font-semibold text-text-secondary">SKU: {product.sku}</p>
            <div className="mt-4 flex flex-wrap gap-2"><Badge variant={product.status === "out-of-stock" ? "danger" : "stock"}>{statusLabel[product.status]}</Badge><Badge variant="neutral">{product.category}</Badge></div>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-md border border-dashed border-border bg-surface-page p-4 text-sm leading-6 text-text-secondary">Puedes buscar el producto dentro del formulario o enviar una descripción general para que el equipo te ayude a identificarlo.</div>
      )}
      <div className="mt-5 grid gap-3 text-sm font-semibold text-text-secondary">
        <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />La solicitud queda registrada con tus datos.</p>
        <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />El asesor confirma condiciones antes de cerrar.</p>
      </div>
    </aside>
  );
}
