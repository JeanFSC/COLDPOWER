/* eslint-disable react/jsx-key */
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  Download,
  FileText,
  Filter,
  FolderKanban,
  Image as ImageIcon,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Tag,
  Target,
  Truck,
  UserRound,
  UsersRound,
  Warehouse,
  X,
  type LucideIcon,
} from "lucide-react";
// AdminLineChart stays lazy-loaded (ReportsWorkspace passes it real series data).
// AdminSparkline is imported directly, not lazily: every MetricGrid caller in
// this file (Catálogo included) omits the `sparkline` field, so it always
// renders the static placeholder — the dynamic-import chunk fetch was pure
// added latency with nothing to show for it.
import { AdminLineChart } from "@/components/admin/AdminChartsLazy";
import { AdminSparkline } from "@/components/admin/AdminCharts";
import { CustomerDetailPanel } from "@/components/admin/CustomerDetailPanel";
import { ProductCreateForm } from "@/components/admin/ProductCreateForm";
import type { PricingFilters, PricingListResponse } from "@/lib/pricing-contract";

const panel = "min-w-0 rounded-xl border border-[#e2eaf1] bg-white shadow-[0_1px_3px_rgba(16,42,67,0.035)]";
type Tone = "blue" | "orange" | "green" | "red" | "purple";
const toneInk: Record<Tone, string> = {
  blue: "text-[#2277ee]",
  orange: "text-[#f58b20]",
  green: "text-[#159263]",
  red: "text-[#ed4b4b]",
  purple: "text-[#8057e8]",
};
const toneBg: Record<Tone, string> = {
  blue: "bg-[#e8f1ff]",
  orange: "bg-[#fff0e0]",
  green: "bg-[#e4f7ef]",
  red: "bg-[#ffe8e8]",
  purple: "bg-[#eee9ff]",
};

export type Metric = {
  label: string;
  value: string | number;
  note?: string;
  tone?: Tone;
  icon?: LucideIcon;
  sparkline?: number[];
};
export type ProductCatalogMetrics = {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  reviewProducts: number;
  duplicateProducts: number;
  productsRequiringReview: number;
  totalBrands: number;
};
export type ListingRow = {
  id: string;
  customer: string;
  products?: string | number;
  total: string;
  status: string;
  payment?: string;
  delivery?: string;
  date?: string;
  priority?: string;
  progress?: string;
  method?: string;
  receipt?: string;
  seller?: string;
  origin?: string;
};

function displayStatus(value: string) {
  const labels: Record<string, string> = {
    CONFIRMED: "Confirmada",
    DRAFT: "Borrador",
    CANCELLED: "Cancelada",
    NEW: "Nuevo",
    PAYMENT_PENDING: "Pago pendiente",
    PAID: "Pagado",
    PREPARING: "En preparación",
    READY_FOR_PICKUP: "Listo para recojo",
    SHIPPED: "En camino",
    DELIVERED: "Entregado",
    APPROVED: "Aprobado",
    PENDING: "Pendiente",
    REJECTED: "Rechazado",
    INACTIVE: "Inactivo",
    ACTIVE: "Activo",
  };
  return labels[value] ?? value;
}
function displayRole(value: string) {
  const labels: Record<string, string> = {
    SUPERADMIN: "Superadmin",
    GERENCIA: "Gerencia",
    OPERACIONES_VENTAS: "Operaciones y ventas",
    JEFATURA: "Jefatura",
    ADMIN: "Administrador",
    VENTAS: "Ventas",
    ALMACEN: "Almacén",
    COMPRAS: "Compras",
    REPORTES: "Reportes",
    admin: "Administrador legacy",
    customer: "Cliente",
  };
  return labels[value] ?? value;
}

function displayValue(value: ReactNode, empty = "—") {
  return value === null || value === undefined || value === "" ? empty : value;
}
function MissingData({ label, title }: { label: string; title?: string }) {
  return (
    <span
      title={title ?? label}
      className="inline-flex max-w-[150px] items-center rounded-md border border-[#dce6ee] bg-[#f7f9fb] px-2 py-1 text-[9px] font-extrabold leading-4 text-[#71869c]"
    >
      {label}
    </span>
  );
}
function toneForStatus(status: string): Tone {
  if (/rechaz|cancel|crit|fall/i.test(status)) return "red";
  if (/pend|prepar|revision|borrador/i.test(status)) return "orange";
  if (/pag|entreg|confirm|public/i.test(status)) return "green";
  return "blue";
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  children,
  period,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  children?: ReactNode;
  period?: string | null;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#2277ee]">
          {eyebrow}
        </p>
        <h1 className="mt-1.5 font-display text-[24px] font-black tracking-[-0.03em] text-[#102a43] sm:text-[26px]">
          {title}
        </h1>
        <p className="mt-1.5 max-w-3xl text-[11px] font-semibold leading-5 text-[#7d91a5]">
          {description}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {period ? (
          <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-extrabold text-[#304b66]">
            <CalendarDays className="h-4 w-4 text-[#6d84a0]" aria-hidden="true" />
            {period}
            <ChevronDown className="h-3 w-3 text-[#8296a9]" aria-hidden="true" />
          </span>
        ) : null}
        {action}
      </div>
    </div>
  );
}

