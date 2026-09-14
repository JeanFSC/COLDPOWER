import type { Metadata } from "next";
import { AdminReportsStitch } from "@/components/admin/AdminReportsStitch";
import { requirePermission } from "@/lib/auth";
import { type DashboardFilters, type DashboardRange } from "@/lib/operations-dashboard";
import { getReportSnapshot, listReportOptions, listReportSchedules } from "@/lib/reporting-service";
import { dashboardFiltersToQuery } from "@/lib/dashboard-contract";

export const metadata: Metadata = {
  title: "Reportes | Panel admin ColdPower",
  description: "Indicadores comerciales y operativos calculados desde ColdPower.",
};

type Params = Record<string, string | string[] | undefined>;
function value(params: Params, key: string) {
  const raw = params[key];
  return Array.isArray(raw) ? raw[0] : raw;
}
function range(raw: string | undefined): DashboardRange {
  return raw === "today" ||
    raw === "yesterday" ||
    raw === "week" ||
    raw === "current_month" ||
    raw === "previous_month" ||
    raw === "year" ||
    raw === "custom"
    ? raw
    : "month";
}

function SelectField({
  name,
  label,
  value: selected,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-[10px] font-bold text-[#526b84]">
      {label}
      <select
        name={name}
        defaultValue={selected ?? ""}
        className="h-9 w-full min-w-0 max-w-full rounded-lg border border-[#dce6ee] bg-white px-2 text-[10px] text-[#173654]"
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={`${name}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function AdminReportesPage({
  searchParams,
}: {
  searchParams?: Promise<Params>;
}) {
  const actor = await requirePermission("reports.view");
  const params = (await searchParams) ?? {};
  const filters: DashboardFilters = {
    range: range(value(params, "range")),
    from: value(params, "from"),
    to: value(params, "to"),
    locationId: value(params, "locationId"),
    sellerId: value(params, "sellerId"),
    customerId: value(params, "customerId"),
    productId: value(params, "productId"),
    categoryId: value(params, "categoryId"),
    familyId: value(params, "familyId"),
    brandId: value(params, "brandId"),
    channel: value(params, "channel"),
    orderStatus: value(params, "orderStatus"),
    currency: value(params, "currency"),
  };
  type ReportSnapshot = Awaited<ReturnType<typeof getReportSnapshot>>;
  type ReportOptions = Awaited<ReturnType<typeof listReportOptions>>;
  let data: ReportSnapshot | null = null;
  let options: ReportOptions = {
    locations: [],
    sellers: [],
    customers: [],
    products: [],
    categories: [],
    families: [],
    brands: [],
  };
  let reportError = false;
  let schedules: Awaited<ReturnType<typeof listReportSchedules>> = [];
  try {
    [data, options, schedules] = await Promise.all([
      getReportSnapshot(filters, actor),
      listReportOptions(),
      listReportSchedules(actor),
    ]);
  } catch (error) {
    reportError = true;
    console.error("ColdPower: no se pudo cargar el reporte", error);
  }
  const metrics = [
    {
      label: "Ventas hoy",
      value: data ? formatMoney(data.salesToday.total, data.currency) : "N/D",
      note: data ? "Período actual" : "Datos no disponibles",
      tone: "blue" as const,
    },
    {
      label: "Ventas del mes",
      value: data ? formatMoney(data.salesMonth.total, data.currency) : "N/D",
      note: data ? "Acumulado" : "Datos no disponibles",
      tone: "orange" as const,
    },
    {
      label: "Margen bruto",
      value: data ? formatMoney(data.grossProfit, data.currency) : "N/D",
      note: !data?.currency
        ? "Selecciona una moneda"
        : data.grossMargin === null || data.grossMargin === undefined
          ? "Costo histórico incompleto"
          : `${(data.grossMargin * 100).toFixed(1)}% sobre ventas`,
      tone: "green" as const,
    },
    {
      label: "Ticket promedio",
      value: data
        ? data.salesRange.count
          ? formatMoney(data.salesRange.total / data.salesRange.count, data.currency)
          : "N/D"
        : "N/D",
      note: data ? "Por venta" : "Datos no disponibles",
      tone: "purple" as const,
    },
    {
      label: "Pedidos activos",
      value: data?.orders.total ?? "N/D",
      note: data ? "En el rango" : "Datos no disponibles",
      tone: "blue" as const,
    },
    {
      label: "Stock crítico",
      value: data?.criticalStock ?? "N/D",
      note: data ? "Requieren atención" : "Datos no disponibles",
      tone: "red" as const,
    },
  ];
  const controls = (
    <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SelectField
        name="range"
        label="Rango"
        value={filters.range}
        options={[
          { value: "today", label: "Hoy" },
          { value: "yesterday", label: "Ayer" },
          { value: "week", label: "Semana" },
          { value: "month", label: "Últimos 30 días" },
          { value: "current_month", label: "Mes actual" },
          { value: "previous_month", label: "Mes anterior" },
          { value: "year", label: "Año actual" },
          { value: "custom", label: "Rango personalizado" },
        ]}
      />
      <label className="grid gap-1 text-[10px] font-bold text-[#526b84]">
        Desde
        <input
          type="date"
          name="from"
          defaultValue={filters.from}
          className="h-9 rounded-lg border border-[#dce6ee] px-2 text-[10px]"
        />
      </label>
      <label className="grid gap-1 text-[10px] font-bold text-[#526b84]">
        Hasta
        <input
          type="date"
          name="to"
          defaultValue={filters.to}
          className="h-9 rounded-lg border border-[#dce6ee] px-2 text-[10px]"
        />
      </label>
      <SelectField
        name="locationId"
        label="Local"
        value={filters.locationId}
        options={options.locations.map((row) => ({ value: row.id, label: row.name }))}
      />
      <SelectField
        name="sellerId"
        label="Vendedor"
        value={filters.sellerId}
        options={options.sellers.map((row) => ({ value: row.id, label: row.name || row.email }))}
      />
      <SelectField
        name="customerId"
        label="Cliente"
        value={filters.customerId}
        options={options.customers.map((row) => ({ value: row.id, label: row.name }))}
      />
      <SelectField
        name="productId"
        label="Producto"
        value={filters.productId}
        options={options.products.map((row) => ({
          value: row.id,
          label: `${row.sku} · ${row.name}`,
        }))}
      />
      <SelectField
        name="categoryId"
        label="Categoría"
        value={filters.categoryId}
        options={options.categories.map((row) => ({ value: row.id, label: row.name }))}
      />
      <SelectField
        name="familyId"
        label="Familia"
        value={filters.familyId}
        options={options.families.map((row) => ({ value: row.id, label: row.name }))}
      />
      <SelectField
        name="brandId"
        label="Marca"
        value={filters.brandId}
        options={options.brands.map((row) => ({ value: row.id, label: row.name }))}
      />
      <SelectField
        name="channel"
        label="Canal"
        value={filters.channel}
        options={[
          { value: "WEB", label: "Web" },
          { value: "WHATSAPP", label: "WhatsApp" },
          { value: "PHONE", label: "Teléfono" },
          { value: "STORE", label: "Tienda" },
        ]}
      />
      <SelectField
        name="orderStatus"
        label="Estado del pedido"
        value={filters.orderStatus}
        options={[
          { value: "NEW", label: "Nuevo" },
          { value: "RECEIVED", label: "Recibido" },
          { value: "PAYMENT_PENDING", label: "Pago pendiente" },
          { value: "PAID", label: "Pagado" },
          { value: "PREPARING", label: "Preparando" },
          { value: "READY", label: "Listo" },
          { value: "READY_FOR_PICKUP", label: "Listo para recoger" },
          { value: "IN_TRANSIT", label: "En tránsito" },
          { value: "SHIPPED", label: "Enviado" },
          { value: "DELIVERED", label: "Entregado" },
          { value: "CANCELLED", label: "Cancelado" },
        ]}
      />
      <SelectField
        name="currency"
        label="Moneda"
        value={filters.currency}
        options={[
          { value: "PEN", label: "PEN" },
          { value: "USD", label: "USD" },
        ]}
      />
      <div className="flex items-end sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          className="h-9 rounded-lg bg-[#102f51] px-4 text-[10px] font-extrabold text-white"
        >
          Aplicar filtros avanzados
        </button>
      </div>
    </form>
  );

  return (
    <AdminReportsStitch
      exportHref={`/api/admin/reportes/export?${dashboardFiltersToQuery(filters).toString()}`}
      error={
        reportError
          ? "La fuente de datos no respondió. Intenta nuevamente o revisa el contrato del reporte."
          : undefined
      }
      metrics={metrics}
      controls={controls}
      data={data}
      schedules={schedules}
      reportFilters={filters}
      currentUserId={actor.userId}
    />
  );
}

function formatMoney(value: number | null | undefined, currency: string | null | undefined) {
  if (value === null || value === undefined || !currency || !Number.isFinite(value)) return "N/D";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
