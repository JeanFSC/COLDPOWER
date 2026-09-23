import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, FlaskConical, ShieldCheck, XCircle } from "lucide-react";
import { getOptionalUserId } from "@/lib/auth";
import { isMockPaymentProviderActive } from "@/lib/payments";
import { getOwnedMockPayment } from "@/lib/payments/mock-checkout";
import { formatProductPrice } from "@/lib/formatters";
import { Button } from "@/components/shared/Button";
import { simulateMockPayment } from "@/app/pago/prueba/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pago de prueba", robots: { index: false, follow: false } };

type Props = { params: Promise<{ reference: string }>; searchParams: Promise<{ error?: string }> };

export default async function MockPaymentPage({ params, searchParams }: Props) {
  if (!isMockPaymentProviderActive()) notFound();
  const { reference } = await params;
  const { error } = await searchParams;
  const userId = await getOptionalUserId();
  if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/pago/prueba/${reference}`)}`);
  const owned = await getOwnedMockPayment(reference, userId);
  if (!owned) notFound();
  const { payment, order } = owned;
  const payable = payment.status === "PENDING" && order.status === "PAYMENT_PENDING" && (!order.paymentDueAt || order.paymentDueAt.getTime() > new Date().getTime());
  const orderHref = `/cuenta/pedidos/${encodeURIComponent(order.code)}`;

  return (
    <section className="bg-background py-10 sm:py-16">
      <div className="mx-auto max-w-xl px-4">
        <div className="flex items-start gap-3 rounded-lg border-2 border-dashed border-warning bg-warning/10 p-4 text-sm font-bold text-dark" role="note">
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <p>PAGO DE PRUEBA — no se realiza ningún cobro. Esta pantalla simula la pasarela hasta que se integre el proveedor real.</p>
        </div>
        <div className="mt-6 rounded-lg border border-border bg-white p-6 shadow-card sm:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Pasarela de prueba</p>
          <h1 className="mt-2 font-display text-3xl font-black text-dark">Pagar pedido {order.code}</h1>
          <p className="mt-6 text-sm text-gray-text">Monto a pagar</p>
          <p className="font-display text-4xl font-black text-dark">{formatProductPrice(Number(payment.amount), payment.currency)}</p>
          {order.paymentDueAt && payable ? <p className="mt-2 text-xs text-gray-text">Stock reservado hasta {new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", timeZone: "America/Lima" }).format(order.paymentDueAt)}.</p> : null}
          {error ? <p className="mt-4 rounded-md border border-danger/25 bg-danger/10 p-3 text-sm font-semibold text-danger" role="alert">No se pudo registrar el resultado del pago de prueba. Inténtalo nuevamente.</p> : null}

          {payable ? (
            <form action={simulateMockPayment} className="mt-7 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="reference" value={reference} />
              <Button type="submit" name="outcome" value="APPROVED" variant="primary" size="lg"><CheckCircle2 className="h-5 w-5" aria-hidden="true" />Aprobar pago</Button>
              <Button type="submit" name="outcome" value="REJECTED" variant="outline" size="lg"><XCircle className="h-5 w-5" aria-hidden="true" />Rechazar pago</Button>
            </form>
          ) : (
            <div className="mt-7 rounded-md border border-border bg-background p-4 text-sm text-dark">
              {order.status === "CANCELLED" ? "El plazo de pago de este pedido venció y fue cancelado." : payment.status === "PENDING" ? "Este pedido ya no está pendiente de pago." : "Este intento de pago ya fue procesado."}
              <Button href={orderHref} variant="primary" size="sm" className="mt-3">Ver pedido</Button>
            </div>
          )}
          <p className="mt-6 flex items-center gap-1.5 text-xs text-gray-text"><ShieldCheck className="h-4 w-4" aria-hidden="true" />El resultado llega a ColdPower como un evento firmado, igual que con la pasarela real.</p>
        </div>
      </div>
    </section>
  );
}