type ActionProps = {
  children: ReactNode;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
};
export function PrimaryAction({
  children,
  icon: Icon = Plus,
  href,
  onClick,
  disabled,
  title,
}: ActionProps) {
  const inactive = disabled || (!href && !onClick);
  const className =
    "inline-flex h-10 items-center gap-2 rounded-lg bg-[#ff830e] px-3.5 text-[10px] font-extrabold text-white shadow-[0_5px_12px_rgba(255,131,14,0.16)] transition hover:bg-[#e97305] disabled:cursor-not-allowed disabled:opacity-50";
  if (href && !inactive)
    return (
      <Link href={href} className={className}>
        {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
        {children}
      </Link>
    );
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={inactive}
      title={title ?? (inactive ? "Acción pendiente de conexión" : undefined)}
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
export function SecondaryAction({
  children,
  icon: Icon = Download,
  href,
  onClick,
  disabled,
  title,
}: ActionProps) {
  const inactive = disabled || (!href && !onClick);
  const className =
    "inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3.5 text-[10px] font-extrabold text-[#304b66] transition hover:border-[#a9bfd2] disabled:cursor-not-allowed disabled:opacity-50";
  if (href && !inactive)
    return (
      <Link href={href} className={className}>
        {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
        {children}
      </Link>
    );
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={inactive}
      title={title ?? (inactive ? "Acción pendiente de conexión" : undefined)}
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function MetricGrid({
  items,
  columns = "xl:grid-cols-5",
}: {
  items: Metric[];
  columns?: string;
}) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${columns}`}>
      {items.map((item, index) => {
        const tone =
          item.tone ?? (["blue", "orange", "green", "red", "purple"] as Tone[])[index % 5];
        const Icon =
          item.icon ?? [CircleDollarSign, FileText, Package, CircleAlert, Target][index % 5];
        return (
          <article key={`${item.label}-${index}`} className={`${panel} min-h-[112px] p-3.5`}>
            <div className="flex items-start gap-2.5">
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneBg[tone]} ${toneInk[tone]}`}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-semibold text-[#7d91a5]">{item.label}</p>
                <p className="mt-1 font-display text-[19px] font-black text-[#102a43]">
                  {item.value}
                </p>
                {item.note ? (
                  <p className={`mt-1 text-[9px] font-extrabold ${toneInk[tone]}`}>{item.note}</p>
                ) : null}
              </div>
            </div>
            <AdminSparkline tone={tone} data={item.sparkline} />
          </article>
        );
      })}
    </div>
  );
}
export function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf2f6] px-4 py-3.5">
        <div>
          <h2 className="text-[13px] font-extrabold text-[#102a43]">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-[10px] font-semibold text-[#8296a9]">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function StatusBadge({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: Tone | "gray";
}) {
  const color =
    tone === "gray"
      ? "border-[#dce6ee] bg-[#f7f9fb] text-[#71869c]"
      : `border-current/20 ${toneBg[tone]} ${toneInk[tone]}`;
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-[9px] font-extrabold ${color}`}
    >
      {children}
    </span>
  );
}
export function Toolbar({
  placeholder,
  children,
  action,
  queryValue,
}: {
  placeholder: string;
  children?: ReactNode;
  action?: string;
  queryValue?: string;
}) {
  return (
    <form method="get" action={action} className={`${panel} flex flex-wrap items-center gap-2 p-3`}>
      <label className="relative min-w-[220px] flex-1">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ca0b3]"
          aria-hidden="true"
        />
        <input
          name="query"
          defaultValue={queryValue}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-[#dce6ee] pl-9 pr-3 text-[11px] font-semibold outline-none focus:border-[#3986c0] focus:ring-2 focus:ring-[#3986c0]/10"
        />
      </label>
      {children}
      <button
        type="submit"
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6ee] bg-white px-3 text-[10px] font-extrabold text-[#304b66]"
      >
        <Filter className="h-3.5 w-3.5" aria-hidden="true" />
        Filtros
      </button>
    </form>
  );
}
export function FilterSelect({ name, children, options, value }: { name: string; children: ReactNode; options?: Array<{ value: string; label: string }>; value?: string }) {
  const choices = options ?? [
    { value: "active", label: "Activos" },
    { value: "pending", label: "Pendientes" },
    { value: "inactive", label: "Inactivos" },
  ];
  return (
    <label className="relative">
      <select
        name={name}
        defaultValue={value ?? ""}
        className="has-custom-chevron h-10 min-w-[118px] appearance-none rounded-lg border border-[#dce6ee] bg-white px-3 pr-7 text-[10px] font-bold text-[#526b84]"
      >
        <option value="">{children}</option>
        {choices.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#8296a9]"
        aria-hidden="true"
      />
    </label>
  );
}
export function EmptyState({
  title,
  description = "Los registros confirmados aparecerán aquí cuando existan.",
  icon: Icon = FolderKanban,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="m-3 rounded-lg border border-dashed border-[#d9e4ec] bg-[#fbfcfd] px-4 py-6 text-center">
      <Icon className="mx-auto h-6 w-6 text-[#9db0c1]" aria-hidden="true" />
      <p className="mt-2 text-[11px] font-extrabold text-[#304b66]">{title}</p>
      <p className="mt-1 text-[9px] text-[#8296a9]">{description}</p>
    </div>
  );
}
export function Pager({
  label,
  page = 1,
  totalPages = 1,
  hrefForPage,
}: {
  label: string;
  page?: number;
  totalPages?: number;
  hrefForPage?: (page: number) => string;
}) {
  if (totalPages <= 1)
    return (
      <div className="border-t border-[#edf2f6] px-4 py-3 text-[10px] font-semibold text-[#8296a9]">
        {label}
      </div>
    );
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#edf2f6] px-4 py-3 text-[10px] font-semibold text-[#8296a9]">
      <span>{label}</span>
      <div className="flex gap-1" aria-label="Paginación">
        {pages.map((number) => (
          hrefForPage ? (
            <Link
              href={hrefForPage(number)}
              key={number}
              aria-current={number === page ? "page" : undefined}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${number === page ? "bg-[#2277ee] font-extrabold text-white" : "border border-[#dce6ee]"}`}
            >
              {number}
            </Link>
          ) : (
            <button
              type="button"
              key={number}
              aria-current={number === page ? "page" : undefined}
              className={`h-7 w-7 rounded-md ${number === page ? "bg-[#2277ee] font-extrabold text-white" : "border border-[#dce6ee]"}`}
            >
              {number}
            </button>
          )
        ))}
      </div>
    </div>
  );
}
export function ProductThumb({ alt, showPending = false }: { alt: string; showPending?: boolean }) {
  return (
    <span
      className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#f5f8fa]"
      title={showPending ? `Imagen pendiente: ${alt}` : undefined}
      aria-label={showPending ? `Imagen pendiente: ${alt}` : `Sin imagen: ${alt}`}
    >
      <Image
        src="/images/product-placeholder-repuesto.svg"
        alt={showPending ? "" : `Sin imagen: ${alt}`}
        width={29}
        height={29}
        aria-hidden={showPending}
      />
      {showPending ? (
        <span className="absolute -bottom-1 -right-1 rounded bg-[#fff8ed] px-1 text-[7px] font-extrabold text-[#8a5b20]">
          Pend.
        </span>
      ) : null}
    </span>
  );
}
function More({ label, href, onClick }: { label: string; href?: string; onClick?: () => void }) {
  const className =
    "inline-flex h-8 w-8 items-center justify-center rounded-md text-[#607894] transition hover:bg-[#f4f7fa] disabled:cursor-not-allowed disabled:opacity-40";
  if (href)
    return (
      <Link href={href} className={className} aria-label={`Más acciones para ${label}`}>
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </Link>
    );
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={!onClick}
      title={onClick ? `Más acciones para ${label}` : "Acciones disponibles al abrir el registro"}
      aria-label={`Más acciones para ${label}`}
    >
      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
function Table({
  headers,
  rows,
  icon: Icon = FolderKanban,
  title,
  description,
}: {
  headers: string[];
  rows: ReactNode[][];
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-[10px]">
        <thead className="border-b border-[#e9eff4] bg-[#fbfcfd] text-[9px] font-extrabold uppercase tracking-[0.06em] text-[#7d91a5]">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="border-b border-[#f0f4f7] px-3 py-3 align-middle">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headers.length}>
                <EmptyState title={title} description={description} icon={Icon} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ListingTable({
  kind,
  rows,
}: {
  kind: "quotes" | "sales" | "orders" | "payments";
  rows: ListingRow[];
}) {
  const config = {
    quotes: ["Código", "Cliente", "Productos", "Total", "Estado", "Fecha", "Vendedor", "Acciones"],
    sales: [
      "Venta ID",
      "Cliente",
      "Productos",
      "Subtotal",
      "Estado",
      "Pago",
      "Entrega",
      "Fecha",
      "Acciones",
    ],
    orders: [
      "Pedido",
      "Cliente",
      "Productos",
      "Total",
      "Estado logístico",
      "Prioridad",
      "Entrega",
      "Pago",
      "Progreso",
      "Acciones",
    ],
    payments: [
      "ID pedido",
      "Cliente",
      "Monto",
      "Método",
      "Estado",
      "Comprobante",
      "Fecha",
      "Acciones",
    ],
  }[kind];
  const data = rows.slice(0, 15).map((row) => {
    const tone = toneForStatus(row.status);
    const badge = <StatusBadge tone={tone}>{displayStatus(row.status)}</StatusBadge>;
    if (kind === "quotes")
      return [
        <b className="font-mono text-[#2277ee]">{row.id}</b>,
        <strong>{row.customer}</strong>,
        <span>{displayValue(row.products)}</span>,
        <b>{displayValue(row.total)}</b>,
        badge,
        <span>{displayValue(row.date)}</span>,
        <span>{displayValue(row.seller)}</span>,
        <More label={row.id} />,
      ];
    if (kind === "sales")
      return [
        <b className="font-mono text-[#2277ee]">{row.id}</b>,
        <strong>{row.customer}</strong>,
        <span>{displayValue(row.products)}</span>,
        <b>{displayValue(row.total)}</b>,
        badge,
        <StatusBadge tone={toneForStatus(row.payment ?? "")}>
          {displayValue(row.payment)}
        </StatusBadge>,
        <span>{displayValue(row.delivery)}</span>,
        <span>{displayValue(row.date)}</span>,
        <More label={row.id} />,
      ];
    if (kind === "orders")
      return [
        <b className="font-mono text-[#2277ee]">{row.id}</b>,
        <strong>{row.customer}</strong>,
        <span>{displayValue(row.products)}</span>,
        <b>{displayValue(row.total)}</b>,
        badge,
        <StatusBadge tone={toneForStatus(row.priority ?? "")}>
          {displayValue(row.priority)}
        </StatusBadge>,
        <span>{displayValue(row.delivery)}</span>,
        <StatusBadge tone={toneForStatus(row.payment ?? "")}>
          {displayValue(row.payment)}
        </StatusBadge>,
        <span>{displayValue(row.progress)}</span>,
        <More label={row.id} />,
      ];
    return [
      <b className="font-mono text-[#2277ee]">{row.id}</b>,
      <strong>{row.customer}</strong>,
      <b>{displayValue(row.total)}</b>,
      <span>{displayValue(row.method)}</span>,
      badge,
      <span className="font-mono text-[#2277ee]">{displayValue(row.receipt)}</span>,
      <span>{displayValue(row.date)}</span>,
      <More label={row.id} />,
    ];
  });
  const title =
    kind === "quotes"
      ? "cotizaciones"
      : kind === "sales"
        ? "ventas"
        : kind === "orders"
          ? "pedidos"
          : "pagos";
  return (
    <Panel
      title={
        kind === "quotes"
          ? "Cotizaciones"
          : kind === "sales"
            ? "Ventas"
            : kind === "orders"
              ? "Pedidos"
              : "Pagos por revisar"
      }
      subtitle={`${rows.length} resultados`}
    >
      <Table headers={config} rows={data} title={`No hay registros de ${title}`} />
    </Panel>
  );
}

function Summary({
  title,
  items,
  values,
}: {
  title: string;
  items: string[];
  values: Array<string | number>;
}) {
  return (
    <aside className={`${panel} h-fit`}>
      <h2 className="border-b border-[#edf2f6] px-4 py-3.5 text-[13px] font-extrabold text-[#102a43]">
        {title}
      </h2>
      <div className="grid gap-2.5 p-3">
        {items.map((item, index) => (
          <div key={item} className="rounded-xl border border-[#edf2f6] bg-[#fbfcfe] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#8296a9]">
                {item}
              </p>
              <span className="h-2 w-2 rounded-full bg-[#2277ee]" aria-hidden="true" />
            </div>
            <strong className="mt-2 block text-[17px] font-black tracking-[-0.03em] text-[#102a43]">
              {displayValue(values[index])}
            </strong>
          </div>
        ))}
      </div>
    </aside>
  );
}

export function ProductWorkspace({
  rows,
  total,
  pagination,
  queryString = "",
  metrics,
  controls,
  canCreate = false,
  createOptions,
}: {
  rows: Array<{
    id: string;
    name: string;
    sku: string;
    brand?: string | null;
    family?: string | null;
    publicationStatus?: string;
    requiresReview?: boolean;
    possibleDuplicate?: boolean;
  }>;
  total: number;
  pagination?: { page: number; totalPages: number; totalItems: number };
  queryString?: string;
  metrics: ProductCatalogMetrics;
  controls?: ReactNode;
  canCreate?: boolean;
  createOptions?: { categories: Array<{ id: string; name: string }>; families: Array<{ id: string; name: string }>; brands: Array<{ id: string; name: string }> };
}) {
  const data = rows.slice(0, 12).map((row) => [
    <div className="flex items-center gap-2">
      <ProductThumb alt={row.name} showPending />
      <strong className="max-w-[220px] truncate text-[#304b66]">{row.name}</strong>
    </div>,
    <span className="font-mono text-[#526b84]">{row.sku}</span>,
    <span>{displayValue(row.brand)}</span>,
    <span>{displayValue(row.family)}</span>,
    <MissingData label="Stock pendiente de sincronización" title="Dato no disponible: stock pendiente de sincronización" />,
    <StatusBadge
      tone={
        row.requiresReview ? "orange" : row.publicationStatus === "published" ? "green" : "gray"
      }
    >
      {row.requiresReview ? "Revisión" : displayValue(row.publicationStatus, "Sin estado")}
    </StatusBadge>,
    <Link href={`/admin/catalogo/${encodeURIComponent(row.id)}`} className="inline-flex items-center rounded-md border border-[#dce6ee] px-2.5 py-1.5 text-[9px] font-extrabold text-[#2277ee] hover:border-[#2277ee]">Abrir ficha</Link>,
  ]);
  const hrefForPage = pagination ? (page: number) => {
    const next = new URLSearchParams(queryString);
    next.set("page", String(page));
    return `/admin/catalogo?${next.toString()}`;
  } : undefined;
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Catálogo"
        title="Catálogo de productos"
        description="Gestiona y organiza todos los productos de tu negocio."
        action={canCreate && createOptions ? <ProductCreateForm {...createOptions} /> : undefined}
      />
      <MetricGrid
        items={[
          {
            label: "Productos en catálogo",
            value: metrics.totalProducts,
            note: "Métrica global",
            icon: Package,
          },
          {
            label: "Publicados",
            value: metrics.publishedProducts,
            note: "Estado editorial global",
            tone: "green",
            icon: Check,
          },
          {
            label: "En revisión",
            value: metrics.reviewProducts,
            note: "Estado REVIEW global",
            tone: "orange",
            icon: Clock3,
          },
          {
            label: "Duplicados editoriales pendientes",
            value: metrics.duplicateProducts,
            note: "Pendientes de decisión",
            tone: "red",
            icon: CircleAlert,
          },
          {
            label: "Marcas",
            value: metrics.totalBrands,
            note: "Métrica global",
            tone: "purple",
            icon: Tag,
          },
        ]}
      />
      <Toolbar placeholder="Buscar por nombre, SKU o marca...">
        <FilterSelect name="status">Estado</FilterSelect>
        <FilterSelect name="category">Categoría</FilterSelect>
      </Toolbar>
      <div className="flex items-start gap-3 rounded-xl border border-[#dce6ee] bg-[#f8fafc] px-4 py-3 text-[10px] leading-5 text-[#71869c]">
        <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#8ca0b3]" aria-hidden="true" />
        <p>
          <strong className="text-[#304b66]">Estado editorial:</strong> las referencias importadas permanecen visibles para revisión. La imagen, el stock y las acciones adicionales se muestran como pendientes cuando todavía no existe un dato o conexión disponible.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Panel title="Productos" subtitle={`${total} productos encontrados`}>
          <Table
            headers={["Producto", "SKU", "Marca", "Familia", "Stock", "Estado", "Acciones"]}
            rows={data}
            title="No hay productos cargados"
            description="No se encontraron referencias para esta consulta."
            icon={Package}
          />
          <Pager
            label={`Mostrando ${data.length} visibles de ${pagination?.totalItems ?? total} productos`}
            page={pagination?.page}
            totalPages={pagination?.totalPages}
            hrefForPage={hrefForPage}
          />
        </Panel>
        <Summary
          title="Colas de catálogo"
          items={[
            "Publicados",
            "Borradores",
            "En revisión",
            "Duplicados editoriales pendientes",
            "Requieren revisión",
          ]}
          values={[
            metrics.publishedProducts,
            metrics.draftProducts,
            metrics.reviewProducts,
            metrics.duplicateProducts,
            metrics.productsRequiringReview,
          ]}
        />
      </div>
      {controls ? (
        <Panel title="Acciones editoriales">
          <details>
            <summary className="cursor-pointer px-4 py-3 text-[10px] font-extrabold text-[#2277ee]">
              Abrir edición y decisiones
            </summary>
            <div className="border-t border-[#edf2f6] p-4">{controls}</div>
          </details>
        </Panel>
      ) : null}
    </div>
  );
}

export function InventoryWorkspace({
  metrics,
  rows,
  movements,
  alerts,
  controls,
}: {
  metrics: Metric[];
  rows: Array<{
    id: string;
    sku: string;
    product: string;
    current: number | string;
    reserved: number | string;
    available: number | string;
    minimum?: number | string;
    location?: string;
    status?: string;
  }>;
  movements?: Array<{
    id: string;
    sku: string;
    productName: string;
    locationName: string;
    type: string;
    quantity: number;
    resultingOnHand: number;
    createdAt: string;
  }>;
  alerts?: Array<{
    sku: string;
    product: string;
    available: number | string;
    minimum: number | string;
    location?: string;
  }>;
  controls?: ReactNode;
}) {
  const data = rows.slice(0, 14).map((row) => [
    <span className="font-mono">{row.sku}</span>,
    <div className="flex items-center gap-2">
      <ProductThumb alt={row.product} />
      <strong className="max-w-[220px] truncate">{row.product}</strong>
    </div>,
    <b>{displayValue(row.current)}</b>,
    <span>{displayValue(row.reserved)}</span>,
    <b className="text-[#159263]">{displayValue(row.available)}</b>,
    <span>{displayValue(row.minimum)}</span>,
    <span>{displayValue(row.location)}</span>,
    <StatusBadge tone={row.status ? toneForStatus(row.status) : "gray"}>
      {displayValue(row.status, "Desconocido")}
    </StatusBadge>,
  ]);
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Inventario"
        title="Gestión de inventario"
        description="Consulta y controla el stock de tus productos en tiempo real."
        action={<PrimaryAction icon={Settings2} href="#inventory-controls">Ajustar inventario</PrimaryAction>}
      >
        <SecondaryAction icon={Truck} href="#inventory-controls">Transferir stock</SecondaryAction>
      </PageHeader>
      <MetricGrid items={metrics} />
      <Panel
        title="Inventario de productos"
        subtitle="Saldo actual por SKU y local"
        action={<SecondaryAction>Exportar</SecondaryAction>}
      >
        <Toolbar placeholder="Buscar por SKU o producto...">
          <FilterSelect name="location">Ubicación</FilterSelect>
          <FilterSelect name="status">Estado</FilterSelect>
        </Toolbar>
        <Table
          headers={[
            "SKU",
            "Producto",
            "Stock actual",
            "Reservado",
            "Disponible",
            "Mínimo",
            "Ubicación",
            "Estado",
          ]}
          rows={data}
          title="No hay saldos de inventario"
          description="La base de datos no devolvió saldos para esta consulta."
          icon={Warehouse}
        />
        <Pager label={`Mostrando ${data.length} saldos`} />
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Movimientos recientes" subtitle="Últimas entradas, salidas y ajustes">
          {movements?.length ? (
            <div className="grid gap-2 p-4">
              {movements.slice(0, 8).map((movement) => (
                <div key={movement.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#edf2f6] p-3 text-[10px]">
                  <div>
                    <p className="font-mono font-extrabold text-[#304b66]">{movement.sku} · {movement.productName}</p>
                    <p className="mt-1 text-[#8296a9]">{movement.locationName} · {new Date(movement.createdAt).toLocaleString("es-PE")}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-black ${movement.quantity < 0 ? "text-[#ed4b4b]" : "text-[#159263]"}`}>{movement.quantity > 0 ? "+" : ""}{movement.quantity} unidades</p>
                    <p className="mt-1 text-[#8296a9]">Saldo: {movement.resultingOnHand}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No hay movimientos registrados" description="Los movimientos aparecerán aquí cuando el inventario tenga actividad." icon={RefreshCw} />
          )}
        </Panel>
        <Panel title="Alertas de inventario" subtitle="Stock que requiere atención">
          {alerts?.length ? (
            <div className="grid gap-2 p-4">
              {alerts.slice(0, 8).map((alert) => (
                <div key={`${alert.sku}-${alert.location ?? "global"}`} className="flex items-center justify-between gap-3 rounded-lg border border-[#ffdada] bg-[#fff8f8] p-3 text-[10px]">
                  <div>
                    <p className="font-mono font-extrabold text-[#304b66]">{alert.sku} · {alert.product}</p>
                    <p className="mt-1 text-[#8296a9]">{alert.location ?? "Sin local"} · mínimo {alert.minimum}</p>
                  </div>
                  <strong className="text-right text-[#ed4b4b]">{alert.available} disponibles</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No hay alertas activas" description="No se recibieron alertas de stock para este alcance." icon={CircleAlert} />
          )}
        </Panel>
      </div>
      {controls ? (
        <Panel title="Operaciones de inventario">
          <details id="inventory-controls">
            <summary className="cursor-pointer px-4 py-3 text-[10px] font-extrabold text-[#2277ee]">
              Abrir acciones operativas
            </summary>
            <div className="border-t border-[#edf2f6] p-4">{controls}</div>
          </details>
        </Panel>
      ) : null}
    </div>
  );
}

export function PricingWorkspace({
  rows,
  controls,
  metrics,
  historyCount = 0,
  page = 1,
  pageSize = 12,
  totalItems,
  totalPages = 1,
  exportHref,
  filters = {},
  categoryOptions = [],
  statusOptions = [],
  canEditPrices = false,
}: {
  rows: Array<{
    id: string;
    sku: string;
    product: string;
    retail?: string | number;
    wholesale?: string | number;
    minimum?: string | number;
    promotion?: string;
    status?: string;
  }>;
  controls?: ReactNode;
  metrics?: PricingListResponse["metrics"];
  historyCount?: number;
  page?: number;
  pageSize?: number;
  totalItems?: number;
  totalPages?: number;
  exportHref?: string;
  filters?: PricingFilters;
  categoryOptions?: Array<{ id: string; name: string }>;
  statusOptions?: string[];
  canEditPrices?: boolean;
}) {
  const data = rows.map((row) => [
    <div className="flex items-center gap-2">
      <ProductThumb alt={row.product} />
      <strong>
        {row.product}
        <small className="block font-mono text-[#8296a9]">{row.sku}</small>
      </strong>
    </div>,
    <b>{displayValue(row.retail)}</b>,
    <span>{displayValue(row.wholesale)}</span>,
    <span>{displayValue(row.minimum)}</span>,
    row.promotion ? <StatusBadge tone="orange">{row.promotion}</StatusBadge> : "—",
    <StatusBadge tone={row.status ? toneForStatus(row.status) : "gray"}>
      {displayValue(row.status, "Sin estado")}
    </StatusBadge>,
    <More label={row.product} />,
  ]);
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Precios"
        title="Gestión de precios"
        description="Administra los precios de los productos y promociones vigentes."
        action={<PrimaryAction icon={Tag} href="#price-controls" disabled={!canEditPrices}>Nuevo precio</PrimaryAction>}
      >
        <SecondaryAction href={exportHref} disabled={!exportHref}>Exportar</SecondaryAction>
      </PageHeader>
      <MetricGrid
        columns="xl:grid-cols-4"
        items={[
          {
            label: "Productos con precio",
            value: metrics?.totalWithPrice ?? rows.filter((row) => row.retail).length,
            note: `${metrics?.activePrices ?? rows.length} precios activos`,
            icon: Tag,
          },
          {
            label: "Promociones",
            value: metrics?.promotions ?? rows.filter((row) => row.promotion).length,
            note: "Precios especiales",
            tone: "orange",
            icon: Target,
          },
          {
            label: "Sin precio",
            value: metrics?.totalWithoutPrice ?? rows.filter((row) => !row.retail).length,
            note: "Requieren carga",
            tone: "red",
            icon: CircleAlert,
          },
          {
            label: "Historial",
            value: historyCount,
            note: "Cambios registrados",
            tone: "purple",
            icon: RefreshCw,
          },
        ]}
      />
      <Toolbar placeholder="Buscar por SKU o producto..." queryValue={filters.query}>
        <FilterSelect name="categoryId" value={filters.categoryId} options={categoryOptions.map((category) => ({ value: category.id, label: category.name }))}>Categoría</FilterSelect>
        <FilterSelect name="status" value={filters.status} options={statusOptions.map((status) => ({ value: status, label: status === "ACTIVE" ? "Activos" : status === "INACTIVE" ? "Inactivos" : "Archivados" }))}>Estado</FilterSelect>
      </Toolbar>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Panel title="Lista de precios" subtitle={`${rows.length} resultados`}>
          <Table
            headers={[
              "SKU / Producto",
              "Minorista",
              "Mayorista",
              "Mínimo",
              "Promoción",
              "Estado",
              "",
            ]}
            rows={data}
            title="No hay precios confirmados"
            description="No se recibieron precios vigentes para esta consulta."
            icon={Tag}
          />
          <Pager
            label={`Mostrando ${data.length ? (page - 1) * pageSize + 1 : 0}-${Math.min(page * pageSize, totalItems ?? rows.length)} de ${totalItems ?? rows.length} productos`}
            page={page}
            totalPages={totalPages}
            hrefForPage={(nextPage) => {
              const query = new URLSearchParams();
              for (const [key, value] of Object.entries(filters)) if (value !== undefined) query.set(key, String(value));
              query.set("page", String(nextPage));
              query.set("pageSize", String(pageSize));
              return `?${query.toString()}`;
            }}
          />
        </Panel>
        <Summary
          title="Resumen de precios"
          items={["Registros", "Promociones", "Sin precio"]}
          values={[
             metrics?.totalWithPrice ?? rows.filter((row) => row.retail).length,
             metrics?.promotions ?? rows.filter((row) => row.promotion).length,
             metrics?.totalWithoutPrice ?? rows.filter((row) => !row.retail).length,
          ]}
        />
      </div>
      {controls ? (
        <Panel title="Actualizar precio">
          <details>
            <summary className="cursor-pointer px-4 py-3 text-[10px] font-extrabold text-[#2277ee]">
              Abrir controles de precios
            </summary>
            <div id="price-controls" className="border-t border-[#edf2f6] p-4">{controls}</div>
          </details>
        </Panel>
      ) : null}
    </div>
  );
}

export function CustomersWorkspace({
  rows,
  metrics,
  pagination,
  facets,
  query,
  queryString,
  exportHref,
  controls,
  customerId,
  closeHref,
}: {
  rows: Array<{
    id: string;
    name: string;
    type?: string;
    contact?: string;
    phone?: string;
    email?: string;
    city?: string;
    quotes?: number | string;
    lastActivityAt?: Date | string | null;
    status?: string;
  }>;
  metrics?: { total: number; active: number; inactive: number; withOpenOpportunity: number; withoutActivity: number };
  pagination?: { page: number; totalPages: number; totalItems: number };
  facets?: { customerTypes: string[]; statuses: string[]; sellers: Array<{ id: string; name: string | null; email: string | null }>; locations: string[] };
  query?: string;
  queryString?: string;
  exportHref?: string;
  controls?: ReactNode;
  customerId?: string | null;
  closeHref?: string;
}) {
  const detailHrefFor = (id: string) => {
    const detailQuery = new URLSearchParams(queryString ?? "");
    detailQuery.set("view", "clientes");
    detailQuery.set("customerId", id);
    return `/admin/crm?${detailQuery.toString()}`;
  };
  const data = rows
    .map((row) => [
      <strong className="text-[#304b66]">{row.name}</strong>,
      <span>{displayValue(row.type)}</span>,
      <span>{displayValue(row.contact)}</span>,
      <span>{displayValue(row.phone)}</span>,
      <span>{displayValue(row.email)}</span>,
      <span>{displayValue(row.city)}</span>,
      <b>{row.lastActivityAt ? new Date(row.lastActivityAt).toLocaleDateString("es-PE") : "Sin actividad"}</b>,
      <StatusBadge tone={row.status ? toneForStatus(row.status) : "gray"}>
        {displayValue(row.status, "Sin estado")}
      </StatusBadge>,
      <More label={row.name} href={detailHrefFor(row.id)} />,
    ]);
  const waiting = metrics?.withoutActivity ?? rows.filter((row) => !row.lastActivityAt).length;
  const total = metrics?.total ?? rows.length;
  const active = metrics?.active ?? rows.filter((row) => /activo/i.test(row.status ?? "")).length;
  const hrefForPage = pagination && queryString ? (page: number) => {
    const next = new URLSearchParams(queryString);
    next.set("page", String(page));
    return `/admin/crm?${next.toString()}`;
  } : undefined;
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Clientes"
        title="Gestión de clientes"
        description="Administra tu cartera de clientes y su actividad comercial."
        action={<PrimaryAction icon={UserRound} href="#customer-controls">Nuevo cliente</PrimaryAction>}
      >
        <SecondaryAction href={exportHref}>Exportar</SecondaryAction>
      </PageHeader>
      {customerId ? <CustomerDetailPanel key={customerId} customerId={customerId} closeHref={closeHref ?? "/admin/crm?view=clientes"} /> : null}
      <MetricGrid
        columns="lg:grid-cols-3"
        items={[
          {
            label: "Clientes registrados",
            value: total,
            note: "Total filtrado",
            icon: UsersRound,
          },
          {
            label: "Clientes activos",
            value: active,
            note: "Estado activo",
            tone: "green",
            icon: Check,
          },
          {
            label: "Por atender",
            value: waiting,
            note: "Sin actividad informada",
            tone: "orange",
            icon: Clock3,
          },
        ]}
      />
      <Toolbar placeholder="Buscar por nombre, empresa, contacto o email..." action="/admin/crm?view=clientes" queryValue={query}>
        <FilterSelect name="status" options={(facets?.statuses ?? ["ACTIVE", "INACTIVE", "PROSPECT"]).map((status) => ({ value: status, label: status === "ACTIVE" ? "Activos" : status === "INACTIVE" ? "Inactivos" : "Prospectos" }))}>Estado</FilterSelect>
        <FilterSelect name="customerType" options={(facets?.customerTypes ?? []).map((type) => ({ value: type, label: type }))}>Tipo de cliente</FilterSelect>
      </Toolbar>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Panel title="Clientes" subtitle={`${rows.length} resultados`}>
          <Table
            headers={[
              "Cliente",
              "Tipo",
              "Contacto",
              "Teléfono",
              "Email",
              "Ciudad",
              "Actividad",
              "Estado",
              "",
            ]}
            rows={data}
            title="No hay clientes registrados"
            description="No se encontraron clientes para esta consulta."
            icon={UsersRound}
          />
          <Pager label={`Mostrando ${data.length} de ${pagination?.totalItems ?? rows.length} clientes`} page={pagination?.page} totalPages={pagination?.totalPages} hrefForPage={hrefForPage} />
        </Panel>
        <Summary
          title="Resumen de clientes"
          items={["Registrados", "Activos", "Por atender"]}
          values={[
            total,
            active,
            waiting,
          ]}
        />
      </div>
      {controls ? (
        <Panel title="Operaciones CRM">
          <details>
            <summary className="cursor-pointer px-4 py-3 text-[10px] font-extrabold text-[#2277ee]">
              Abrir controles de clientes
            </summary>
            <div id="customer-controls" className="border-t border-[#edf2f6] p-4">{controls}</div>
          </details>
        </Panel>
      ) : null}
    </div>
  );
}


export function OrdersWorkspace({ rows, metrics, pagination, facets, query, queryString, exportHref, controls }: { rows: ListingRow[]; metrics?: { total: number; pending: number; paid: number; cancelled: number; totalAmount: number; averageTicket: number | null }; pagination?: { page: number; totalPages: number; totalItems: number }; facets?: { statuses: string[]; deliveryMethods: string[]; currencies: string[] }; query?: string; queryString?: string; exportHref?: string; controls?: ReactNode }) {
  const countBy = (pattern: RegExp) => rows.filter((row) => pattern.test(row.status)).length;
  const states = [
    ["Recibido", metrics?.total ?? rows.length],
    ["En preparación", countBy(/prepar/i)],
    ["En camino", countBy(/shipped|camino/i)],
    ["Entregado", countBy(/deliver|entreg/i)],
    ["Pendiente", metrics?.pending ?? countBy(/pend/i)],
  ] as const;
  const hrefForPage = pagination && queryString ? (page: number) => { const next = new URLSearchParams(queryString); next.set("page", String(page)); return `/admin/pedidos?${next.toString()}`; } : undefined;
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Pedidos"
        title="Gestión de pedidos"
        description="Controla el estado logístico y la entrega de los pedidos."
        action={<PrimaryAction icon={Package} href="#order-controls">Preparar pedido</PrimaryAction>}
      >
        <SecondaryAction href={exportHref}>Exportar</SecondaryAction>
      </PageHeader>
      <MetricGrid
        items={[
          {
            label: "Pedidos totales",
            value: metrics?.total ?? rows.length,
            note: "Total filtrado",
            icon: Package,
          },
          {
            label: "En preparación",
            value: states[1][1],
            note: "Según estado recibido",
            tone: "orange",
            icon: Clock3,
          },
          {
            label: "En camino",
            value: states[2][1],
            note: "Según estado recibido",
            tone: "green",
            icon: Truck,
          },
          {
            label: "Entregados",
            value: states[3][1],
            note: "Según estado recibido",
            tone: "green",
            icon: Check,
          },
          {
            label: "Pendientes",
            value: states[4][1],
            note: "Según estado recibido",
            tone: "red",
            icon: CircleAlert,
          },
        ]}
      />
      <Toolbar placeholder="Buscar pedidos, clientes o productos..." action="/admin/pedidos" queryValue={query}>
        <FilterSelect name="status" options={(facets?.statuses ?? []).map((status) => ({ value: status, label: status }))}>Estado</FilterSelect>
        <FilterSelect name="deliveryMethod" options={(facets?.deliveryMethods ?? []).map((method) => ({ value: method, label: method }))}>Entrega</FilterSelect>
        <FilterSelect name="currency" options={(facets?.currencies ?? []).map((currency) => ({ value: currency, label: currency }))}>Moneda</FilterSelect>
      </Toolbar>
      <ListingTable kind="orders" rows={rows} />
      <Pager label={`Mostrando ${rows.length} de ${pagination?.totalItems ?? rows.length} pedidos`} page={pagination?.page} totalPages={pagination?.totalPages} hrefForPage={hrefForPage} />
      <Panel title="Estado logístico">
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
          {states.map(([label, value]) => (
            <div key={label} className="text-center">
              <span
                className="mx-auto block h-3 w-3 rounded-full bg-[#2277ee]"
                aria-hidden="true"
              />
              <p className="mt-2 text-[9px] text-[#8296a9]">{label}</p>
              <strong className="mt-1 block text-[13px] text-[#102a43]">{value}</strong>
            </div>
          ))}
        </div>
      </Panel>
      {controls ? (
        <Panel title="Operaciones de pedido">
          <details>
            <summary className="cursor-pointer px-4 py-3 text-[10px] font-extrabold text-[#2277ee]">
              Abrir controles logísticos y pagos
            </summary>
            <div id="order-controls" className="border-t border-[#edf2f6] p-4">{controls}</div>
          </details>
        </Panel>
      ) : null}
    </div>
  );
}

function PaymentDonut({
  counts,
}: {
  counts: { paid: number; pending: number; verifying: number; rejected: number };
}) {
  const total = counts.paid + counts.pending + counts.verifying + counts.rejected;
  const paidEnd = total ? (counts.paid / total) * 100 : 0;
  const pendingEnd = total ? ((counts.paid + counts.pending) / total) * 100 : 0;
  const verifyingEnd = total
    ? ((counts.paid + counts.pending + counts.verifying) / total) * 100
    : 0;
  const gradient = total
    ? `conic-gradient(#159263 0 ${paidEnd}%, #f58b20 ${paidEnd}% ${pendingEnd}%, #2277ee ${pendingEnd}% ${verifyingEnd}%, #ed4b4b ${verifyingEnd}% 100%)`
    : "#edf2f6";
  return (
    <div className="flex min-h-40 items-center justify-center">
      <div className="relative h-32 w-32 rounded-full" style={{ background: gradient }}>
        <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white">
          <strong className="text-2xl font-black text-[#102a43]">{total}</strong>
          <span className="text-[9px] text-[#8296a9]">registros</span>
        </div>
      </div>
    </div>
  );
}
export function PaymentsWorkspace({
  rows,
  controls,
  metrics,
  pagination,
  facets,
  query,
  queryString = "",
  exportHref,
}: {
  rows: ListingRow[];
  controls?: ReactNode;
  metrics?: { total: number; pending: number; approved: number; rejected: number; refunded: number; totalAmount: number };
  pagination?: { page: number; totalPages: number; totalItems: number };
  facets?: { statuses: string[]; providers: string[]; methods: string[] };
  query?: string;
  queryString?: string;
  exportHref?: string;
}) {
  const counts = {
    paid: metrics?.approved ?? rows.filter((row) => /pag|confirm|approved/i.test(row.status)).length,
    pending: metrics?.pending ?? rows.filter((row) => /pend/i.test(row.status)).length,
    verifying: rows.filter((row) => /verif/i.test(row.status)).length,
    rejected: metrics?.rejected ?? rows.filter((row) => /rechaz|error/i.test(row.status)).length,
  };
  const methodRows = Array.from(new Set(rows.map((row) => row.method).filter(Boolean))) as string[];
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Pagos"
        title="Gestión de pagos"
        description="Revisa, verifica y gestiona los pagos registrados."
        action={<SecondaryAction href={exportHref}>Exportar reporte</SecondaryAction>}
      >
        {controls ? <PrimaryAction icon={RefreshCw} href="#payment-controls">Gestionar pagos</PrimaryAction> : null}
      </PageHeader>
      <MetricGrid
        columns="xl:grid-cols-4"
        items={[
          {
            label: "Pagos pendientes",
            value: counts.pending,
            note: "Según estado recibido",
            tone: "orange",
            icon: Clock3,
          },
          {
            label: "Pagos confirmados",
            value: counts.paid,
            note: "Según estado recibido",
            tone: "green",
            icon: Check,
          },
          {
            label: "En verificación",
            value: counts.verifying,
            note: "Según estado recibido",
            icon: RefreshCw,
          },
          {
            label: "Rechazados",
            value: counts.rejected,
            note: "Según estado recibido",
            tone: "red",
            icon: X,
          },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Estado de pagos">
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <PaymentDonut counts={counts} />
            <div className="grid content-center gap-2">
              {[
                ["Pagados", counts.paid],
                ["Pendientes", counts.pending],
                ["En verificación", counts.verifying],
                ["Rechazados", counts.rejected],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex justify-between text-[10px] font-bold text-[#526b84]"
                >
                  <span>{label}</span>
                  <b>{value}</b>
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel title="Métodos de pago">
          {methodRows.length ? (
            <div className="grid gap-2 p-4">
              {methodRows.map((method) => (
                <div
                  key={method}
                  className="border-b border-[#f0f4f7] py-2 text-[10px] font-bold text-[#526b84]"
                >
                  {method}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No hay métodos registrados"
              description="Los métodos aparecerán aquí cuando existan pagos."
              icon={CircleDollarSign}
            />
          )}
        </Panel>
      </div>
      <Toolbar placeholder="Buscar pago, pedido o cliente..." queryValue={query}>
        <FilterSelect name="status" options={(facets?.statuses ?? []).map((value) => ({ value, label: displayStatus(value) }))}>Todos los estados</FilterSelect>
        <FilterSelect name="method" options={(facets?.methods ?? []).map((value) => ({ value, label: value }))}>Método</FilterSelect>
      </Toolbar>
      <ListingTable kind="payments" rows={rows} />
      {pagination ? <Pager label={`Mostrando ${rows.length} de ${pagination.totalItems} pagos`} page={pagination.page} totalPages={pagination.totalPages} hrefForPage={(next) => { const params = new URLSearchParams(queryString); params.set("page", String(next)); return `?${params.toString()}`; }} /> : null}
      {controls ? (
        <Panel title="Gestión y conciliación">
          <details id="payment-controls">
            <summary className="cursor-pointer px-4 py-3 text-[10px] font-extrabold text-[#2277ee]">
              Abrir controles de pago
            </summary>
            <div className="border-t border-[#edf2f6] p-4">{controls}</div>
          </details>
        </Panel>
      ) : null}
    </div>
  );
}

export function ContentWorkspace({ controls }: { controls?: ReactNode }) {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="CMS"
        title="Gestión de contenido"
        description="Administra el contenido visual y textual de la tienda online."
        action={<PrimaryAction icon={Check} href="#cms-controls">Publicar cambios</PrimaryAction>}
      >
        <SecondaryAction icon={ImageIcon} href="#cms-controls">Abrir editor</SecondaryAction>
      </PageHeader>
      <Panel title="Contenido publicado" subtitle="El contenido se carga desde el CMS persistido.">
        <EmptyState
          title="Vista previa no disponible"
          description="Abre el editor para cargar, reordenar o publicar los bloques confirmados."
          icon={ImageIcon}
        />
      </Panel>
      {controls ? (
        <Panel title="Editor CMS y biblioteca multimedia">
          <details>
            <summary className="cursor-pointer px-4 py-3 text-[10px] font-extrabold text-[#2277ee]">
              Abrir editor y media
            </summary>
            <div className="border-t border-[#edf2f6] p-4">{controls}</div>
          </details>
        </Panel>
      ) : null}
    </div>
  );
}

type ReportData = {
  sales?: number[];
  previous?: number[];
  margin?: number[];
  categories?: Array<{ label: string; value: number }>;
  products?: Array<{ label: string; value: number }>;
  customers?: Array<{ label: string; value: number }>;
  sellers?: Array<{ label: string; value: number }>;
  summary?: Array<{ label: string; value: string | number }>;
};
function ReportList({
  rows,
  title,
  icon,
}: {
  rows?: Array<{ label: string; value: number }>;
  title: string;
  icon: LucideIcon;
}) {
  return rows?.length ? (
    <div className="grid gap-2 p-4">
      {rows.slice(0, 6).map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between border-b border-[#f0f4f7] py-2 text-[10px] text-[#526b84]"
        >
          <span>{row.label}</span>
          <b>{row.value}</b>
        </div>
      ))}
    </div>
  ) : (
    <EmptyState
      title={title}
      description="Aún no hay datos suficientes para este reporte."
      icon={icon}
    />
  );
}
export function ReportsWorkspace({
  metrics,
  controls,
  data,
  error,
  exportHref,
}: {
  metrics: Metric[];
  controls?: ReactNode;
  data?: ReportData;
  error?: string;
  exportHref?: string;
}) {
  const hasSales = Boolean(data?.sales?.length);
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Reportes"
        title="Reportes de negocio"
        description="Analiza el rendimiento comercial y operativo con datos confirmados."
        action={<SecondaryAction href={exportHref}>Exportar reporte</SecondaryAction>}
      />
      <MetricGrid items={metrics} />
      {controls ? (
        <Panel
          title="Filtros del reporte"
          subtitle="Consulta el período y los segmentos disponibles en la fuente de datos."
        >
          <div className="p-4">{controls}</div>
        </Panel>
      ) : null}
      {error ? (
        <Panel title="Reporte no disponible">
          <EmptyState
            title="No se pudo cargar este reporte"
            description={error}
            icon={CircleAlert}
          />
        </Panel>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Evolución de ventas e ingresos">
              <div className="p-4">
                {hasSales ? (
                  <AdminLineChart comparison data={data?.sales} previous={data?.previous} ariaLabel="Evolución de ventas e ingresos" />
                ) : (
                  <EmptyState
                    title="Aún no hay datos suficientes para este reporte"
                    description="El backend no devolvió una serie de ventas para este alcance."
                    icon={BarChart3}
                  />
                )}
              </div>
            </Panel>
            <Panel title="Composición del margen bruto">
              <div className="p-4">
                {data?.margin?.length ? (
                  <AdminLineChart accent="orange" data={data.margin} ariaLabel="Composición del margen bruto" />
                ) : (
                  <EmptyState
                    title="Aún no hay datos suficientes para este reporte"
                    description="El backend no devolvió una serie de margen para este alcance."
                    icon={CircleDollarSign}
                  />
                )}
              </div>
            </Panel>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="Ventas por categoría">
              <ReportList rows={data?.categories} title="No hay ventas por categoría" icon={Tag} />
            </Panel>
            <Panel title="Top productos por ventas">
              <ReportList rows={data?.products} title="No hay productos vendidos" icon={Package} />
            </Panel>
            <Panel title="Clientes por ventas">
              <ReportList
                rows={data?.customers}
                title="No hay clientes con ventas"
                icon={UsersRound}
              />
            </Panel>
            <Panel title="Vendedores por ventas">
              <ReportList rows={data?.sellers} title="No hay vendedores con ventas" icon={UsersRound} />
            </Panel>
          </div>
          <Panel title="Resumen ejecutivo">
            {data?.summary?.length ? <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">{data.summary.map((item) => <div key={item.label} className="rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-3"><p className="text-[10px] font-semibold text-[#8296a9]">{item.label}</p><p className="mt-1 text-[16px] font-black text-[#102a43]">{item.value}</p></div>)}</div> : <EmptyState title="Sin datos suficientes" description="El resumen se habilitará cuando exista información agregada del período." icon={FileText} />}
          </Panel>
        </>
      )}
    </div>
  );
}

export function AuditWorkspace({
  rows,
  controls,
  metrics,
  pagination,
  facets,
  query,
  queryString = "",
  exportHref,
}: {
  rows: Array<{
    date: string;
    user: string;
    action: string;
    entity: string;
    before?: string;
    after?: string;
    origin?: string;
    tone?: Tone | "gray";
  }>;
  controls?: ReactNode;
  metrics?: { total: number; critical: number; actors: number; failedAttempts: number | null };
  pagination?: { page: number; totalPages: number; totalItems: number };
  facets?: { modules: string[]; actions: string[]; entityTypes: string[]; severities: string[] };
  query?: string;
  queryString?: string;
  exportHref?: string;
}) {
  const data = rows
    .slice(0, 15)
    .map((row) => [
      <span>{row.date}</span>,
      <b>{row.user}</b>,
      <StatusBadge tone={row.tone}>{row.action}</StatusBadge>,
      <span>{row.entity}</span>,
      <span>{displayValue(row.before)}</span>,
      <span>{displayValue(row.after)}</span>,
      <span className="font-mono">{displayValue(row.origin)}</span>,
    ]);
  const total = metrics?.total ?? rows.length;
  const actors = metrics?.actors ?? new Set(rows.map((row) => row.user)).size;
  const critical = metrics?.critical ?? rows.filter((row) => row.tone === "red").length;
  const failedAttempts = metrics?.failedAttempts ?? null;
  const hrefForPage = pagination && queryString ? (page: number) => {
    const next = new URLSearchParams(queryString);
    next.set("page", String(page));
    return `/admin/auditoria?${next.toString()}`;
  } : undefined;
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Auditoría"
        title="Registro de auditoría"
        description="Historial detallado de acciones y eventos del sistema."
        action={<SecondaryAction href={exportHref}>Exportar</SecondaryAction>}
      >
        <SecondaryAction icon={Filter}>Filtros</SecondaryAction>
      </PageHeader>
      <MetricGrid
        columns="xl:grid-cols-4"
        items={[
          {
            label: "Eventos totales",
            value: total,
            note: "Eventos dentro del alcance",
            icon: ShieldCheck,
          },
          {
            label: "Usuarios activos",
            value: actors,
            note: "Actores registrados",
            tone: "green",
            icon: UsersRound,
          },
          {
            label: "Eventos críticos",
            value: critical,
            note: "Según severidad recibida",
            tone: "red",
            icon: CircleAlert,
          },
          {
            label: "Intentos fallidos",
            value: failedAttempts === null ? "N/D" : failedAttempts,
            note: failedAttempts === null ? "No disponible en la fuente" : "Eventos fallidos detectados",
            tone: "orange",
            icon: ShieldCheck,
          },
        ]}
      />
      <Toolbar placeholder="Buscar por usuario, acción, entidad o ID..." queryValue={query}>
        <FilterSelect name="module" options={(facets?.modules ?? []).map((value) => ({ value, label: value }))}>Todos los módulos</FilterSelect>
        <FilterSelect name="action" options={(facets?.actions ?? []).map((value) => ({ value, label: value }))}>Todas las acciones</FilterSelect>
        <FilterSelect name="severity" options={(facets?.severities ?? []).map((value) => ({ value, label: value }))}>Todas las severidades</FilterSelect>
        <label className="relative">
          <input name="dateFrom" type="date" defaultValue={new URLSearchParams(queryString).get("dateFrom") ?? ""} className="h-10 rounded-lg border border-[#dce6ee] px-3 text-[10px] font-bold text-[#526b84]" aria-label="Fecha desde" />
        </label>
        <label className="relative">
          <input name="dateTo" type="date" defaultValue={new URLSearchParams(queryString).get("dateTo") ?? ""} className="h-10 rounded-lg border border-[#dce6ee] px-3 text-[10px] font-bold text-[#526b84]" aria-label="Fecha hasta" />
        </label>
      </Toolbar>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Panel title="Eventos del sistema" subtitle={`${total} registros`}>
          <Table
            headers={[
              "Fecha y hora",
              "Usuario",
              "Acción",
              "Entidad",
              "Antes",
              "Después",
              "IP / origen",
            ]}
            rows={data}
            title="No hay eventos de auditoría"
            description="No se recibieron eventos para este alcance."
            icon={ShieldCheck}
          />
          <Pager label={`Mostrando ${data.length} de ${pagination?.totalItems ?? rows.length} eventos`} page={pagination?.page} totalPages={pagination?.totalPages} hrefForPage={hrefForPage} />
        </Panel>
        <Summary
          title="Resumen de actividad"
          items={["Eventos críticos", "Usuarios activos", "Intentos fallidos"]}
          values={[critical, actors, failedAttempts === null ? "N/D" : failedAttempts]}
        />
      </div>
      {controls}
    </div>
  );
}

export function UsersWorkspace({
  rows,
  controls,
  metrics,
  pagination,
  facets,
  query,
  queryString = "",
  exportHref,
  canInvite = false,
}: {
  rows: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    roleLabel?: string;
    status: string;
    lastAccess: string;
    createdAt: string;
    sync?: string;
  }>;
  controls?: ReactNode;
  metrics?: { total: number; active: number; inactive: number; suspended: number; administrators: number; pendingInvitations: number };
  pagination?: { page: number; totalPages: number; totalItems: number };
  facets?: { roles: string[]; statuses: string[] };
  query?: string;
  queryString?: string;
  exportHref?: string;
  canInvite?: boolean;
}) {
  const data = rows
    .slice(0, 14)
    .map((row) => [
      <b>{row.name}</b>,
      <span>{row.email}</span>,
      <StatusBadge tone="purple">{row.roleLabel ?? row.role}</StatusBadge>,
      <StatusBadge tone={row.status === "Activo" ? "green" : "gray"}>{row.status}</StatusBadge>,
      <span>{row.lastAccess}</span>,
      <span>{row.createdAt}</span>,
      <span className="text-[9px] text-[#8296a9]">{row.sync === "SYNCED" ? "Sincronizado" : "Pendiente"}</span>,
      <More label={row.name} />,
    ]);
  const total = metrics?.total ?? rows.length;
  const active = metrics?.active ?? rows.filter((row) => row.status === "ACTIVE" || row.status === "Activo").length;
  const administrators = metrics?.administrators ?? rows.filter((row) => /admin|super|gerencia/i.test(row.role)).length;
  const pendingInvitations = metrics?.pendingInvitations ?? 0;
  const hrefForPage = pagination && queryString ? (page: number) => { const next = new URLSearchParams(queryString); next.set("page", String(page)); return `/admin/usuarios?${next.toString()}`; } : undefined;
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Usuarios"
        title="Gestión de usuarios"
        description="Administra los usuarios y permisos de la plataforma."
        action={canInvite ? <PrimaryAction icon={UsersRound} href="#user-management-controls">Invitar trabajador</PrimaryAction> : undefined}
      >
        <SecondaryAction href={exportHref}>Exportar usuarios</SecondaryAction>
      </PageHeader>
      <MetricGrid
        columns="xl:grid-cols-4"
        items={[
          {
            label: "Usuarios registrados",
            value: total,
            note: "Cuentas dentro del alcance",
            icon: UsersRound,
          },
          {
            label: "Activos",
            value: active,
            note: "Acceso vigente",
            tone: "green",
            icon: Check,
          },
          {
            label: "Administradores",
            value: administrators,
            note: "Roles elevados",
            tone: "purple",
            icon: ShieldCheck,
          },
          {
            label: "Invitados",
            value: pendingInvitations,
            note: "Invitaciones pendientes en Clerk",
            tone: "orange",
            icon: Clock3,
          },
        ]}
      />
      <Toolbar placeholder="Buscar por nombre o correo..." queryValue={query}>
        <FilterSelect name="role" options={(facets?.roles ?? []).map((value) => ({ value, label: displayRole(value) }))}>Rol</FilterSelect>
        <FilterSelect name="status" options={(facets?.statuses ?? []).map((value) => ({ value, label: value }))}>Estado</FilterSelect>
        <input name="createdFrom" type="date" defaultValue={new URLSearchParams(queryString).get("createdFrom") ?? ""} className="h-10 rounded-lg border border-[#dce6ee] px-3 text-[10px] font-bold text-[#526b84]" aria-label="Creado desde" />
        <input name="createdTo" type="date" defaultValue={new URLSearchParams(queryString).get("createdTo") ?? ""} className="h-10 rounded-lg border border-[#dce6ee] px-3 text-[10px] font-bold text-[#526b84]" aria-label="Creado hasta" />
      </Toolbar>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Panel title="Usuarios registrados" subtitle={`${total} resultados`}>
          <Table
            headers={[
              "Trabajador",
              "Correo electrónico",
              "Rol",
              "Estado",
              "Último acceso",
              "Fecha de incorporación",
              "Clerk",
              "Acciones",
            ]}
            rows={data}
            title="No hay usuarios registrados"
            description="No se encontraron usuarios para este alcance."
            icon={UsersRound}
          />
          <Pager label={`Mostrando ${data.length} de ${pagination?.totalItems ?? rows.length} usuarios`} page={pagination?.page} totalPages={pagination?.totalPages} hrefForPage={hrefForPage} />
        </Panel>
        <Summary
          title="Distribución por rol"
          items={["Superadmin", "Gerencia", "Operaciones y ventas", "Almacén"]}
          values={[
            rows.filter((row) => /super/i.test(row.role)).length,
            rows.filter((row) => /gerencia/i.test(row.role)).length,
            rows.filter((row) => /operaciones|ventas/i.test(row.role)).length,
            rows.filter((row) => /almac/i.test(row.role)).length,
          ]}
        />
      </div>
      {controls ? (
        <Panel title="Invitaciones y permisos">
          <details id="user-management-controls" open>
            <summary className="cursor-pointer px-4 py-3 text-[10px] font-extrabold text-[#2277ee]">
              Abrir gestión de usuarios
            </summary>
            <div className="border-t border-[#edf2f6] p-4">{controls}</div>
          </details>
        </Panel>
      ) : null}
    </div>
  );
}

export function CompanySettingsWorkspace({ controls }: { controls?: ReactNode }) {
  const tabs = [
    { label: "Empresa", id: "company-general" },
    { label: "Contacto", id: "company-contact" },
    { label: "Direcciones", id: "company-addresses" },
    { label: "Redes", id: "company-socials" },
    { label: "Operación", id: "company-operation" },
    { label: "Políticas", id: "company-policies" },
    { label: "Branding", id: "company-branding" },
  ];
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Configuración empresarial"
        title="Configuración empresarial"
        description="Administra la información y preferencias de tu empresa."
            action={<PrimaryAction icon={Check} href="#company-settings-form">Guardar cambios</PrimaryAction>}
      />
      <div
        role="tablist"
        aria-label="Secciones de configuración"
        className="flex flex-wrap gap-5 border-b border-[#dce6ee] pb-2 text-[10px] font-extrabold text-[#526b84]"
      >
            {tabs.map((tab, index) => (
              <a
                href={`#${tab.id}`}
                role="tab"
                aria-selected={index === 0}
                key={tab.id}
                className={
                  index === 0
                    ? "border-b-2 border-[#2277ee] pb-2 text-[#2277ee]"
                    : "pb-2 text-[#526b84] transition hover:text-[#2277ee]"
                }
              >
                {tab.label}
              </a>
            ))}
      </div>
      <Panel
        title="Datos empresariales"
        subtitle="Los valores se cargan desde la configuración persistida."
      >
        <EmptyState
          title="Abre el formulario para consultar la configuración"
          description="No se muestran valores de ejemplo cuando la respuesta real no está disponible en esta vista."
          icon={Settings2}
        />
      </Panel>
      {controls ? (
        <Panel title="Formulario empresarial">
          <details open>
            <summary className="cursor-pointer px-4 py-3 text-[10px] font-extrabold text-[#2277ee]">
              Abrir formulario completo
            </summary>
            <div className="border-t border-[#edf2f6] p-4">{controls}</div>
          </details>
        </Panel>
      ) : null}
    </div>
  );
}
