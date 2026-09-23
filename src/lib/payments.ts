import { commerceConfig } from "@/lib/env";
import { MOCK_PAYMENT_PROVIDER, MockPaymentProvider } from "@/lib/payments/mock-provider";

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

// The name webhooks must arrive under; null when no provider is active.
export function getActivePaymentProviderName(): string | null {
  if (configuredProvider) return "configured";
  if (commerceConfig.paymentProvider === MOCK_PAYMENT_PROVIDER && commerceConfig.mockPaymentWebhookSecret) return MOCK_PAYMENT_PROVIDER;
  return null;
}

export function isMockPaymentProviderActive() {
  return !configuredProvider && getActivePaymentProviderName() === MOCK_PAYMENT_PROVIDER;
}

export function getPaymentProvider(): PaymentProvider {
  if (configuredProvider) return configuredProvider;
  if (isMockPaymentProviderActive()) return new MockPaymentProvider(commerceConfig.mockPaymentWebhookSecret!);
  return new UnconfiguredPaymentProvider();
}

export function configurePaymentProvider(provider: PaymentProvider) { configuredProvider = provider; }
