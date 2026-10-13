import { eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { users } from "@/db/schema";
import { customers } from "@/db/crm-schema";

type ProfileTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export async function loadProfileForUpdate(tx: ProfileTransaction, userId: string) {
  const [user] = await tx.select({ name: users.name, phone: users.phone }).from(users).where(eq(users.id, userId)).for("update").limit(1);
  if (!user) return null;
  const [customer] = await tx.select({
    id: customers.id,
    name: customers.name,
    phone: customers.phone,
    whatsapp: customers.whatsapp,
    legalName: customers.legalName,
    address: customers.address,
    contactPreference: customers.contactPreference,
  }).from(customers).where(eq(customers.userId, userId)).for("update").limit(1);
  return {
    userName: user.name,
    userPhone: user.phone,
    customerId: customer?.id ?? null,
    customerName: customer?.name ?? null,
    customerPhone: customer?.phone ?? null,
    customerWhatsapp: customer?.whatsapp ?? null,
    companyName: customer?.legalName ?? null,
    customerAddress: customer?.address ?? null,
    contactPreference: customer?.contactPreference ?? null,
  };
}
