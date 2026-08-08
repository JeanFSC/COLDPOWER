import { Badge } from "@/components/shared/Badge";
import { company } from "@/data/company";
import { formatProductPrice } from "@/lib/formatters";
import type { Product } from "@/types/product";

type QuoteSummaryProps = {
  product?: Product;
};

const statusLabel: Record<Product["status"], string> = {
  "in-stock": "Disponible",
  "low-stock": "Stock bajo",
  "on-request": "Bajo pedido",
  "out-of-stock": "Agotado",
};

export function QuoteSummary({ product }: QuoteSummaryProps) {
  return (
    <aside className="w-full min-w-0 max-w-full overflow-hidden rounded-lg bg-dark p-6 text-white shadow-float sm:p-8">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
        Resumen de cotización
      </p>
      <h2 className="mt-3 break-words font-display text-3xl font-black tracking-normal">
        {product ? product.name : "Cotización sin producto específico"}
      </h2>
      <p className="mt-4 text-sm leading-6 text-gray-light">
        Completa tus datos y un asesor validará compatibilidad, disponibilidad y precio final.
      </p>

      <dl className="mt-7 grid gap-4">
        <div className="rounded-md border border-white/10 bg-white/8 p-4">
          <dt className="text-xs font-extrabold uppercase tracking-[0.14em] text-gray-light">
            Producto de interés
          </dt>
          <dd className="mt-2 font-extrabold">{product?.name ?? "Por definir con asesor"}</dd>
        </div>
        {product ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-md border border-white/10 bg-white/8 p-4">
                <dt className="text-xs font-extrabold uppercase tracking-[0.14em] text-gray-light">
                  SKU
                </dt>
                <dd className="mt-2 font-mono text-sm font-extrabold">{product.sku}</dd>
              </div>
              <div className="rounded-md border border-white/10 bg-white/8 p-4">
                <dt className="text-xs font-extrabold uppercase tracking-[0.14em] text-gray-light">
                  Estado
                </dt>
                <dd className="mt-2">
                  <Badge variant={product.status === "out-of-stock" ? "danger" : "stock"}>
                    {statusLabel[product.status]}
                  </Badge>
                </dd>
              </div>
            </div>
            <div className="rounded-md border border-white/10 bg-white/8 p-4">
              <dt className="text-xs font-extrabold uppercase tracking-[0.14em] text-gray-light">
                Precio referencial
              </dt>
              <dd className="mt-2 font-display text-3xl font-black text-primary">
                {formatProductPrice(product.price)}
              </dd>
            </div>
          </>
        ) : null}
      </dl>

      <div className="mt-7 rounded-md border border-primary/35 bg-primary/10 p-4 text-sm leading-6">
        <p className="font-extrabold">{company.quoteNotice}.</p>
        <p className="mt-1 text-gray-light">
          WhatsApp queda como canal operativo temporal para coordinar detalles y disponibilidad.
        </p>
      </div>
    </aside>
  );
}
