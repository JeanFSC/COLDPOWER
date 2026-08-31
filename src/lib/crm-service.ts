import { and, eq, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, products, quotes, users } from "@/db/schema";
import { crmActivities, crmTasks, customerQuoteLinks, customers, opportunities, opportunityFollowups, opportunityItems, opportunityStageHistory } from "@/db/crm-schema";
import { assertOpportunityTransition, type ActivityType, type CustomerType, type OpportunityOrigin, type OpportunityStage, type TaskStatus } from "@/lib/crm-validation";
import { notifyStaffOnce } from "@/lib/notifications-service";

import { ne, or } from "drizzle-orm";

type Actor = { userId: string; role: string };
export class CrmDomainError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = "CrmDomainError";
  }
}

function id(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
function audit(actor: Actor, action: string, entityType: string, entityId: string, before: unknown, after: unknown, metadata?: Record<string, unknown>) { return { id: id("audit"), actorId: actor.userId, actorRole: actor.role, action, entityType, entityId, before: before as Record<string, unknown> | null, after: after as Record<string, unknown> | null, metadata: metadata ?? null }; }

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

async function assertCustomerReferences(tx: Transaction, input: { assignedSellerId?: string | null; userId?: string | null }) {
  if (input.assignedSellerId) {
    const [seller] = await tx.select({ id: users.id, status: users.status }).from(users).where(eq(users.id, input.assignedSellerId)).limit(1);
    if (!seller || seller.status !== "ACTIVE") throw new CrmDomainError("CUSTOMER_SELLER_INVALID", "El vendedor asignado no existe o no está activo.", 422);
  }
  if (input.userId) {
    const [linkedUser] = await tx.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).limit(1);
    if (!linkedUser) throw new CrmDomainError("CUSTOMER_USER_INVALID", "El usuario vinculado no existe. Usa el userId local de Clerk.", 422);
  }
}

async function assertCustomerDuplicate(tx: Transaction, input: { email?: string | null; phone?: string | null; documentNumber?: string | null; ruc?: string | null }, customerId?: string) {
  const duplicateConditions = [
    input.email ? eq(customers.email, input.email) : undefined,
    input.phone ? eq(customers.phone, input.phone) : undefined,
    input.documentNumber ? eq(customers.documentNumber, input.documentNumber) : undefined,
    input.ruc ? eq(customers.ruc, input.ruc) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  if (!duplicateConditions.length) return;
  const conditions = customerId ? and(or(...duplicateConditions), ne(customers.id, customerId)) : or(...duplicateConditions);
  const [duplicate] = await tx.select({ id: customers.id }).from(customers).where(conditions).limit(1);
  if (duplicate) throw new CrmDomainError("CUSTOMER_DUPLICATE", "Ya existe un cliente con el mismo correo, teléfono, documento o RUC.", 409);
}

export async function createCustomer(input: { name: string; userId?: string | null; legalName?: string | null; documentNumber?: string | null; ruc?: string | null; phone?: string | null; whatsapp?: string | null; email?: string | null; address?: string | null; location?: string | null; customerType?: CustomerType; status?: "ACTIVE" | "INACTIVE" | "PROSPECT"; assignedSellerId?: string | null; notes?: string | null }, actor: Actor) {
  return getDb().transaction(async (tx) => {
    await assertCustomerReferences(tx, input);
    await assertCustomerDuplicate(tx, input);
    const customer = { id: id("customer"), ...input, name: input.name, customerType: input.customerType ?? "CONSUMIDOR", status: input.status ?? "PROSPECT", createdAt: new Date(), updatedAt: new Date() };
    const [created] = await tx.insert(customers).values(customer).returning();
    await tx.insert(auditLogs).values(audit(actor, "crm.customer_created", "customer", created.id, null, created));
    return created;
  });
}

export async function updateCustomer(customerId: string, input: Partial<typeof customers.$inferInsert>, actor: Actor, reason?: string) {
  return getDb().transaction(async (tx) => {
    const [before] = await tx.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!before) throw new CrmDomainError("CUSTOMER_NOT_FOUND", "Cliente no encontrado.", 404);
    if (!reason?.trim()) throw new CrmDomainError("CUSTOMER_REASON_REQUIRED", "Debes indicar el motivo del cambio.", 422);
    await assertCustomerReferences(tx, input);
    await assertCustomerDuplicate(tx, input, customerId);
    const [after] = await tx.update(customers).set({ ...input, updatedAt: new Date() }).where(eq(customers.id, customerId)).returning();
    await tx.insert(auditLogs).values(audit(actor, "crm.customer_updated", "customer", customerId, before, after, { reason: reason.trim().slice(0, 500) }));
    return after;
  });
}

