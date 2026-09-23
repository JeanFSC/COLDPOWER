import { and, asc, eq, ilike, inArray, lt, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, products, quotes, users } from "@/db/schema";
import { crmActivities, crmAttachments, crmTasks, customerAddresses, customerContacts, customerNotes, customerQuoteLinks, customers, opportunities, opportunityFollowups, opportunityItems, opportunityStageHistory } from "@/db/crm-schema";
import { assertOpportunityTransition, contactActivityTypes, type ActivityType, type CustomerType, type OpportunityCurrency, type OpportunityItemInput, type OpportunityOrigin, type OpportunityStage, type TaskStatus } from "@/lib/crm-validation";
import { notifyStaffOnce } from "@/lib/notifications-service";
import { activeCommercialStages, postSaleOpportunityStages, sellerRoleCodes } from "@/lib/opportunity-stage-config";

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
    const [seller] = await tx.select({ id: users.id, status: users.status, roleCode: users.roleCode }).from(users).where(eq(users.id, input.assignedSellerId)).limit(1);
    if (!seller || seller.status !== "ACTIVE" || !seller.roleCode || !(sellerRoleCodes as readonly string[]).includes(seller.roleCode)) throw new CrmDomainError("CUSTOMER_SELLER_INVALID", "El vendedor asignado no existe, no está activo o no tiene un rol comercial compatible.", 422);
  }
  if (input.userId) {
    const [linkedUser] = await tx.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).limit(1);
    if (!linkedUser) throw new CrmDomainError("CUSTOMER_USER_INVALID", "El usuario vinculado no existe. Usa el userId local de Clerk.", 422);
  }
}

function moneyToCents(value: string | null | undefined) {
  if (value == null || value === "") return null;
  return Math.round(Number(value) * 100);
}

function centsToMoney(value: number) {
  return (value / 100).toFixed(2);
}

function normalizedOpportunityItems(input: { items?: OpportunityItemInput[]; itemIds?: string[] }) {
  if (input.items?.length) return input.items;
  return [...new Set((input.itemIds ?? []).filter((productId) => typeof productId === "string" && productId.trim()))].map((productId) => ({ productId, quantity: 1, unitPrice: null, currency: null } satisfies OpportunityItemInput));
}

