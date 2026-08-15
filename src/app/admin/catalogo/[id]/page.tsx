import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getProductAnalytics } from "@/lib/product-analytics";
import { ProductCommercialEditor } from "@/components/admin/ProductCommercialEditor";

export const metadata: Metadata = {
  title: "Análisis del producto | Panel admin ColdPower",
  description: "Inventario, ventas, oportunidades y rentabilidad disponible por producto.",
};

export default async function ProductAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("catalog.product.edit");
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const value = (key: string) => {
    const raw = query[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };
  const from = parseDate(value("from"));
  const to = parseDate(value("to"));
  const data = await getProductAnalytics(id, { from, to });
  if (!data)
    return (
      <div className="rounded-md border border-danger/25 bg-danger/5 p-6 text-sm text-gray-text">
        Producto no encontrado.
      </div>
    );
  return (
    <div>
      <Link href="/admin/catalogo" className="text-sm font-bold text-primary hover:underline">
        Volver al catálogo
      </Link>
      <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
        Análisis del producto
      </p>
      <h1 className="mt-2 font-display text-3xl font-black text-dark">{data.product.name}</h1>
      <p className="mt-2 font-mono text-sm text-gray-text">{data.product.sku}</p>
      <form
        method="get"
        className="mt-6 grid gap-3 rounded-md border border-border bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <label className="grid gap-1 text-xs font-bold text-gray-text">
          Desde
          <input
            type="date"
            name="from"
            defaultValue={value("from")}
            className="h-10 rounded-md border border-border bg-background px-2 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs font-bold text-gray-text">
          Hasta
          <input
            type="date"
            name="to"
            defaultValue={value("to")}
            className="h-10 rounded-md border border-border bg-background px-2 text-sm"
          />
        </label>
        <button className="h-10 rounded-md bg-dark px-4 text-sm font-bold text-white">
          Aplicar periodo
        </button>
      </form>
      <ProductCommercialEditor
        productId={id}
        currentPrice={data.currentPrice}
        inventory={data.inventory}
      />
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Ventas hoy"
          value={data.salesToday.units + " und. / " + data.salesToday.revenue.toFixed(2)}
        />
        <Metric
          label="Ventas 7 días"
          value={data.sales7Days.units + " und. / " + data.sales7Days.revenue.toFixed(2)}
        />
        <Metric
          label="Ventas 30 días"
          value={data.sales30Days.units + " und. / " + data.sales30Days.revenue.toFixed(2)}
        />
        <Metric
          label="Ventas periodo"
          value={data.salesRange.units + " und. / " + data.salesRange.revenue.toFixed(2)}
        />
        <Metric label="Cotizaciones abiertas" value={data.quotes} />
        <Metric label="Cotizaciones convertidas" value={data.convertedQuotes} />
        <Metric label="Cantidad cotizada" value={data.quotedUnits + " und."} />
        <Metric
          label="Conversión"
          value={data.conversion === null ? "Sin datos" : (data.conversion * 100).toFixed(1) + "%"}
        />
        <Metric label="Oportunidades abiertas" value={data.opportunities} />
        <Metric label="Rotación" value={data.rotation} />
        <Metric
          label="Margen"
          value={data.margin === null ? "Sin costo/precio vendido" : data.margin.toFixed(2)}
        />
      </section>
      <section className="mt-6 rounded-md border border-border bg-white p-5">
        <h2 className="font-display text-2xl font-black text-dark">Inventario por local</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-xs font-extrabold uppercase tracking-[0.08em] text-gray-text">
              <tr>
                <th className="px-3 py-2">Local</th>
                <th className="px-3 py-2">Físico</th>
                <th className="px-3 py-2">Reservado</th>
                <th className="px-3 py-2">Disponible</th>
                <th className="px-3 py-2">Mínimo</th>
              </tr>
            </thead>
            <tbody>
              {data.inventory.map((row) => (
                <tr key={row.locationId} className="border-b border-border">
                  <td className="px-3 py-3 font-bold text-dark">{row.location}</td>
                  <td className="px-3 py-3 text-gray-text">{row.onHand}</td>
                  <td className="px-3 py-3 text-gray-text">{row.reserved}</td>
                  <td className="px-3 py-3 font-bold text-dark">{row.available}</td>
                  <td className="px-3 py-3 text-gray-text">{row.minimumStock ?? "No definido"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.inventory.length ? (
            <p className="mt-4 text-sm text-gray-text">
              No existe saldo de inventario para este producto.
            </p>
          ) : null}
        </div>
      </section>
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Info title="Precio actual" value={formatMoney(data.currentPrice)} />
        <Info title="Precio mayorista" value={formatMoney(data.wholesalePrice)} />
        <Info title="Último precio vendido" value={formatMoney(data.lastSoldPrice)} />
        <Info title="Promedio histórico" value={formatMoney(data.historicalAveragePrice)} />
        <Info title="Costo actual" value={formatMoney(data.cost)} />
      </section>
    </div>
  );
}

function parseDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
function formatMoney(value: { amount: number | null; currency: string } | null | undefined) {
  return value ? `${value.currency} ${value.amount?.toFixed(2)}` : "Sin dato confirmado";
}
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-white p-5">
      <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-gray-text">{label}</p>
      <p className="mt-2 font-display text-xl font-black text-dark">{value}</p>
    </div>
  );
}
function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-white p-5">
      <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-gray-text">{title}</p>
      <p className="mt-2 text-lg font-black text-dark">{value}</p>
    </div>
  );
}
