import Link from "next/link";
import type { Metadata } from "next";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, FileText, Package, Truck } from "lucide-react";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getSupplierDetail } from "@/lib/purchases-repository";

export const metadata: Metadata = { title: "Proveedor | Compras | Panel admin ColdPower" };

const tabs = [
  ["summary", "Resumen"],
  ["orders", "Órdenes"],
  ["receipts", "Recepciones"],
  ["products", "Productos"],
  ["performance", "Desempeño"],
  ["documents", "Documentos"],
  ["history", "Historial"],
] as const;

const purchaseStatusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  PENDING: "Pendiente",
  PARTIAL_RECEIVED: "Parcial",
  RECEIVED: "Recibida",
  CANCELLED: "Cancelada",
};

function dateLabel(value: Date | string | null | undefined) {
  if (!value) return "N/D";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "N/D"
    : date.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
}

function money(value: string | number, currency: string) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function statusClass(status: string) {
  if (status === "RECEIVED" || status === "ACTIVE") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (status === "PARTIAL_RECEIVED" || status === "PENDING") return "border-amber-100 bg-amber-50 text-amber-700";
  if (status === "CANCELLED") return "border-rose-100 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Package }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4 text-blue-600" aria-hidden="true" />
        <span className="text-[11px] font-extrabold uppercase tracking-[0.08em]">{label}</span>
      </div>
      <strong className="mt-2 block text-[22px] font-black text-slate-900">{value}</strong>
    </div>
  );
}