export async function createOpportunity(input: { customerId: string; quoteId?: string | null; title: string; origin: OpportunityOrigin; stage: OpportunityStage; assignedSellerId?: string | null; nextAction?: string | null; followUpAt?: Date | null; notes?: string | null; createdBy?: string | null }, actor: Actor, itemIds: string[] = []) {
  return getDb().transaction(async (tx) => {
    const [customer] = await tx.select().from(customers).where(eq(customers.id, input.customerId)).limit(1);
    if (!customer) throw new Error("Cliente no encontrado.");
    const code = `OP-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const opportunity = { id: id("opportunity"), code, ...input, createdAt: new Date(), updatedAt: new Date() };
    const [created] = await tx.insert(opportunities).values(opportunity).returning();
    await tx.insert(opportunityStageHistory).values({ id: id("opportunity-stage"), opportunityId: created.id, fromStage: null, toStage: created.stage, changedBy: actor.userId, note: "Oportunidad creada" });
    if (itemIds.length) {
      const sourceProducts = await tx.select({ id: products.id, sku: products.sku, name: products.normalizedName }).from(products);
      const byId = new Map(sourceProducts.map((product) => [product.id, product]));
      const rows = itemIds.flatMap((productId) => { const product = byId.get(productId); return product ? [{ id: id("opportunity-item"), opportunityId: created.id, productId: product.id, skuSnapshot: product.sku, productNameSnapshot: product.name, quantity: 1 }] : []; });
      if (rows.length) await tx.insert(opportunityItems).values(rows);
    }
    await tx.insert(auditLogs).values(audit(actor, "crm.opportunity_created", "opportunity", created.id, null, created, { itemIds }));
    return created;
  });
}

export async function changeOpportunityStage(opportunityId: string, nextStage: OpportunityStage, actor: Actor, note?: string, followUpAt?: Date | null, nextAction?: string | null) {
  return getDb().transaction(async (tx) => {
    const [before] = await tx.select().from(opportunities).where(eq(opportunities.id, opportunityId)).limit(1);
    if (!before) throw new CrmDomainError("OPPORTUNITY_NOT_FOUND", "Oportunidad no encontrada.", 404);
    assertOpportunityTransition(before.stage, nextStage);
    const now = new Date();
    const [after] = await tx.update(opportunities).set({ stage: nextStage, lastContactAt: now, nextAction: nextAction === undefined ? before.nextAction : nextAction?.trim().slice(0, 240) || null, followUpAt: followUpAt === undefined ? before.followUpAt : followUpAt, updatedAt: now }).where(eq(opportunities.id, opportunityId)).returning();
    await tx.insert(opportunityStageHistory).values({ id: id("opportunity-stage"), opportunityId, fromStage: before.stage, toStage: nextStage, changedBy: actor.userId, note: note?.trim().slice(0, 500) || null });
    if (nextStage === "FOLLOW_UP" && followUpAt) {
      await tx.insert(opportunityFollowups).values({ id: id("opportunity-followup"), opportunityId, title: nextAction?.trim().slice(0, 180) || "Seguimiento comercial", dueAt: followUpAt, status: "PENDING", assignedTo: before.assignedSellerId, createdBy: actor.userId });
    }
    await tx.insert(auditLogs).values(audit(actor, "crm.opportunity_stage_changed", "opportunity", opportunityId, before, after, { fromStage: before.stage, toStage: nextStage, followUpAt: followUpAt ?? null, nextAction: nextAction ?? null }));
    return after;
  });
}

type CrmRelationInput = { customerId?: string | null; opportunityId?: string | null; quoteId?: string | null };

async function resolveCrmCustomer(tx: Transaction, input: CrmRelationInput) {
  let resolvedCustomerId = input.customerId ?? null;
  if (resolvedCustomerId) {
    const [customer] = await tx.select({ id: customers.id }).from(customers).where(eq(customers.id, resolvedCustomerId)).limit(1);
    if (!customer) throw new CrmDomainError("CRM_CUSTOMER_NOT_FOUND", "El cliente relacionado no existe.", 404);
  }
  if (input.opportunityId) {
    const [opportunity] = await tx.select({ id: opportunities.id, customerId: opportunities.customerId }).from(opportunities).where(eq(opportunities.id, input.opportunityId)).limit(1);
    if (!opportunity) throw new CrmDomainError("CRM_OPPORTUNITY_NOT_FOUND", "La oportunidad relacionada no existe.", 404);
    if (resolvedCustomerId && resolvedCustomerId !== opportunity.customerId) throw new CrmDomainError("CRM_RELATION_MISMATCH", "La oportunidad no pertenece al cliente indicado.", 422);
    resolvedCustomerId = opportunity.customerId;
  }
  if (input.quoteId) {
    const [quote] = await tx.select({ id: quotes.id }).from(quotes).where(eq(quotes.id, input.quoteId)).limit(1);
    if (!quote) throw new CrmDomainError("CRM_QUOTE_NOT_FOUND", "La cotización relacionada no existe.", 404);
    const [link] = await tx.select({ customerId: customerQuoteLinks.customerId }).from(customerQuoteLinks).where(eq(customerQuoteLinks.quoteId, input.quoteId)).limit(1);
    if (link) {
      if (resolvedCustomerId && resolvedCustomerId !== link.customerId) throw new CrmDomainError("CRM_RELATION_MISMATCH", "La cotización no pertenece al cliente indicado.", 422);
      resolvedCustomerId = link.customerId;
    }
  }
  return resolvedCustomerId;
}

export async function createActivity(input: { customerId?: string | null; opportunityId?: string | null; quoteId?: string | null; type: ActivityType; subject: string; body?: string | null; dueAt?: Date | null; completedAt?: Date | null; idempotencyKey?: string | null }, actor: Actor) {
  return getDb().transaction(async (tx) => {
    if (input.idempotencyKey) {
      const [existing] = await tx.select().from(crmActivities).where(eq(crmActivities.idempotencyKey, input.idempotencyKey)).limit(1);
      if (existing) return { activity: existing, idempotent: true };
    }
    const customerId = await resolveCrmCustomer(tx, input);
    const [created] = await tx.insert(crmActivities).values({ id: id("activity"), ...input, customerId, performedBy: actor.userId }).returning();
    if (customerId) await tx.update(customers).set({ lastActivityAt: created.createdAt, updatedAt: new Date() }).where(eq(customers.id, customerId));
    await tx.insert(auditLogs).values(audit(actor, "crm.activity_created", "crm_activity", created.id, null, created));
    return { activity: created, idempotent: false };
  });
}

export async function createTask(input: { customerId?: string | null; opportunityId?: string | null; quoteId?: string | null; title: string; description?: string | null; status?: TaskStatus; assignedTo?: string | null; dueAt?: Date | null; idempotencyKey?: string | null }, actor: Actor) {
  return getDb().transaction(async (tx) => {
    if (input.idempotencyKey) {
      const [existing] = await tx.select().from(crmTasks).where(eq(crmTasks.idempotencyKey, input.idempotencyKey)).limit(1);
      if (existing) return { task: existing, idempotent: true };
    }
    const customerId = await resolveCrmCustomer(tx, input);
    const [created] = await tx.insert(crmTasks).values({ id: id("task"), ...input, customerId, status: input.status ?? "PENDING", createdBy: actor.userId }).returning();
    if (customerId) await tx.update(customers).set({ lastActivityAt: created.createdAt, updatedAt: new Date() }).where(eq(customers.id, customerId));
    await tx.insert(auditLogs).values(audit(actor, "crm.task_created", "crm_task", created.id, null, created));
    return { task: created, idempotent: false };
  });
}

export async function notifyOverdueFollowUps() {
  const now = new Date();
  const overdue = await getDb().select({ id: crmTasks.id, title: crmTasks.title, dueAt: crmTasks.dueAt, opportunityId: crmTasks.opportunityId }).from(crmTasks).where(and(eq(crmTasks.status, "PENDING"), lt(crmTasks.dueAt, now))).limit(200);
  for (const task of overdue) {
    try { await notifyStaffOnce({ type: "FOLLOW_UP_OVERDUE", title: "Seguimiento vencido", body: `La tarea ${task.title} está vencida.`, link: "/admin/crm", metadata: { taskId: task.id, opportunityId: task.opportunityId, dueAt: task.dueAt }, dedupeKey: `crm-task:${task.id}:overdue` }); }
    catch (error) { console.error("ColdPower: no se pudo notificar seguimiento vencido", error); }
  }
  return overdue.length;
}
export async function updateTaskStatus(taskId: string, status: TaskStatus, actor: Actor) {
  return getDb().transaction(async (tx) => {
    const [before] = await tx.select().from(crmTasks).where(eq(crmTasks.id, taskId)).limit(1);
    if (!before) throw new CrmDomainError("CRM_TASK_NOT_FOUND", "Tarea no encontrada.", 404);
    const [after] = await tx.update(crmTasks).set({ status, completedAt: status === "COMPLETED" ? new Date() : null, updatedAt: new Date() }).where(eq(crmTasks.id, taskId)).returning();
    if (before.customerId) await tx.update(customers).set({ lastActivityAt: after.updatedAt, updatedAt: new Date() }).where(eq(customers.id, before.customerId));
    await tx.insert(auditLogs).values(audit(actor, "crm.task_status_changed", "crm_task", taskId, before, after));
    return after;
  });
}

export async function ensureLeadFromQuote(quoteId: string, actorId: string | null) {
  return getDb().transaction(async (tx) => {
    const [quote] = await tx.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
    if (!quote) throw new Error("Cotización no encontrada.");
    const [existingLink] = await tx.select().from(customerQuoteLinks).where(eq(customerQuoteLinks.quoteId, quoteId)).limit(1);
    if (existingLink) return existingLink;
    const [existingCustomer] = await tx.select().from(customers).where(and(eq(customers.email, quote.email ?? ""), eq(customers.phone, quote.phone))).limit(1);
    const customerId = existingCustomer?.id ?? id("customer");
    const customer = existingCustomer ?? (await tx.insert(customers).values({ id: customerId, userId: quote.userId, name: quote.name, documentNumber: quote.documentNumber || null, phone: quote.phone, whatsapp: quote.phone, email: quote.email, location: [quote.department, quote.province, quote.district].filter(Boolean).join(" / ") || null, customerType: quote.customerType === "company" ? "EMPRESA" : "CONSUMIDOR", status: "PROSPECT" }).returning())[0];
    const opportunityId = id("opportunity");
    const opportunity = (await tx.insert(opportunities).values({ id: opportunityId, code: `OP-${quote.trackingCode}`, customerId: customer.id, quoteId, title: quote.productName ? `Cotización: ${quote.productName}` : "Solicitud de cotización", origin: "WEB", stage: "NEW", createdBy: actorId }).returning())[0];
    await tx.insert(opportunityStageHistory).values({ id: id("opportunity-stage"), opportunityId, fromStage: null, toStage: "NEW", changedBy: actorId ?? "anonymous", note: "Lead creado desde cotización" });
    const link = (await tx.insert(customerQuoteLinks).values({ id: id("quote-link"), customerId: customer.id, quoteId, opportunityId }).returning())[0];
    await tx.insert(auditLogs).values({ id: id("audit"), actorId: actorId, actorRole: "system", action: "crm.lead_created_from_quote", entityType: "quote", entityId: quoteId, before: null, after: { customer, opportunity, link }, metadata: null });
    return link;
  });
}


