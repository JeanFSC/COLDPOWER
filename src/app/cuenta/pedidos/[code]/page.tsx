import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Circle, CircleDot, MapPin, PackageCheck, Truck, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getOrderForUser } from "@/lib/sales-service";
import { buildOrderTimeline, deliveryMethodLabels, formatDateTime, formatMoney, orderStatusLabels, paymentStatusLabels } from "@/lib/order-display";
import { Badge } from "@/components/shared/Badge";
import { PayOrderButton } from "@/components/account/PayOrderButton";
import { taxBreakdownFromSnapshot } from "@/lib/tax";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Detalle del pedido | ColdPower", robots: { index: false, follow: false } };

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ pago?: string }> };

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const { userId } = await requireUser();
  const { code } = await params;
  const { pago } = await searchParams;
  const detail = await getOrderForUser(userId, decodeURIComponent(code));
  if (!detail) notFound();
  const { order, items, payment, history, shipment, shipmentEvents, location } = detail;
  const timeline = buildOrderTimeline(order.deliveryMethod, order.status, history);
  const awaitingPayment = order.status === "PAYMENT_PENDING";
  const expired = awaitingPayment && order.paymentDueAt !== null && order.paymentDueAt.getTime() <= new Date().getTime();
  const rejected = payment?.status === "REJECTED";
  const details = order.deliveryDetails;
  const tax = taxBreakdownFromSnapshot(order);
  const destination = order.deliveryMethod === "PICKUP"
    ? [location?.name, location?.address, location?.city].filter(Boolean).join(" · ")
    : order.deliveryMethod === "DELIVERY"
      ? [order.deliveryAddress, details?.district, details?.reference && `Ref.: ${details.reference}`].filter(Boolean).join(" · ")
      : [details?.agencyName && `Agencia ${details.agencyName}`, [details?.province, details?.department].filter(Boolean).join(", "), details?.recipientName && `Recoge: ${details.recipientName}`].filter(Boolean).join(" · ");

  return (
    <section className="bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Link href="/cuenta/pedidos" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-primary hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Mis pedidos</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-black text-gray-text">Creado {formatDateTime(order.createdAt)}</p>
            <h1 className="mt-1 font-display text-3xl font-black text-dark">Pedido {order.code}</h1>
          </div>
          <Badge variant={order.status === "CANCELLED" ? "danger" : awaitingPayment ? "warning" : "stock"}>{orderStatusLabels[order.status] ?? order.status}</Badge>
        </div>

        {pago === "aprobado" && order.status !== "PAYMENT_PENDING" && order.status !== "CANCELLED" ? (
          <p className="mt-6 flex items-start gap-2 rounded-md border border-teal/30 bg-teal/10 p-4 text-sm font-semibold text-dark" role="status"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal" aria-hidden="true" />Pago aprobado. Ya estamos preparando tu pedido.</p>
        ) : null}
        {awaitingPayment && !expired ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-md border border-warning/30 bg-warning/10 p-4" role="status">
            <p className="flex items-start gap-2 text-sm font-semibold text-dark">
              {rejected ? <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />}
              <span>{rejected ? "Tu pago fue rechazado. Puedes intentarlo otra vez." : "Tu pedido espera el pago."}{order.paymentDueAt ? ` El stock está reservado hasta ${formatDateTime(order.paymentDueAt)}.` : ""}</span>
            </p>
            <PayOrderButton orderCode={order.code} label={rejected ? "Reintentar pago" : "Pagar ahora"} />
          </div>
        ) : null}
        {expired ? (
          <p className="mt-6 rounded-md border border-danger/25 bg-danger/5 p-4 text-sm font-semibold text-danger" role="status">El plazo de pago venció. El pedido se cancelará y el stock se liberará; puedes volver a comprar desde el carrito.</p>
        ) : null}
        {order.status === "CANCELLED" ? (
          <p className="mt-6 rounded-md border border-danger/25 bg-danger/5 p-4 text-sm font-semibold text-danger" role="status">Pedido cancelado{order.cancellationReason ? `: ${order.cancellationReason}` : ""}. El stock reservado se liberó.</p>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid min-w-0 gap-6">
            <section className="rounded-lg border border-border bg-white p-5 shadow-card sm:p-6" aria-label="Estado del pedido">
              <h2 className="font-display text-xl font-black text-dark">Progreso</h2>
              <ol className="mt-5 grid gap-0">
                {timeline.map((step, index) => (
                  <li key={step.status} className="relative flex gap-3 pb-5 last:pb-0">
                    {index < timeline.length - 1 ? <span className={step.state === "done" ? "absolute left-[11px] top-6 h-full w-0.5 bg-teal" : "absolute left-[11px] top-6 h-full w-0.5 bg-border"} aria-hidden="true" /> : null}
                    {step.state === "done" ? <CheckCircle2 className="relative h-6 w-6 shrink-0 text-teal" aria-hidden="true" /> : step.state === "current" ? <CircleDot className="relative h-6 w-6 shrink-0 text-primary" aria-hidden="true" /> : <Circle className="relative h-6 w-6 shrink-0 text-border" aria-hidden="true" />}
                    <div>
                      <p className={step.state === "upcoming" ? "font-bold text-gray-text" : "font-extrabold text-dark"}>{step.label}{step.state === "current" ? <span className="sr-only"> (estado actual)</span> : null}</p>
                      {step.at ? <p className="text-xs text-gray-text">{formatDateTime(step.at)}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {order.deliveryMethod !== "PICKUP" ? (
              <section className="rounded-lg border border-border bg-white p-5 shadow-card sm:p-6" aria-label="Seguimiento del envío">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-display text-xl font-black text-dark"><Truck className="h-5 w-5 text-primary" aria-hidden="true" />Seguimiento del envío</h2>
                  {shipment?.provider === "mock" ? <span className="rounded-pill border border-dashed border-warning px-2.5 py-0.5 text-xs font-bold text-warning">Seguimiento de prueba</span> : null}
                </div>
                <figure className="relative mt-4 h-36 overflow-hidden rounded-md border border-border bg-surface-page sm:h-44">
                  <Image src="/images/info/despacho-repuestos.webp" alt="Repuestos HVAC embalados para despacho desde el almacén." fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
                  <figcaption className="absolute bottom-3 left-3 rounded-pill bg-brand-primary-900/85 px-3 py-1.5 text-[11px] font-bold text-white">Imagen referencial</figcaption>
                </figure>
                {shipment ? (
                  <>
                    <p className="mt-3 text-sm text-gray-text">{shipment.carrier} · Guía <span className="font-mono font-bold text-dark">{shipment.trackingNumber}</span>{shipment.estimatedDeliveryAt && shipment.status !== "DELIVERED" ? ` · Estimado ${formatDateTime(shipment.estimatedDeliveryAt)}` : ""}</p>
                    <ol className="mt-4 grid gap-3">
                      {[...shipmentEvents].reverse().map((event, index) => (
                        <li key={event.id} className={index === 0 ? "rounded-md border border-primary/30 bg-primary/5 p-3" : "rounded-md border border-border p-3"}>
                          <p className="text-sm font-extrabold text-dark">{event.description}</p>
                          <p className="text-xs text-gray-text">{formatDateTime(event.occurredAt)}{event.location ? ` · ${event.location}` : ""}</p>
                        </li>
                      ))}
                    </ol>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-gray-text">El número de guía aparecerá cuando el pedido salga de nuestro almacén.</p>
                )}
              </section>
            ) : null}

            <section className="rounded-lg border border-border bg-white p-5 shadow-card sm:p-6" aria-label="Productos">
              <h2 className="font-display text-xl font-black text-dark">Productos</h2>
              <ul className="mt-4 grid gap-3">
                {items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4 border-b border-border pb-3 text-sm last:border-0 last:pb-0">
                    <span className="min-w-0"><strong className="block text-dark">{item.productNameSnapshot}</strong><span className="font-mono text-xs text-gray-text">SKU {item.skuSnapshot} · {item.quantity} × {formatMoney(item.unitPrice, item.currency)}</span></span>
                    <span className="shrink-0 font-bold text-dark">{formatMoney(item.lineTotal, item.currency)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="grid h-fit gap-4">
            <section className="rounded-lg border border-border bg-white p-5 shadow-card" aria-label="Resumen">
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-text">Subtotal</dt><dd className="font-bold text-dark">{formatMoney(order.subtotal, order.currency)}</dd></div>
                {Number(order.discountAmount) > 0 ? <div className="flex justify-between"><dt className="text-gray-text">Descuento</dt><dd className="font-bold text-teal">−{formatMoney(order.discountAmount, order.currency)}</dd></div> : null}
                <div className="flex justify-between"><dt className="text-gray-text">Envío</dt><dd className="font-bold text-dark">{order.deliveryMethod === "PICKUP" ? "Sin costo" : "Por coordinar"}</dd></div>
                {tax.status === "CONFIGURED" ? <><div className="flex justify-between"><dt className="text-gray-text">Op. gravada</dt><dd className="font-bold text-dark">{formatMoney(tax.taxableOperation ?? "0.00", order.currency)}</dd></div><div className="flex justify-between"><dt className="text-gray-text">IGV {tax.rate}%</dt><dd className="font-bold text-dark">{formatMoney(tax.igv ?? "0.00", order.currency)}</dd></div></> : null}
                <div className="mt-2 flex justify-between border-t border-border pt-3"><dt className="font-bold text-dark">Total</dt><dd className="font-display text-xl font-black text-dark">{formatMoney(order.total, order.currency)}</dd></div>
              </dl>
              {tax.status === "CONFIGURED" ? <p className="mt-3 text-xs text-gray-text">Desglose tributario guardado con el pedido.</p> : null}
              <p className="mt-3 text-xs text-gray-text">Pago: <strong className="text-dark">{payment ? paymentStatusLabels[payment.status] ?? payment.status : "Pendiente"}</strong></p>
            </section>
            <section className="rounded-lg border border-border bg-white p-5 shadow-card" aria-label="Entrega">
              <h2 className="flex items-center gap-2 font-extrabold text-dark">{order.deliveryMethod === "PICKUP" ? <MapPin className="h-4 w-4 text-primary" aria-hidden="true" /> : <PackageCheck className="h-4 w-4 text-primary" aria-hidden="true" />}{deliveryMethodLabels[order.deliveryMethod] ?? order.deliveryMethod}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-text">{destination || "—"}</p>
              <p className="mt-3 text-xs text-gray-text">Contacto: {order.customerNameSnapshot} · {order.customerPhoneSnapshot}</p>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
