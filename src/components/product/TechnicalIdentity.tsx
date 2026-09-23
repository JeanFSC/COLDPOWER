import { Badge } from "@/components/shared/Badge";
import type { Product } from "@/types/product";

type TechnicalIdentityProps = { product: Product };

const statusLabel: Record<Product["status"], string> = {
  "in-stock": "Disponible",
  "low-stock": "Stock limitado",
  "on-request": "Bajo consulta",
  "out-of-stock": "No disponible",
};

export function TechnicalIdentity({ product }: TechnicalIdentityProps) {
  const specs = product.specs.filter((spec) => spec.label?.trim() && spec.value?.trim());
  const meta = [
    ["SKU ColdPower", product.sku],
    ["Marca", product.brand],
    ["Categoría", product.category],
    ["Familia", product.family],
    ["Estado comercial", statusLabel[product.status]],
  ].filter(([, value]) => value?.trim());

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {product.type?.trim() ? <Badge variant="tech">{product.type}</Badge> : null}
        <Badge variant="neutral">{statusLabel[product.status]}</Badge>
        {product.sourceStatus?.trim() ? <Badge variant="warning">Estado fuente: {product.sourceStatus}</Badge> : null}
      </div>
      {product.brand?.trim() ? <p className="mt-5 text-sm font-bold uppercase tracking-[0.12em] text-brand-secondary-600">{product.brand}</p> : null}
      <h1 className="mt-2 font-display text-3xl font-black leading-tight tracking-tight text-dark sm:text-4xl">{product.name}</h1>
      {product.shortDescription?.trim() ? <p className="mt-4 text-base leading-7 text-gray-text">{product.shortDescription}</p> : null}
      <dl className="mt-6 grid gap-3 rounded-md border border-border bg-background p-4 sm:grid-cols-2">
        {meta.map(([label, value]) => <div key={label}><dt className="text-xs font-bold uppercase tracking-[0.1em] text-gray-text">{label}</dt><dd className="mt-1 break-words text-sm font-bold text-dark">{value}</dd></div>)}
      </dl>
      {specs.length > 0 ? (
        <section id="especificaciones" className="mt-8">
          <h2 className="font-display text-2xl font-black text-dark">Especificaciones técnicas</h2>
          <div className="mt-4 overflow-hidden rounded-md border border-border"><dl className="divide-y divide-border">{specs.map((spec) => <div key={`${spec.label}-${spec.value}`} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-4"><dt className="text-sm font-bold text-gray-text">{spec.label}</dt><dd className="text-sm font-semibold text-dark sm:text-right">{spec.value}</dd></div>)}</dl></div>
        </section>
      ) : null}
    </div>
  );
}

