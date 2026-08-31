export type PaymentCreateInput = { orderId: string; amount: string; currency: string; returnUrl?: string };
export type PaymentCreateResult = { provider: string; providerReference: string; checkoutUrl: string };
export type PaymentRefundResult = { status: "SUCCEEDED" | "PENDING" | "FAILED"; providerReference?: string; metadata?: Record<string, unknown> };

export interface PaymentProvider {
  createPayment(input: PaymentCreateInput): Promise<PaymentCreateResult>;
  getStatus(providerReference: string): Promise<"PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "REFUNDED" | "ERROR">;
  processWebhook(payload: string, signature: string | null): Promise<{ providerEventId: string; eventType: string; providerReference: string; status: string; metadata: Record<string, unknown> }>;
  refund(providerReference: string, amount?: string): Promise<PaymentRefundResult>;
}

export class UnconfiguredPaymentProvider implements PaymentProvider {
  async createPayment(): Promise<PaymentCreateResult> { throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED"); }
  async getStatus(): Promise<"ERROR"> { throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED"); }
  async processWebhook(): Promise<never> { throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED"); }
  async refund(): Promise<never> { throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED"); }
}

let configuredProvider: PaymentProvider | null = null;
export function getPaymentProvider(): PaymentProvider { return configuredProvider ?? new UnconfiguredPaymentProvider(); }
export function configurePaymentProvider(provider: PaymentProvider) { configuredProvider = provider; }
