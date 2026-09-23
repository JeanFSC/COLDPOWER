import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { customers } from "@/db/crm-schema";
import { orders, payments } from "@/db/sales-schema";
import { MOCK_PAYMENT_PROVIDER } from "@/lib/payments/mock-provider";

// The mock hosted-checkout page may only be opened by the owner of the order it charges.
export async function getOwnedMockPayment(reference: string, userId: string) {
  const [row] = await getDb()
    .select({ payment: payments, order: orders })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(and(eq(payments.provider, MOCK_PAYMENT_PROVIDER), eq(payments.providerReference, reference), or(eq(orders.userId, userId), eq(customers.userId, userId))))
    .limit(1);
  return row ?? null;
}
