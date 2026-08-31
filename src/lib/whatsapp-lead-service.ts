import { eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, products } from "@/db/schema";
import { customers, opportunities, opportunityItems, opportunityStageHistory } from "@/db/crm-schema";

type LeadInput = { name: string; phone: string; email?: string | null; title?: string | null; productIds?: string[]; quantities?: Record<string, number> };
function id(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
function clean(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

export async function createWhatsAppLead(input: LeadInput) {
  return getDb().transaction(async (tx) => {
    const email = clean(input.email, 180).toLowerCase() || null;
    const phone = clean(input.phone, 40);
    const name = clean(input.name, 160);
    if (!name || !phone) throw new Error("Nombre y teléfono son obligatorios para continuar por WhatsApp.");
    const conditions = [email ? eq(customers.email, email) : undefined, eq(customers.phone, phone)].filter(Boolean) as NonNullable<ReturnType<typeof eq>>[];
    const [existing] = conditions.length ? await tx.select().from(customers).where(or(...conditions)).limit(1) : [];
    const customer = existing ? (await tx.update(customers).set({ name, email: existing.email ?? email, phone: existing.phone ?? phone, whatsapp: existing.whatsapp ?? phone, status: "ACTIVE", updatedAt: new Date() }).where(eq(customers.id, existing.id)).returning())[0] : (await tx.insert(customers).values({ id: id("customer"), name, email, phone, whatsapp: phone, customerType: "CONSUMIDOR", status: "ACTIVE" }).returning())[0];
    const opportunityId = id("opportunity");
    const [opportunity] = await tx.insert(opportunities).values({ id: opportunityId, code: `OP-WA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, customerId: customer.id, title: clean(input.title, 180) || "Consulta por WhatsApp", origin: "WHATSAPP", stage: "NEW", createdBy: null }).returning();
    await tx.insert(opportunityStageHistory).values({ id: id("opportunity-stage"), opportunityId, fromStage: null, toStage: "NEW", changedBy: "anonymous", note: "Lead persistido antes de abrir WhatsApp" });
    const productIds = [...new Set((input.productIds ?? []).filter((productId) => /^[A-Za-z0-9:_-]{1,160}$/.test(productId)))].slice(0, 50);
    if (productIds.length) {
      const sourceProducts = await tx.select({ id: products.id, sku: products.sku, name: products.commercialName, normalizedName: products.normalizedName }).from(products);
      const byId = new Map(sourceProducts.map((product) => [product.id, product]));
      const items = productIds.flatMap((productId) => { const product = byId.get(productId); if (!product) return []; const quantity = Math.max(1, Math.min(999, Math.floor(Number(input.quantities?.[productId]) || 1))); return [{ id: id("opportunity-item"), opportunityId, productId, skuSnapshot: product.sku, productNameSnapshot: product.name || product.normalizedName, quantity }]; });
      if (items.length) await tx.insert(opportunityItems).values(items);
    }
    await tx.insert(auditLogs).values({ id: id("audit"), actorId: null, actorRole: "anonymous", action: "crm.whatsapp_lead_created", entityType: "opportunity", entityId: opportunity.id, before: null, after: { opportunityId: opportunity.id, customerId: customer.id, origin: "WHATSAPP" }, metadata: { productCount: productIds.length } });
    return { customer, opportunity };
  });
}
