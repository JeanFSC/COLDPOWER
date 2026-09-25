"use client";

import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  ReceiptText,
  Truck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import type { SupplierDetail } from "@/lib/purchases-repository";
import type { SupplierInput } from "@/lib/purchases-validation";

type Props = { detail: SupplierDetail; canManage: boolean };
const card = "rounded-[14px] border border-[#dce6ee] bg-white shadow-[0_1px_2px_rgba(16,42,67,0.03)]";
const primaryButton = "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-3.5 text-[12px] font-extrabold text-white shadow-[0_5px_12px_rgba(37,99,235,0.18)] transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d5e0e9] bg-white px-3.5 text-[12px] font-extrabold text-[#2d4862] transition hover:border-[#9eb7ce] hover:bg-[#f7fafc] disabled:cursor-not-allowed disabled:opacity-50";
const input = "h-10 w-full rounded-lg border border-[#d5e0e9] bg-white px-3 text-[13px] font-semibold text-[#173654] outline-none transition placeholder:text-[#8296a9] focus:border-[#2277ee] focus:ring-2 focus:ring-[#2277ee]/10";

const statusLabels: Record<string, string> = { DRAFT: "Borrador", PENDING: "Pendiente", PARTIAL_RECEIVED: "Parcial", RECEIVED: "Recibida", CANCELLED: "Cancelada" };

function money(value: string | number, currency: string) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value));
}

function dateLabel(value: Date | string | null | undefined) {
  if (!value) return "Sin fecha registrada";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Sin fecha registrada" : date.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function countryLabel(value: string) {
  const names: Record<string, string> = { PE: "Perú", KR: "Corea del Sur", JP: "Japón", MX: "México" };
  return names[value] ?? value;
}

function statusClass(status: string) {
  if (status === "RECEIVED" || status === "ACTIVE" || status === "POSTED") return "border-[#b8e8cf] bg-[#effaf4] text-[#087443]";
  if (status === "PARTIAL_RECEIVED" || status === "PENDING") return "border-[#f2d19f] bg-[#fffaf0] text-[#9a5c16]";
  if (status === "CANCELLED" || status === "INACTIVE") return "border-[#f2c7c7] bg-[#fff6f6] text-[#b42318]";
  return "border-[#dce6ee] bg-[#f4f7fa] text-[#607894]";
}

function displayValue(value: string | null | undefined, emptyAction?: string) {
  return value?.trim() ? value : emptyAction ?? "Sin dato registrado";
}

function getError(value: unknown) {
  if (!value || typeof value !== "object") return "No se pudo guardar el proveedor.";
  const result = value as { error?: unknown; errorObject?: { message?: unknown } };
  if (typeof result.error === "string") return result.error;
  if (typeof result.errorObject?.message === "string") return result.errorObject.message;
  return "No se pudo guardar el proveedor.";
}

function Metric({ label, value, note, icon: Icon, tone = "blue" }: { label: string; value: string; note: string; icon: typeof Package; tone?: "blue" | "green" | "amber" | "rose" }) {
  const iconTone = { blue: "bg-[#eaf2ff] text-[#2563eb]", green: "bg-[#e8f8ef] text-[#0b8f5a]", amber: "bg-[#fff3df] text-[#b45309]", rose: "bg-[#fff0f0] text-[#c2413b]" };
  return <article className={`${card} p-4`}><div className="flex items-center justify-between gap-3"><p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#70869a]">{label}</p><span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${iconTone[tone]}`}><Icon className="h-4 w-4" aria-hidden="true" /></span></div><p className="mt-3 whitespace-nowrap text-[21px] font-black tracking-[-0.03em] text-[#102a43]">{value}</p><p className="mt-1 text-[11px] font-semibold text-[#8296a9]">{note}</p></article>;
}

