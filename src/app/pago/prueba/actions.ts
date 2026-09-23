"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOptionalUserId } from "@/lib/auth";
import { commerceConfig } from "@/lib/env";
import { isMockPaymentProviderActive } from "@/lib/payments";
import { getOwnedMockPayment } from "@/lib/payments/mock-checkout";
import { signMockPayload } from "@/lib/payments/mock-provider";

async function appOrigin() {
  if (commerceConfig.internalAppUrl) return commerceConfig.internalAppUrl.replace(/\/$/, "");
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${protocol}://${host}`;
}

// Simulates the provider's result: signs an event exactly like a real gateway would and
// posts it to our webhook route, so the whole production payment path runs.
export async function simulateMockPayment(formData: FormData) {
  const reference = String(formData.get("reference") ?? "");
  const outcome = formData.get("outcome") === "APPROVED" ? "APPROVED" : "REJECTED";
  if (!isMockPaymentProviderActive() || !commerceConfig.mockPaymentWebhookSecret) redirect("/");
  const userId = await getOptionalUserId();
  if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/pago/prueba/${reference}`)}`);
  const owned = await getOwnedMockPayment(reference, userId);
  if (!owned) redirect("/cuenta/pedidos");
  const orderHref = `/cuenta/pedidos/${encodeURIComponent(owned.order.code)}`;
  if (owned.payment.status !== "PENDING" || owned.order.status !== "PAYMENT_PENDING") redirect(orderHref);

  const raw = JSON.stringify({ eventId: `mock-evt-${crypto.randomUUID()}`, reference, status: outcome, amount: owned.payment.amount, currency: owned.payment.currency });
  let delivered = false;
  try {
    const response = await fetch(`${await appOrigin()}/api/pagos/webhook/mock`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-payment-signature": signMockPayload(raw, commerceConfig.mockPaymentWebhookSecret) },
      body: raw,
      cache: "no-store",
    });
    delivered = response.ok;
    if (!delivered) console.error("ColdPower: el webhook de pago de prueba respondió", response.status, await response.text());
  } catch (error) {
    console.error("ColdPower: no se pudo enviar el webhook de pago de prueba", error);
  }
  redirect(delivered ? `${orderHref}?pago=${outcome === "APPROVED" ? "aprobado" : "rechazado"}` : `/pago/prueba/${reference}?error=webhook`);
}