async function refreshOpportunityFollowUpSnapshot(tx: Transaction, opportunityId: string) {
  const [followup] = await tx.select({ title: opportunityFollowups.title, dueAt: opportunityFollowups.dueAt }).from(opportunityFollowups).where(and(eq(opportunityFollowups.opportunityId, opportunityId), eq(opportunityFollowups.status, "PENDING"))).orderBy(asc(opportunityFollowups.dueAt)).limit(1);
  await tx.update(opportunities).set({ followUpAt: followup?.dueAt ?? null, nextAction: followup?.title ?? null, updatedAt: new Date() }).where(eq(opportunities.id, opportunityId));
  return followup ?? null;
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

export async function createCustomer(input: { name: string; userId?: string | null; legalName?: string | null; documentNumber?: string | null; ruc?: string | null; phone?: string | null; whatsapp?: string | null; email?: string | null; address?: string | null; location?: string | null; contactPreference?: string | null; customerType?: CustomerType; status?: "ACTIVE" | "INACTIVE" | "PROSPECT"; assignedSellerId?: string | null; notes?: string | null; duplicateOverrideReason?: string | null; primaryContact?: { name?: string | null; role?: string | null; email?: string | null; phone?: string | null; whatsapp?: string | null } | null; primaryAddress?: { label?: string | null; address?: string | null } | null }, actor: Actor) {
  return getDb().transaction(async (tx) => {
    await assertCustomerReferences(tx, input);
    if (!input.duplicateOverrideReason?.trim()) await assertCustomerDuplicate(tx, input);
    const { duplicateOverrideReason, primaryContact, primaryAddress, ...customerInput } = input;
    const customer = { id: id("customer"), ...customerInput, name: input.name, customerType: input.customerType ?? "CONSUMIDOR", status: input.status ?? "PROSPECT", createdAt: new Date(), updatedAt: new Date() };
    const [created] = await tx.insert(customers).values(customer).returning();
    await tx.insert(auditLogs).values(audit(actor, "customer.created", "customer", created.id, null, created, duplicateOverrideReason?.trim() ? { duplicateOverrideReason: duplicateOverrideReason.trim().slice(0, 500) } : undefined));
    if (primaryContact?.name?.trim()) {
      const [contact] = await tx.insert(customerContacts).values({
        id: id("customer-contact"),
        customerId: created.id,
        name: primaryContact.name.trim().slice(0, 160),
        role: primaryContact.role?.trim().slice(0, 120) || null,
        email: primaryContact.email?.trim().toLowerCase().slice(0, 180) || null,
        phone: primaryContact.phone?.replace(/\D/g, "").slice(0, 20) || null,
        whatsapp: primaryContact.whatsapp?.replace(/\D/g, "").slice(0, 20) || null,
        isPrimary: true,
      }).returning();
      await tx.insert(auditLogs).values(audit(actor, "customer.contact_added", "customer", created.id, null, contact));
    }
    if (primaryAddress?.label?.trim() && primaryAddress.address?.trim()) {
      const [address] = await tx.insert(customerAddresses).values({
        id: id("customer-address"),
        customerId: created.id,
        label: primaryAddress.label.trim().slice(0, 80),
        address: primaryAddress.address.trim().slice(0, 300),
        isPrimary: true,
      }).returning();
      await tx.insert(auditLogs).values(audit(actor, "customer.address_added", "customer", created.id, null, address));
    }
    if (input.notes?.trim()) {
      const [note] = await tx.insert(customerNotes).values({
        id: id("customer-note"),
        customerId: created.id,
        body: input.notes.trim().slice(0, 3000),
        createdBy: actor.userId,
      }).returning();
      await tx.insert(auditLogs).values(audit(actor, "customer.note_added", "customer", created.id, null, { id: note.id, createdAt: note.createdAt }));
    }
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
    await tx.insert(auditLogs).values(audit(actor, "customer.updated", "customer", customerId, before, after, { reason: reason.trim().slice(0, 500) }));
    return after;
  });
}

export type OpportunityCreationInput = {
  customerId: string;
  quoteId?: string | null;
  title: string;
  origin: OpportunityOrigin;
  stage: OpportunityStage;
  assignedSellerId?: string | null;
  nextAction?: string | null;
  followUpAt?: Date | null;
  notes?: string | null;
  createdBy?: string | null;
  totalAmount?: string | null;
  currency?: OpportunityCurrency | null;
  items?: OpportunityItemInput[];
  itemIds?: string[];
};

export async function createOpportunity(input: OpportunityCreationInput, actor: Actor, legacyItemIds: string[] = []) {
  return getDb().transaction(async (tx) => {
    const [customer] = await tx.select().from(customers).where(eq(customers.id, input.customerId)).limit(1);
    if (!customer) throw new CrmDomainError("CUSTOMER_NOT_FOUND", "Cliente no encontrado.", 404);
    if (!(activeCommercialStages as readonly string[]).includes(input.stage)) throw new CrmDomainError("OPPORTUNITY_STAGE_NOT_CREATABLE", "Una oportunidad nueva debe permanecer en una etapa comercial activa.", 422);
    await assertCustomerReferences(tx, { assignedSellerId: input.assignedSellerId });

    const requestedItems = normalizedOpportunityItems({ items: input.items, itemIds: input.itemIds?.length ? input.itemIds : legacyItemIds });
    if (input.followUpAt && !input.nextAction?.trim()) throw new CrmDomainError("FOLLOW_UP_DATA_REQUIRED", "La fecha de seguimiento necesita una próxima acción.", 422);
    const productIds = requestedItems.map((item) => item.productId);
    const sourceProducts = productIds.length
      ? await tx.select({ id: products.id, sku: products.sku, name: products.normalizedName }).from(products).where(inArray(products.id, productIds))
      : [];
    const byId = new Map(sourceProducts.map((product) => [product.id, product]));
    const missingProduct = productIds.find((productId) => !byId.has(productId));
    if (missingProduct) throw new CrmDomainError("OPPORTUNITY_PRODUCT_NOT_FOUND", "Uno de los productos seleccionados ya no existe en el catálogo.", 422);

    const itemCurrency = requestedItems.find((item) => item.currency)?.currency ?? null;
    const currency = input.currency ?? itemCurrency;
    const itemRows = requestedItems.map((item) => {
      const rowCurrency = item.currency ?? currency;
      if (rowCurrency && currency && rowCurrency !== currency) throw new CrmDomainError("OPPORTUNITY_CURRENCY_MISMATCH", "Los productos deben usar la misma moneda de la oportunidad.", 422);
      if (item.unitPrice != null && !rowCurrency) throw new CrmDomainError("OPPORTUNITY_ITEM_CURRENCY_REQUIRED", "La moneda es obligatoria cuando un producto tiene precio.", 422);
      const unitCents = moneyToCents(item.unitPrice);
      const product = byId.get(item.productId)!;
      return { id: id("opportunity-item"), opportunityId: "", productId: item.productId, skuSnapshot: product.sku, productNameSnapshot: product.name, quantity: item.quantity, unitPrice: item.unitPrice, currency: rowCurrency, lineTotal: unitCents == null ? null : centsToMoney(unitCents * item.quantity) };
    });
    const calculatedTotal = itemRows.length && itemRows.every((item) => item.lineTotal != null)
      ? centsToMoney(itemRows.reduce((sum, item) => sum + (moneyToCents(item.lineTotal) ?? 0), 0))
      : null;
    const totalAmount = input.totalAmount ?? calculatedTotal;
    if (totalAmount != null && !currency) throw new CrmDomainError("OPPORTUNITY_CURRENCY_REQUIRED", "La moneda es obligatoria cuando se indica un monto.", 422);

    const now = new Date();
    const code = `OP-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const opportunity = { id: id("opportunity"), code, customerId: input.customerId, quoteId: input.quoteId ?? null, title: input.title, origin: input.origin, stage: input.stage, assignedSellerId: input.assignedSellerId ?? null, totalAmount, currency, nextAction: input.nextAction ?? null, followUpAt: input.followUpAt ?? null, notes: input.notes ?? null, createdBy: input.createdBy ?? actor.userId, createdAt: now, updatedAt: now };
    const [created] = await tx.insert(opportunities).values(opportunity).returning();
    if (itemRows.length) await tx.insert(opportunityItems).values(itemRows.map((item) => ({ ...item, opportunityId: created.id })));
    if (input.followUpAt && input.nextAction?.trim()) {
      await tx.insert(opportunityFollowups).values({ id: id("opportunity-followup"), opportunityId: created.id, title: input.nextAction.trim().slice(0, 180), dueAt: input.followUpAt, status: "PENDING", assignedTo: input.assignedSellerId ?? null, createdBy: actor.userId });
      await refreshOpportunityFollowUpSnapshot(tx, created.id);
    }
    await tx.insert(opportunityStageHistory).values({ id: id("opportunity-stage"), opportunityId: created.id, fromStage: null, toStage: created.stage, changedBy: actor.userId, note: "Oportunidad creada" });
    await tx.insert(auditLogs).values(audit(actor, "crm.opportunity_created", "opportunity", created.id, null, created, { itemCount: itemRows.length, currency, totalAmount }));
    return created;
  });
}

type StageChangeDetails = { lostReason?: string | null; cancellationReason?: string | null; attempts?: number | null };

export async function changeOpportunityStage(opportunityId: string, nextStage: OpportunityStage, actor: Actor, note?: string, followUpAt?: Date | null, nextAction?: string | null, details: StageChangeDetails = {}) {
  return getDb().transaction(async (tx) => {
    const [before] = await tx.select().from(opportunities).where(eq(opportunities.id, opportunityId)).limit(1);
    if (!before) throw new CrmDomainError("OPPORTUNITY_NOT_FOUND", "Oportunidad no encontrada.", 404);
    try {
      assertOpportunityTransition(before.stage, nextStage);
    } catch {
      throw new CrmDomainError("OPPORTUNITY_TRANSITION_INVALID", `No puedes mover esta oportunidad directamente de ${before.stage} a ${nextStage}.`, 422);
    }
    if (nextStage === "SALE") throw new CrmDomainError("OPPORTUNITY_SALE_REQUIRES_CONVERSION", "La venta se registra mediante la conversión explícita de una cotización.", 422);
    if ((postSaleOpportunityStages as readonly string[]).includes(nextStage) || nextStage === "CLOSED") throw new CrmDomainError("OPPORTUNITY_OPERATIONS_ONLY", "Las etapas posventa solo se actualizan desde Operaciones.", 422);
    if (nextStage === "QUOTE_SENT") {
      const [quote] = before.quoteId
        ? await tx.select({ id: quotes.id }).from(quotes).where(eq(quotes.id, before.quoteId)).limit(1)
        : [];
      if (!quote) throw new CrmDomainError("QUOTE_REQUIRED", "Vincula una cotización antes de marcarla como enviada.", 422);
    }
    const action = nextAction === undefined ? before.nextAction : nextAction?.trim().slice(0, 240) || null;
    if (nextStage === "FOLLOW_UP" && (!followUpAt || !action || !note?.trim())) throw new CrmDomainError("FOLLOW_UP_DATA_REQUIRED", "El seguimiento necesita acción, fecha y nota.", 422);
    if (nextStage === "LOST" && !details.lostReason?.trim()) throw new CrmDomainError("LOST_REASON_REQUIRED", "Debes indicar el motivo de pérdida.", 422);
    if (nextStage === "CANCELLED" && !details.cancellationReason?.trim()) throw new CrmDomainError("CANCELLATION_REASON_REQUIRED", "Debes indicar el motivo de cancelación.", 422);
    if (nextStage === "ACCEPTED") {
      const [item] = await tx.select({ id: opportunityItems.id }).from(opportunityItems).where(eq(opportunityItems.opportunityId, opportunityId)).limit(1);
      if (!before.assignedSellerId || !before.totalAmount || !before.currency || !item) throw new CrmDomainError("ACCEPTED_DATA_REQUIRED", "Para aceptar la oportunidad necesitas responsable, monto, moneda y al menos un producto.", 422);
    }
    const now = new Date();
    const reason = nextStage === "LOST" ? details.lostReason?.trim().slice(0, 500) : nextStage === "CANCELLED" ? `Cancelación: ${details.cancellationReason?.trim().slice(0, 480)}` : undefined;
    const [after] = await tx.update(opportunities).set({ stage: nextStage, lostReason: reason === undefined ? before.lostReason : reason, nextAction: action, followUpAt: followUpAt === undefined ? before.followUpAt : followUpAt, updatedAt: now }).where(eq(opportunities.id, opportunityId)).returning();
    if (nextStage === "FOLLOW_UP" && followUpAt) {
      await tx.insert(opportunityFollowups).values({ id: id("opportunity-followup"), opportunityId, title: action!, dueAt: followUpAt, status: "PENDING", assignedTo: before.assignedSellerId, createdBy: actor.userId });
    }
    await refreshOpportunityFollowUpSnapshot(tx, opportunityId);
    await tx.insert(opportunityStageHistory).values({ id: id("opportunity-stage"), opportunityId, fromStage: before.stage, toStage: nextStage, changedBy: actor.userId, note: note?.trim().slice(0, 500) || null });
    await tx.insert(auditLogs).values(audit(actor, "crm.opportunity_stage_changed", "opportunity", opportunityId, before, after, { fromStage: before.stage, toStage: nextStage, followUpAt: followUpAt ?? null, nextAction: action, lostReason: details.lostReason ?? null, cancellationReason: details.cancellationReason ?? null, attempts: details.attempts ?? null }));
    return after;
  });
}

export async function createOpportunityFollowup(input: { opportunityId: string; title: string; dueAt: Date; assignedTo?: string | null }, actor: Actor) {
  return getDb().transaction(async (tx) => {
    const [opportunity] = await tx.select({ id: opportunities.id }).from(opportunities).where(eq(opportunities.id, input.opportunityId)).limit(1);
    if (!opportunity) throw new CrmDomainError("OPPORTUNITY_NOT_FOUND", "Oportunidad no encontrada.", 404);
    if (!input.title.trim() || Number.isNaN(input.dueAt.getTime())) throw new CrmDomainError("FOLLOW_UP_INVALID", "El seguimiento necesita título y fecha válidos.", 422);
    await assertCustomerReferences(tx, { assignedSellerId: input.assignedTo });
    const [created] = await tx.insert(opportunityFollowups).values({ id: id("opportunity-followup"), opportunityId: input.opportunityId, title: input.title.trim().slice(0, 180), dueAt: input.dueAt, status: "PENDING", assignedTo: input.assignedTo ?? null, createdBy: actor.userId }).returning();
    const snapshot = await refreshOpportunityFollowUpSnapshot(tx, input.opportunityId);
    await tx.insert(auditLogs).values(audit(actor, "crm.opportunity_followup_created", "opportunity_followup", created.id, null, created, { snapshot }));
    return created;
  });
}

export async function updateOpportunityFollowup(followUpId: string, input: { title?: string; dueAt?: Date; status?: TaskStatus }, actor: Actor) {
  return getDb().transaction(async (tx) => {
    const [before] = await tx.select().from(opportunityFollowups).where(eq(opportunityFollowups.id, followUpId)).limit(1);
    if (!before) throw new CrmDomainError("FOLLOW_UP_NOT_FOUND", "Seguimiento no encontrado.", 404);
    if (input.dueAt && Number.isNaN(input.dueAt.getTime())) throw new CrmDomainError("FOLLOW_UP_INVALID", "La fecha de seguimiento no es válida.", 422);
    const status = input.status ?? before.status;
    const [after] = await tx.update(opportunityFollowups).set({ title: input.title?.trim().slice(0, 180) || before.title, dueAt: input.dueAt ?? before.dueAt, status, completedAt: status === "COMPLETED" ? new Date() : status === "PENDING" ? null : before.completedAt }).where(eq(opportunityFollowups.id, followUpId)).returning();
    const snapshot = await refreshOpportunityFollowUpSnapshot(tx, before.opportunityId);
    await tx.insert(auditLogs).values(audit(actor, "crm.opportunity_followup_updated", "opportunity_followup", followUpId, before, after, { snapshot }));
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

export async function createActivity(input: { customerId?: string | null; opportunityId?: string | null; quoteId?: string | null; type: ActivityType; subject: string; body?: string | null; result?: string | null; occurredAt?: Date | null; nextAction?: string | null; nextActionAt?: Date | null; dueAt?: Date | null; completedAt?: Date | null; createFollowUp?: boolean; idempotencyKey?: string | null }, actor: Actor) {
  return getDb().transaction(async (tx) => {
    if (input.idempotencyKey) {
      const [existing] = await tx.select().from(crmActivities).where(eq(crmActivities.idempotencyKey, input.idempotencyKey)).limit(1);
      if (existing) return { activity: existing, idempotent: true };
    }
    if (input.occurredAt && Number.isNaN(input.occurredAt.getTime())) throw new CrmDomainError("ACTIVITY_DATE_INVALID", "La fecha de la actividad no es válida.", 422);
    if (input.nextActionAt && Number.isNaN(input.nextActionAt.getTime())) throw new CrmDomainError("ACTIVITY_FOLLOW_UP_DATE_INVALID", "La fecha de seguimiento no es válida.", 422);
    if (input.occurredAt && input.occurredAt.getTime() > Date.now() + 300_000) throw new CrmDomainError("ACTIVITY_DATE_IN_FUTURE", "La fecha de la actividad no puede estar en el futuro. Usa la fecha de próxima acción.", 422);
    if (input.createFollowUp && (!input.nextAction?.trim() || !input.nextActionAt)) throw new CrmDomainError("ACTIVITY_FOLLOW_UP_REQUIRED", "Indica la próxima acción y su fecha para crear el seguimiento.", 422);
    const customerId = await resolveCrmCustomer(tx, input);
    const [created] = await tx.insert(crmActivities).values({ id: id("activity"), customerId, opportunityId: input.opportunityId ?? null, quoteId: input.quoteId ?? null, type: input.type, subject: input.subject, body: input.body ?? null, result: input.result?.trim().slice(0, 1200) || null, occurredAt: input.occurredAt ?? null, nextAction: input.nextAction?.trim().slice(0, 240) || null, nextActionAt: input.nextActionAt ?? null, dueAt: input.dueAt ?? null, completedAt: input.completedAt ?? null, performedBy: actor.userId, idempotencyKey: input.idempotencyKey ?? null }).returning();
    let followUp = null;
    if (input.createFollowUp) {
      const followUpIdempotencyKey = input.idempotencyKey ? `${input.idempotencyKey}:follow-up`.slice(0, 180) : null;
      const [createdFollowUp] = await tx.insert(crmTasks).values({ id: id("task"), customerId, opportunityId: input.opportunityId ?? null, quoteId: input.quoteId ?? null, title: input.nextAction!.trim().slice(0, 180), description: input.result?.trim().slice(0, 2000) || input.body?.trim().slice(0, 2000) || null, status: "PENDING", assignedTo: actor.userId, dueAt: input.nextActionAt!, createdBy: actor.userId, idempotencyKey: followUpIdempotencyKey }).returning();
      followUp = createdFollowUp;
      await tx.insert(auditLogs).values(audit(actor, "crm.task_created", "crm_task", createdFollowUp.id, null, createdFollowUp, { sourceActivityId: created.id }));
    }
    if ((contactActivityTypes as readonly string[]).includes(input.type)) {
      const activityAt = input.occurredAt ?? created.createdAt;
      if (customerId) await tx.update(customers).set({ lastActivityAt: activityAt, updatedAt: new Date() }).where(eq(customers.id, customerId));
      if (input.opportunityId) await tx.update(opportunities).set({ lastContactAt: activityAt, updatedAt: new Date() }).where(eq(opportunities.id, input.opportunityId));
    }
    await tx.insert(auditLogs).values(audit(actor, "crm.activity_created", "crm_activity", created.id, null, created));
    return { activity: created, followUp, idempotent: false };
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
    await tx.insert(auditLogs).values(audit(actor, "crm.task_created", "crm_task", created.id, null, created));
    return { task: created, idempotent: false };
  });
}

export async function notifyOverdueFollowUps() {
  const now = new Date();
  const overdue = await getDb().select({ id: opportunityFollowups.id, title: opportunityFollowups.title, dueAt: opportunityFollowups.dueAt, opportunityId: opportunityFollowups.opportunityId }).from(opportunityFollowups).where(and(eq(opportunityFollowups.status, "PENDING"), lt(opportunityFollowups.dueAt, now))).limit(200);
  for (const followup of overdue) {
    try { await notifyStaffOnce({ type: "FOLLOW_UP_OVERDUE", title: "Seguimiento vencido", body: `El seguimiento ${followup.title} está vencido.`, link: "/admin/crm", metadata: { followUpId: followup.id, opportunityId: followup.opportunityId, dueAt: followup.dueAt }, dedupeKey: `crm-followup:${followup.id}:overdue` }); }
    catch (error) { console.error("ColdPower: no se pudo notificar seguimiento vencido", error); }
  }
  return overdue.length;
}
export async function updateTaskStatus(taskId: string, status: TaskStatus, actor: Actor) {
  return getDb().transaction(async (tx) => {
    const [before] = await tx.select().from(crmTasks).where(eq(crmTasks.id, taskId)).limit(1);
    if (!before) throw new CrmDomainError("CRM_TASK_NOT_FOUND", "Tarea no encontrada.", 404);
    const [after] = await tx.update(crmTasks).set({ status, completedAt: status === "COMPLETED" ? new Date() : null, updatedAt: new Date() }).where(eq(crmTasks.id, taskId)).returning();
    await tx.insert(auditLogs).values(audit(actor, "crm.task_status_changed", "crm_task", taskId, before, after));
    return after;
  });
}

export async function ensureLeadFromQuoteInTransaction(tx: Transaction, quoteId: string, actorId: string | null) {
  const [quote] = await tx.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!quote) throw new Error("Cotización no encontrada.");
  const [existingLink] = await tx.select().from(customerQuoteLinks).where(eq(customerQuoteLinks.quoteId, quoteId)).limit(1);
  if (existingLink) {
    const [existingOpportunity] = existingLink.opportunityId
      ? await tx.select({ assignedSellerId: opportunities.assignedSellerId }).from(opportunities).where(eq(opportunities.id, existingLink.opportunityId)).limit(1)
      : [];
    return { ...existingLink, assignedSellerId: existingOpportunity?.assignedSellerId ?? null };
  }
  const [existingCustomer] = await tx.select().from(customers).where(and(eq(customers.email, quote.email ?? ""), eq(customers.phone, quote.phone))).limit(1);
  const customerId = existingCustomer?.id ?? id("customer");
  const customer = existingCustomer ?? (await tx.insert(customers).values({ id: customerId, userId: quote.userId, name: quote.name, documentNumber: quote.documentNumber || null, phone: quote.phone, whatsapp: quote.phone, email: quote.email, location: [quote.department, quote.province, quote.district].filter(Boolean).join(" / ") || null, customerType: quote.customerType === "company" ? "EMPRESA" : "CONSUMIDOR", status: "PROSPECT" }).returning())[0];
  const [seller] = await tx.select({ id: users.id }).from(users).where(and(eq(users.status, "ACTIVE"), inArray(users.roleCode, sellerRoleCodes))).orderBy(asc(users.createdAt), asc(users.id)).limit(1);
  const opportunityId = id("opportunity");
  const opportunity = (await tx.insert(opportunities).values({ id: opportunityId, code: `OP-${quote.trackingCode}`, customerId: customer.id, quoteId, title: quote.productName ? `Cotización: ${quote.productName}` : "Solicitud de cotización", origin: "WEB", stage: "NEW", assignedSellerId: seller?.id ?? null, createdBy: actorId }).returning())[0];
  await tx.insert(opportunityStageHistory).values({ id: id("opportunity-stage"), opportunityId, fromStage: null, toStage: "NEW", changedBy: actorId ?? "anonymous", note: "Lead creado desde cotización" });
  const link = (await tx.insert(customerQuoteLinks).values({ id: id("quote-link"), customerId: customer.id, quoteId, opportunityId }).returning())[0];
  await tx.insert(auditLogs).values({ id: id("audit"), actorId: actorId, actorRole: "system", action: "crm.lead_created_from_quote", entityType: "quote", entityId: quoteId, before: null, after: { customer, opportunity, link }, metadata: null });
  return { ...link, assignedSellerId: opportunity.assignedSellerId ?? null };
}

export async function ensureLeadFromQuote(quoteId: string, actorId: string | null) {
  return getDb().transaction((tx) => ensureLeadFromQuoteInTransaction(tx, quoteId, actorId));
}

export type PublicContactLeadInput = {
  name: string;
  company: string;
  phone: string;
  email: string;
  message: string;
  requestId: string;
  attachment?: {
    id: string;
    originalFilename: string;
    storageKey: string;
    mimeType: string;
    byteSize: number;
    contentHash: string;
  };
};

export async function createPublicContactLead(input: PublicContactLeadInput) {
  const actor: Actor = { userId: "public-contact", role: "PUBLIC" };
  return getDb().transaction(async (tx) => {
    const [existingActivity] = await tx
      .select({ id: crmActivities.id, customerId: crmActivities.customerId, opportunityId: crmActivities.opportunityId })
      .from(crmActivities)
      .where(eq(crmActivities.idempotencyKey, input.requestId))
      .limit(1);
    if (existingActivity) return { idempotent: true as const, ...existingActivity, attachment: null };

    const phoneDigits = input.phone.replace(/\D/g, "");
    const [existingCustomer] = await tx
      .select()
      .from(customers)
      .where(
        or(
          ilike(customers.email, input.email),
          sql`regexp_replace(coalesce(${customers.phone}, ''), '[^0-9]', '', 'g') = ${phoneDigits}`,
        ),
      )
      .orderBy(asc(customers.updatedAt))
      .limit(1);
    const now = new Date();
    const customer = existingCustomer
      ? (
          await tx
            .update(customers)
            .set({
              name: existingCustomer.name || input.name,
              legalName: existingCustomer.legalName || input.company || null,
              phone: existingCustomer.phone || input.phone,
              whatsapp: existingCustomer.whatsapp || input.phone,
              email: existingCustomer.email || input.email,
              contactPreference: existingCustomer.contactPreference || "WEB",
              lastActivityAt: now,
              updatedAt: now,
            })
            .where(eq(customers.id, existingCustomer.id))
            .returning()
        )[0] ?? existingCustomer
      : (
          await tx
            .insert(customers)
            .values({
              id: id("customer"),
              name: input.name,
              legalName: input.company || null,
              phone: input.phone,
              whatsapp: input.phone,
              email: input.email,
              contactPreference: "WEB",
              customerType: input.company ? "EMPRESA" : "CONSUMIDOR",
              status: "PROSPECT",
              lastActivityAt: now,
              createdAt: now,
              updatedAt: now,
            })
            .returning()
        )[0];

    const opportunityId = id("opportunity");
    const opportunity = (
      await tx
        .insert(opportunities)
        .values({
          id: opportunityId,
          code: `OP-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
          customerId: customer.id,
          title: "Consulta desde página Contacto",
          origin: "WEB",
          stage: "NEW",
          createdBy: actor.userId,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
    )[0];
    await tx.insert(opportunityStageHistory).values({
      id: id("opportunity-stage"),
      opportunityId: opportunity.id,
      fromStage: null,
      toStage: "NEW",
      changedBy: actor.userId,
      note: "Lead recibido desde la página Contacto",
    });

    const activity = (
      await tx
        .insert(crmActivities)
        .values({
          id: id("activity"),
          customerId: customer.id,
          opportunityId: opportunity.id,
          type: "NOTE",
          subject: "Consulta recibida desde página Contacto",
          body: [
            input.company ? `Empresa: ${input.company}` : "Empresa: No indicada",
            `Correo: ${input.email}`,
            `Teléfono: ${input.phone}`,
            `Mensaje: ${input.message}`,
          ].join("\n"),
          occurredAt: now,
          performedBy: actor.userId,
          idempotencyKey: input.requestId,
          createdAt: now,
        })
        .returning()
    )[0];

    const attachment = input.attachment
      ? (
          await tx
            .insert(crmAttachments)
            .values({
              id: input.attachment.id,
              customerId: customer.id,
              opportunityId: opportunity.id,
              activityId: activity.id,
              originalFilename: input.attachment.originalFilename,
              storageKey: input.attachment.storageKey,
              mimeType: input.attachment.mimeType,
              byteSize: input.attachment.byteSize,
              contentHash: input.attachment.contentHash,
            })
            .returning()
        )[0]
      : null;

    await tx.insert(auditLogs).values(
      audit(actor, "public.contact_submitted", "opportunity", opportunity.id, null, {
        customerId: customer.id,
        activityId: activity.id,
        attachmentId: attachment?.id ?? null,
        source: "CONTACT_PAGE",
      }),
    );
    return { idempotent: false as const, customerId: customer.id, opportunityId: opportunity.id, activityId: activity.id, assignedSellerId: customer.assignedSellerId, attachment };
  });
}