export default async function SupplierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("purchases.view");
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const rawTab = typeof query.tab === "string" ? query.tab : Array.isArray(query.tab) ? query.tab[0] : undefined;
  const tab = tabs.some(([value]) => value === rawTab) ? rawTab! : "summary";
  const detail = await getSupplierDetail(id);
  if (!detail) notFound();
  const { supplier, performance } = detail;

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-700 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <Link href="/admin/compras" className="inline-flex items-center gap-2 text-[11px] font-extrabold text-blue-600">
          <ArrowLeft className="h-4 w-4" /> Volver a compras
        </Link>
        <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-start">
          <div>
            <p className="font-mono text-[11px] font-extrabold uppercase tracking-[0.12em] text-blue-600">Proveedor</p>
            <h1 className="mt-1 text-[26px] font-black tracking-[-0.03em] text-slate-900">{supplier.name}</h1>
            <p className="mt-1 text-[11px] font-semibold text-slate-500">
              {supplier.country} · {supplier.currency} · {supplier.status === "ACTIVE" ? "Activo" : "Inactivo"}
            </p>
          </div>
          <span className={["rounded-md border px-2 py-1 text-[11px] font-extrabold", statusClass(supplier.status)].join(" ")}>
            {supplier.status === "ACTIVE" ? "Activo" : "Inactivo"}
          </span>
        </header>
        <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2" aria-label="Secciones del proveedor">
          {tabs.map(([value, label]) => (
            <Link
              key={value}
              href={"/admin/compras/proveedores/" + id + "?tab=" + value}
              className={tab === value ? "shrink-0 rounded-lg bg-blue-50 px-3 py-2 text-[11px] font-extrabold text-blue-600" : "shrink-0 rounded-lg px-3 py-2 text-[11px] font-extrabold text-slate-500 hover:bg-slate-50"}
            >
              {label}
            </Link>
          ))}
        </nav>

        {tab === "summary" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Metric label="Órdenes abiertas" value={String(performance.openOrders)} icon={Truck} />
              <Metric label="On-time" value={performance.onTimeRate == null ? "N/D" : String(performance.onTimeRate) + "%"} icon={CheckCircle2} />
              <Metric label="Fill rate" value={performance.fillRate == null ? "N/D" : String(performance.fillRate) + "%"} icon={Package} />
              <Metric label="Lead time" value={performance.leadTimeDays == null ? "N/D" : String(performance.leadTimeDays) + " d"} icon={Clock3} />
              <Metric label="Incidencias" value={String(performance.incidents)} icon={AlertCircle} />
            </div>
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-[14px] font-black text-slate-900">Datos del proveedor</h2>
              <dl className="mt-4 grid gap-3 text-[11px] sm:grid-cols-2 lg:grid-cols-3">
                <div><dt className="font-extrabold text-slate-500">Identificación</dt><dd className="mt-1 font-semibold">{supplier.identification ?? "N/D"}</dd></div>
                <div><dt className="font-extrabold text-slate-500">Contacto</dt><dd className="mt-1 font-semibold">{supplier.contactName ?? "N/D"}</dd></div>
                <div><dt className="font-extrabold text-slate-500">Correo</dt><dd className="mt-1 font-semibold">{supplier.email ?? "N/D"}</dd></div>
                <div><dt className="font-extrabold text-slate-500">WhatsApp</dt><dd className="mt-1 font-semibold">{supplier.whatsapp ?? "N/D"}</dd></div>
                <div><dt className="font-extrabold text-slate-500">Dirección</dt><dd className="mt-1 font-semibold">{supplier.address ?? "N/D"}</dd></div>
                <div><dt className="font-extrabold text-slate-500">Notas</dt><dd className="mt-1 font-semibold">{supplier.notes ?? "N/D"}</dd></div>
              </dl>
            </section>
          </>
        ) : null}

        {tab === "orders" ? (
          <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-[14px] font-black text-slate-900">Órdenes del proveedor</h2>
            <table className="mt-4 w-full min-w-[700px] text-left">
              <thead><tr className="border-b border-slate-100">{["OC", "Local", "Creada", "Esperada", "Monto", "Estado"].map((header) => <th key={header} className="px-2 py-2 text-[11px] font-extrabold uppercase text-slate-500">{header}</th>)}</tr></thead>
              <tbody>
                {detail.purchases.map(({ purchase, locationName }) => (
                  <tr key={purchase.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-2 py-3 text-[11px] font-extrabold"><Link href={"/admin/compras?purchaseId=" + encodeURIComponent(purchase.id)} className="text-blue-600 hover:underline">{purchase.code}</Link></td>
                    <td className="px-2 py-3 text-[11px] font-semibold">{locationName}</td>
                    <td className="px-2 py-3 text-[11px] font-semibold">{dateLabel(purchase.createdAt)}</td>
                    <td className="px-2 py-3 text-[11px] font-semibold">{dateLabel(purchase.expectedDeliveryAt)}</td>
                    <td className="px-2 py-3 text-[11px] font-extrabold">{money(purchase.subtotal, purchase.currency)}</td>
                    <td className="px-2 py-3"><span className={["inline-flex rounded-md border px-2 py-1 text-[11px] font-extrabold", statusClass(purchase.status)].join(" ")}>{purchaseStatusLabels[purchase.status] ?? purchase.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!detail.purchases.length ? <p className="py-8 text-center text-[11px] font-semibold text-slate-500">No hay órdenes persistidas.</p> : null}
          </section>
        ) : null}

        {tab === "receipts" ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-[14px] font-black text-slate-900">Recepciones registradas</h2>
            <div className="mt-4 space-y-2">
              {detail.receipts.map(({ receipt, purchaseCode }) => (
                <div key={receipt.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 text-[11px] font-semibold">
                  <Link href={"/admin/compras?purchaseId=" + encodeURIComponent(receipt.purchaseId)} className="font-mono font-extrabold text-blue-600 hover:underline">{receipt.code}</Link>
                  <Link href={"/admin/compras?query=" + encodeURIComponent(purchaseCode)} className="text-blue-600 hover:underline">{purchaseCode}</Link>
                  <span>{dateLabel(receipt.receivedAt)}</span>
                  <span className={["rounded-md border px-2 py-1 text-[11px] font-extrabold", statusClass(receipt.status)].join(" ")}>{receipt.status === "POSTED" ? "Registrada" : receipt.status}</span>
                </div>
              ))}
              {!detail.receipts.length ? <p className="py-8 text-center text-[11px] font-semibold text-slate-500">No hay recepciones persistidas.</p> : null}
            </div>
          </section>
        ) : null}

        {tab === "products" ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-[14px] font-black text-slate-900">Productos comprados</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {detail.products.map((product) => <Link key={product.sku} href={"/admin/catalogo?query=" + encodeURIComponent(product.sku)} className="rounded-lg border border-slate-100 p-3 hover:border-blue-200"><p className="font-mono text-[11px] font-extrabold text-blue-600">{product.sku}</p><p className="mt-1 text-[11px] font-semibold">{product.name}</p></Link>)}
              {!detail.products.length ? <p className="py-8 text-center text-[11px] font-semibold text-slate-500">No hay productos asociados.</p> : null}
            </div>
          </section>
        ) : null}

        {tab === "performance" ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-[14px] font-black text-slate-900">Desempeño medido</h2>
            <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-500">Las métricas se calculan solo con órdenes emitidas, recepciones registradas y cantidades persistidas.</p>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-[11px] font-extrabold text-slate-500">On-time</dt><dd className="mt-1 text-xl font-black">{performance.onTimeRate == null ? "N/D" : String(performance.onTimeRate) + "%"}</dd></div>
              <div><dt className="text-[11px] font-extrabold text-slate-500">Fill rate</dt><dd className="mt-1 text-xl font-black">{performance.fillRate == null ? "N/D" : String(performance.fillRate) + "%"}</dd></div>
              <div><dt className="text-[11px] font-extrabold text-slate-500">Lead time</dt><dd className="mt-1 text-xl font-black">{performance.leadTimeDays == null ? "N/D" : String(performance.leadTimeDays) + " d"}</dd></div>
              <div><dt className="text-[11px] font-extrabold text-slate-500">OC abiertas</dt><dd className="mt-1 text-xl font-black">{performance.openOrders}</dd></div>
            </dl>
          </section>
        ) : null}

        {tab === "documents" ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-[14px] font-black text-slate-900">Documentos de importación</h2>
            {detail.documents.length ? <div className="mt-4 space-y-2">{detail.documents.map((document) => <div key={document.id} className="rounded-lg border border-slate-100 p-3 text-[11px] font-semibold">{document.commercialInvoice ?? document.packingList ?? document.originCountry ?? "Documento sin referencia"} · {dateLabel(document.createdAt)}</div>)}</div> : <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-5 text-center text-[11px] font-semibold text-slate-500">No hay documentos adjuntos persistidos.</p>}
          </section>
        ) : null}

        {tab === "history" ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-[14px] font-black text-slate-900">Historial</h2>
            <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-500">El historial detallado vive en Auditoría. Consulta el registro append-only para ver cambios del proveedor.</p>
            <Link href={"/admin/auditoria?entityType=supplier&entityId=" + encodeURIComponent(id)} className="mt-4 inline-flex items-center gap-2 text-[11px] font-extrabold text-blue-600"><FileText className="h-4 w-4" /> Abrir auditoría</Link>
          </section>
        ) : null}
      </div>
    </main>
  );
}