export function SupplierDetailWorkspace({ detail, canManage }: Props) {
  const router = useRouter();
  const { supplier, performance } = detail;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [reason, setReason] = useState("");
  const [form, setForm] = useState<SupplierInput>(() => ({ name: supplier.name, identification: supplier.identification, country: supplier.country, contactName: supplier.contactName, whatsapp: supplier.whatsapp, email: supplier.email, address: supplier.address, currency: supplier.currency, notes: supplier.notes, status: supplier.status }));
  const openPurchases = detail.purchases.filter(({ purchase }) => ["DRAFT", "PENDING", "PARTIAL_RECEIVED"].includes(purchase.status));
  const openAmount = openPurchases.reduce((sum, { purchase }) => sum + Number(purchase.subtotal ?? 0), 0);
  const completed = detail.purchases.filter(({ purchase }) => purchase.status === "RECEIVED").length;
  const currency = supplier.currency || "PEN";

  function update<K extends keyof SupplierInput>(key: K, value: SupplierInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/proveedores/${encodeURIComponent(supplier.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, reason }) });
      const result = await response.json();
      if (!response.ok) throw new Error(getError(result));
      setDrawerOpen(false);
      setReason("");
      setMessage({ tone: "success", text: "Proveedor actualizado y auditado." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "No se pudo guardar el proveedor." });
    } finally {
      setBusy(false);
    }
  }

  function openEdit() {
    setForm({ name: supplier.name, identification: supplier.identification, country: supplier.country, contactName: supplier.contactName, whatsapp: supplier.whatsapp, email: supplier.email, address: supplier.address, currency: supplier.currency, notes: supplier.notes, status: supplier.status });
    setMessage(null);
    setDrawerOpen(true);
  }

  const whatsappNumber = supplier.whatsapp?.replace(/\D/g, "");

  return (
    <div className="space-y-4 pt-5">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2563eb]">Compras / Proveedores / Detalle</p><div className="mt-2 flex flex-wrap items-center gap-2"><h1 className="text-[30px] font-black tracking-[-0.04em] text-[#102a43]">{supplier.name}</h1><span className={`rounded-md border px-2 py-1 text-[11px] font-extrabold ${statusClass(supplier.status)}`}>{supplier.status === "ACTIVE" ? "Activo" : "Inactivo"}</span></div><p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-[#607894]"><span>{displayValue(supplier.identification, "Identificación no registrada")}</span><span>·</span><span>{countryLabel(supplier.country)}</span><span>·</span><span>Moneda {currency}</span></p></div><div className="flex flex-wrap gap-2"><Link href={`/admin/compras?orderSupplierId=${encodeURIComponent(supplier.id)}`} className={primaryButton}><Plus className="h-4 w-4" aria-hidden="true" /> Crear OC</Link>{whatsappNumber ? <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className={secondaryButton}><MessageCircle className="h-4 w-4 text-[#0b8f5a]" aria-hidden="true" /> WhatsApp</a> : null}{canManage ? <button type="button" className={secondaryButton} onClick={openEdit}><Pencil className="h-4 w-4" aria-hidden="true" /> Editar</button> : null}</div></header>
      {message ? <div className={`rounded-lg border px-3 py-2.5 text-[13px] font-semibold ${message.tone === "success" ? "border-[#b8e8cf] bg-[#f0fbf5] text-[#087443]" : "border-[#f3c4c4] bg-[#fff6f6] text-[#b42318]"}`} role={message.tone === "error" ? "alert" : "status"}>{message.text}</div> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><Metric label="OC abiertas" value={money(openAmount, currency)} note={`${openPurchases.length} órdenes abiertas`} icon={Truck} /><Metric label="On-time" value={performance.onTimeRate == null ? "Sin entregas" : `${performance.onTimeRate}%`} note={completed ? `${completed} órdenes recibidas` : "Se calcula al recibir una OC"} icon={CheckCircle2} tone="green" /><Metric label="Fill rate" value={performance.fillRate == null ? "Sin recepciones" : `${performance.fillRate}%`} note={performance.fillRate == null ? "Aún no hay cantidades recibidas" : "Cantidad recibida / ordenada"} icon={Package} tone="blue" /><Metric label="Lead time medio" value={performance.leadTimeDays == null ? "Sin entregas" : `${performance.leadTimeDays} d`} note={performance.leadTimeDays == null ? "Se calcula con fechas reales" : "Emisión hasta recepción"} icon={Clock3} tone="amber" /><Metric label="Incidencias" value={String(performance.incidents)} note={performance.incidents ? "Requieren seguimiento" : "Sin incidencias derivadas"} icon={CalendarClock} tone={performance.incidents ? "rose" : "green"} /></div>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.72fr)_minmax(320px,0.92fr)]">
        <div className="grid items-start gap-3">
          <section className={`${card} p-4 sm:p-5`} aria-labelledby="supplier-orders-title"><div className="flex items-start justify-between gap-3"><div><h2 id="supplier-orders-title" className="text-[16px] font-black text-[#102a43]">Órdenes abiertas</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Qué le debemos y cuándo debe llegar.</p></div><Link href={`/admin/compras?query=${encodeURIComponent(supplier.name)}`} className="inline-flex items-center gap-1 text-[12px] font-extrabold text-[#2563eb]">Ver todas <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[660px] text-left"><thead className="border-b border-[#dce6ee]"><tr>{["Orden", "Estado", "Entrega esperada", "Importe"].map((label) => <th key={label} className="px-2 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#7890a8]">{label}</th>)}</tr></thead><tbody>{openPurchases.map(({ purchase, locationName }) => <tr key={purchase.id} className="border-b border-[#edf2f6] last:border-0"><td className="px-2 py-3"><Link href={`/admin/compras?purchaseId=${encodeURIComponent(purchase.id)}`} className="font-mono text-[12px] font-extrabold text-[#2563eb] hover:underline">{purchase.code}</Link><span className="mt-1 block text-[11px] font-semibold text-[#8296a9]">{locationName}</span></td><td className="px-2 py-3"><span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-extrabold ${statusClass(purchase.status)}`}>{statusLabels[purchase.status] ?? "Estado registrado"}</span></td><td className={`px-2 py-3 text-[12px] font-semibold ${purchase.expectedDeliveryAt && new Date(purchase.expectedDeliveryAt) < new Date() ? "text-[#b42318]" : "text-[#607894]"}`}>{dateLabel(purchase.expectedDeliveryAt)}</td><td className="whitespace-nowrap px-2 py-3 text-right font-mono text-[12px] font-extrabold text-[#304b66]">{money(purchase.subtotal, purchase.currency)}</td></tr>)}</tbody></table>{!openPurchases.length ? <div className="py-7"><p className="text-center text-[13px] font-semibold text-[#71869c]">No hay órdenes abiertas persistidas para este proveedor.</p><Link href={`/admin/compras?orderSupplierId=${encodeURIComponent(supplier.id)}`} className="mx-auto mt-3 flex w-fit items-center gap-2 text-[12px] font-extrabold text-[#2563eb]"><Plus className="h-4 w-4" aria-hidden="true" /> Crear la primera OC</Link></div> : null}</div></section>
          <section className={`${card} p-4 sm:p-5`} aria-labelledby="supplier-products-title"><div className="flex items-start justify-between gap-3"><div><h2 id="supplier-products-title" className="text-[16px] font-black text-[#102a43]">Productos que suministra</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Referencias encontradas en sus órdenes persistidas.</p></div><Link href={`/admin/catalogo?query=${encodeURIComponent(detail.products[0]?.sku ?? "")}`} className="inline-flex items-center gap-1 text-[12px] font-extrabold text-[#2563eb]">Ver catálogo <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link></div><div className="mt-4 divide-y divide-[#edf2f6]">{detail.products.slice(0, 6).map((product) => <Link key={product.sku} href={`/admin/catalogo?query=${encodeURIComponent(product.sku)}`} className="flex items-center justify-between gap-3 py-3 hover:bg-[#fbfcfd]"><span className="min-w-0"><span className="block truncate text-[12px] font-extrabold text-[#304b66]">{product.name}</span><span className="mt-1 block font-mono text-[11px] font-semibold text-[#8296a9]">{product.sku}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-[#9aabba]" aria-hidden="true" /></Link>)}{!detail.products.length ? <p className="py-6 text-center text-[13px] font-semibold text-[#71869c]">No hay productos asociados en compras persistidas.</p> : null}</div><div className="mt-4 grid gap-2 border-t border-[#edf2f6] pt-3 sm:grid-cols-3"><div className="rounded-lg bg-[#fbfcfd] p-3"><p className="text-[11px] font-semibold text-[#8296a9]">Productos activos</p><p className="mt-1 text-[16px] font-black text-[#102a43]">{detail.products.length}</p></div><div className="rounded-lg bg-[#fbfcfd] p-3"><p className="text-[11px] font-semibold text-[#8296a9]">Última OC</p><p className="mt-1 text-[12px] font-extrabold text-[#304b66]">{dateLabel(detail.purchases[0]?.purchase.createdAt)}</p></div><div className="rounded-lg bg-[#fbfcfd] p-3"><p className="text-[11px] font-semibold text-[#8296a9]">Cobertura</p><p className="mt-1 text-[12px] font-extrabold text-[#304b66]">{detail.products.length ? "Referencias persistidas" : "Sin referencias"}</p></div></div></section>
        </div>
        <div className="grid items-start gap-3">
          <section className={`${card} p-4 sm:p-5`} aria-labelledby="supplier-receipts-title"><div className="flex items-start justify-between gap-3"><div><h2 id="supplier-receipts-title" className="text-[16px] font-black text-[#102a43]">Recepciones recientes</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Últimos movimientos confirmados.</p></div><span className="rounded-md bg-[#f1f5f9] px-2 py-1 text-[11px] font-extrabold text-[#607894]">90 días</span></div><div className="mt-4 space-y-4">{detail.receipts.slice(0, 5).map(({ receipt, purchaseCode }) => <div key={receipt.id} className="relative pl-6"><span className="absolute left-0 top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-[#0b9f68] ring-1 ring-[#96dfbd]"><span className="h-1.5 w-1.5 rounded-full bg-white" /></span><p className="text-[12px] font-extrabold text-[#304b66]"><Link href={`/admin/compras?purchaseId=${encodeURIComponent(receipt.purchaseId)}`} className="hover:text-[#2563eb]">{receipt.code}</Link> · {receipt.status === "POSTED" ? "registrada" : "cancelada"}</p><p className="mt-1 text-[11px] font-semibold text-[#8296a9]">{dateLabel(receipt.receivedAt)} · {purchaseCode}</p></div>)}{!detail.receipts.length ? <div className="rounded-lg border border-dashed border-[#dce6ee] bg-[#fbfcfd] p-4 text-center"><ReceiptText className="mx-auto h-5 w-5 text-[#9aabba]" aria-hidden="true" /><p className="mt-2 text-[13px] font-semibold text-[#71869c]">Aún no hay recepciones confirmadas.</p></div> : null}</div></section>
          <section className={`${card} p-4 sm:p-5`} aria-labelledby="supplier-contact-title"><div className="flex items-start justify-between gap-3"><div><h2 id="supplier-contact-title" className="text-[16px] font-black text-[#102a43]">Contacto</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Acciones de un toque para compras.</p></div>{canManage ? <button type="button" onClick={openEdit} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#d5e0e9] text-[#2563eb] hover:bg-[#f3f7fc]" aria-label="Editar contacto"><Pencil className="h-4 w-4" aria-hidden="true" /></button> : null}</div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><div className="flex items-start gap-2"><UserRound className="mt-0.5 h-4 w-4 shrink-0 text-[#2563eb]" aria-hidden="true" /><div><p className="text-[11px] font-semibold text-[#8296a9]">Contacto principal</p><p className="mt-1 text-[12px] font-extrabold text-[#304b66]">{displayValue(supplier.contactName, canManage ? "Agregar nombre" : undefined)}</p></div></div><div className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#2563eb]" aria-hidden="true" /><div><p className="text-[11px] font-semibold text-[#8296a9]">Correo</p><p className="mt-1 break-all text-[12px] font-extrabold text-[#304b66]">{displayValue(supplier.email, canManage ? "Agregar correo" : undefined)}</p></div></div><div className="flex items-start gap-2"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#0b8f5a]" aria-hidden="true" /><div><p className="text-[11px] font-semibold text-[#8296a9]">WhatsApp</p><p className="mt-1 text-[12px] font-extrabold text-[#304b66]">{displayValue(supplier.whatsapp, canManage ? "Agregar WhatsApp" : undefined)}</p></div></div><div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2563eb]" aria-hidden="true" /><div><p className="text-[11px] font-semibold text-[#8296a9]">Dirección</p><p className="mt-1 text-[12px] font-extrabold leading-5 text-[#304b66]">{displayValue(supplier.address, canManage ? "Agregar dirección" : undefined)}</p></div></div></div><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">{supplier.whatsapp ? <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className={`${secondaryButton} w-full`}><MessageCircle className="h-4 w-4 text-[#0b8f5a]" aria-hidden="true" /> Abrir WhatsApp</a> : canManage ? <button type="button" onClick={openEdit} className={`${secondaryButton} w-full`}><Plus className="h-4 w-4" aria-hidden="true" /> Agregar WhatsApp</button> : null}{supplier.email ? <a href={`mailto:${supplier.email}`} className={`${secondaryButton} w-full`}><Mail className="h-4 w-4 text-[#2563eb]" aria-hidden="true" /> Escribir correo</a> : canManage ? <button type="button" onClick={openEdit} className={`${secondaryButton} w-full`}><Plus className="h-4 w-4" aria-hidden="true" /> Agregar correo</button> : null}</div>{supplier.notes ? <p className="mt-4 rounded-lg border border-[#e3ebf2] bg-[#fbfcfd] p-3 text-[12px] leading-5 text-[#607894]"><strong className="font-extrabold text-[#49627d]">Nota de compras:</strong> {supplier.notes}</p> : null}<div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#edf2f6] pt-3"><div className="rounded-lg bg-[#fbfcfd] p-2.5"><p className="text-[10px] font-semibold text-[#8296a9]">Moneda</p><p className="mt-1 text-[11px] font-extrabold text-[#304b66]">{currency}</p></div><div className="rounded-lg bg-[#fbfcfd] p-2.5"><p className="text-[10px] font-semibold text-[#8296a9]">País</p><p className="mt-1 text-[11px] font-extrabold text-[#304b66]">{countryLabel(supplier.country)}</p></div><div className="rounded-lg bg-[#fbfcfd] p-2.5"><p className="text-[10px] font-semibold text-[#8296a9]">Estado</p><p className="mt-1 text-[11px] font-extrabold text-[#304b66]">{supplier.status === "ACTIVE" ? "Activo" : "Inactivo"}</p></div></div></section>
          <section className={`${card} p-4 sm:p-5`}><h2 className="text-[16px] font-black text-[#102a43]">Documentos de importación</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Registros vinculados al proveedor.</p>{detail.documents.length ? <div className="mt-3 space-y-2">{detail.documents.slice(0, 4).map((document) => <div key={document.id} className="flex items-center gap-2 rounded-lg border border-[#edf2f6] p-3"><FileText className="h-4 w-4 text-[#2563eb]" aria-hidden="true" /><p className="text-[12px] font-semibold text-[#607894]">{document.commercialInvoice ?? document.packingList ?? document.originCountry ?? "Documento registrado"}</p></div>)}</div> : <p className="mt-3 rounded-lg border border-dashed border-[#dce6ee] bg-[#fbfcfd] p-4 text-center text-[13px] font-semibold text-[#71869c]">No hay documentos adjuntos persistidos.</p>}</section>
        </div>
      </div>

      <AdminDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Editar proveedor" size="wide" footer={<div className="flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setDrawerOpen(false)}>Cancelar</button><button type="submit" form="supplier-edit-form" className={primaryButton} disabled={busy || !form.name.trim() || !reason.trim()}>{busy ? "Guardando…" : "Guardar cambios"}</button></div>}>
        <form id="supplier-edit-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2"><label className="text-[12px] font-extrabold text-[#304b66] sm:col-span-2">Nombre<input value={form.name} onChange={(event) => update("name", event.currentTarget.value)} className={`${input} mt-1`} required /></label><label className="text-[12px] font-extrabold text-[#304b66]">Identificación<input value={form.identification ?? ""} onChange={(event) => update("identification", event.currentTarget.value || null)} className={`${input} mt-1 font-mono`} /></label><label className="text-[12px] font-extrabold text-[#304b66]">País ISO<input value={form.country} onChange={(event) => update("country", event.currentTarget.value.toUpperCase())} maxLength={2} className={`${input} mt-1 font-mono uppercase`} required /></label><label className="text-[12px] font-extrabold text-[#304b66]">Contacto<input value={form.contactName ?? ""} onChange={(event) => update("contactName", event.currentTarget.value || null)} className={`${input} mt-1`} /></label><label className="text-[12px] font-extrabold text-[#304b66]">WhatsApp<input value={form.whatsapp ?? ""} onChange={(event) => update("whatsapp", event.currentTarget.value || null)} className={`${input} mt-1`} /></label><label className="text-[12px] font-extrabold text-[#304b66]">Correo<input type="email" value={form.email ?? ""} onChange={(event) => update("email", event.currentTarget.value || null)} className={`${input} mt-1`} /></label><label className="text-[12px] font-extrabold text-[#304b66]">Dirección<input value={form.address ?? ""} onChange={(event) => update("address", event.currentTarget.value || null)} className={`${input} mt-1`} /></label><label className="text-[12px] font-extrabold text-[#304b66] sm:col-span-2">Notas<textarea value={form.notes ?? ""} onChange={(event) => update("notes", event.currentTarget.value || null)} className="mt-1 min-h-24 w-full rounded-lg border border-[#d5e0e9] p-3 text-[13px] font-semibold text-[#173654] outline-none focus:border-[#2277ee]" /></label><label className="text-[12px] font-extrabold text-[#304b66] sm:col-span-2">Motivo del cambio <span className="text-[#b42318]">*</span><input value={reason} onChange={(event) => setReason(event.currentTarget.value)} className={`${input} mt-1`} required placeholder="Queda registrado en auditoría" /></label></form>
      </AdminDrawer>
    </div>
  );
}
