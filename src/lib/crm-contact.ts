import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { customers, opportunities } from "@/db/crm-schema";

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/** Preserve the most recent contact, including concurrent or backdated activities. */
export async function recordCrmContact(tx: Transaction, customerId: string | null, opportunityId: string | null, at: Date) {
  if (customerId) await tx.update(customers).set({
    lastActivityAt: sql`greatest(${customers.lastActivityAt}, ${at.toISOString()}::timestamptz)`,
    updatedAt: new Date(),
  }).where(eq(customers.id, customerId));
  if (opportunityId) await tx.update(opportunities).set({
    lastContactAt: sql`greatest(${opportunities.lastContactAt}, ${at.toISOString()}::timestamptz)`,
    updatedAt: new Date(),
  }).where(eq(opportunities.id, opportunityId));
}
