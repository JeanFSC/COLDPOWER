import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { paymentEvents, payments } from "@/db/sales-schema";
import type { PaymentCreateResult, PaymentProvider, PaymentRefundResult } from "@/lib/payments";

export const MOCK_PAYMENT_PROVIDER = "mock";

export type MockWebhookPayload = { eventId: string; reference: string; status: "APPROVED" | "REJECTED" | "CANCELLED" | "ERROR"; amount: string; currency: string };

export function signMockPayload(rawPayload: string, secret: string) {
  return createHmac("sha256", secret).update(rawPayload).digest("hex");
}

export function verifyMockSignature(rawPayload: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = Buffer.from(signMockPayload(rawPayload, secret), "hex");
  const received = Buffer.from(signature.trim(), "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

// Test gateway that behaves like a hosted checkout: it hands back a redirect URL, and the
// outcome arrives later as an HMAC-signed webhook processed by the same code path a real
// provider will use. It never moves money. Enabled only with PAYMENT_PROVIDER=mock.
export class MockPaymentProvider implements PaymentProvider {
  constructor(private readonly webhookSecret: string) {}

  async createPayment(): Promise<PaymentCreateResult> {
    const providerReference = `mock_${crypto.randomUUID()}`;
    return { provider: MOCK_PAYMENT_PROVIDER, providerReference, checkoutUrl: `/pago/prueba/${providerReference}` };
  }

  async getStatus(providerReference: string) {
    const [event] = await getDb()
      .select({ payload: paymentEvents.payload })
      .from(paymentEvents)
      .innerJoin(payments, eq(paymentEvents.paymentId, payments.id))
      .where(and(eq(payments.provider, MOCK_PAYMENT_PROVIDER), eq(payments.providerReference, providerReference)))
      .orderBy(desc(paymentEvents.createdAt))
      .limit(1);
    const status = typeof event?.payload?.status === "string" ? event.payload.status : "PENDING";
    return status === "APPROVED" ? "APPROVED" : status === "REJECTED" ? "REJECTED" : status === "CANCELLED" ? "CANCELLED" : status === "ERROR" ? "ERROR" : "PENDING";
  }

  async processWebhook(payload: string, signature: string | null) {
    if (!verifyMockSignature(payload, signature, this.webhookSecret)) throw new Error("Firma del pago de prueba inválida.");
    const parsed = JSON.parse(payload) as Partial<MockWebhookPayload>;
    const status = parsed.status;
    if (!parsed.eventId || !parsed.reference || !status || !["APPROVED", "REJECTED", "CANCELLED", "ERROR"].includes(status)) throw new Error("Evento de pago de prueba incompleto.");
    return {
      providerEventId: parsed.eventId,
      eventType: status === "APPROVED" ? "payment.approved" : status === "REJECTED" ? "payment.rejected" : status === "CANCELLED" ? "payment.cancelled" : "payment.error",
      providerReference: parsed.reference,
      status,
      metadata: { status, amount: parsed.amount ?? null, currency: parsed.currency ?? null, simulated: true },
    };
  }

  async refund(providerReference: string, amount?: string): Promise<PaymentRefundResult> {
    return { status: "SUCCEEDED", providerReference: `mock_refund_${crypto.randomUUID()}`, metadata: { simulated: true, originalReference: providerReference, amount: amount ?? null } };
  }
}
