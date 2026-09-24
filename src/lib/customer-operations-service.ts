import { and, count, eq, ilike, inArray, ne, notInArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, quotes } from "@/db/schema";
import { crmActivities, crmAttachments, crmTasks, customerAddresses, customerContacts, customerNotes, customerQuoteLinks, customers, opportunities } from "@/db/crm-schema";
import { orders, sales } from "@/db/sales-schema";

type Actor = { userId: string | null; role?: string | null };
const openOpportunityStages = ["NEW", "CONTACTED", "QUOTING", "QUOTE_SENT", "FOLLOW_UP", "NEGOTIATION", "ACCEPTED", "SALE", "PAYMENT_PENDING", "PAID", "PREPARING"] as const;
const activeOrderStatuses = ["NEW", "RECEIVED", "PAYMENT_PENDING", "PAID", "PREPARING", "READY", "READY_FOR_PICKUP", "IN_TRANSIT", "SHIPPED"] as const;

export class CustomerOperationsError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400, public readonly details: Record<string, unknown> = {}) { super(message); this.name = "CustomerOperationsError"; }
}

function id(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
function normalizedPhone(value: string | null | undefined) { return value?.replace(/\D/g, "") || null; }
function audit(actor: Actor, action: string, customerId: string, before: unknown, after: unknown, metadata?: Record<string, unknown>) { return { id: id("audit"), actorId: actor.userId, actorRole: actor.role ?? null, action, entityType: "customer", entityId: customerId, before: before as Record<string, unknown> | null, after: after as Record<string, unknown> | null, metadata: metadata ?? null }; }

export function assertCustomerMergeable(primary: { canonicalCustomerId?: string | null; userId?: string | null }, secondary: { canonicalCustomerId?: string | null; userId?: string | null }) {
  if (primary.canonicalCustomerId || secondary.canonicalCustomerId) throw new CustomerOperationsError("CUSTOMER_MERGE_CHAIN", "No se puede fusionar un cliente que ya pertenece a otra fusión.", 409);
  if (primary.userId && secondary.userId && primary.userId !== secondary.userId) throw new CustomerOperationsError("CUSTOMER_MERGE_USER_CONFLICT", "Los clientes tienen usuarios vinculados diferentes; resuelve el conflicto antes de fusionar.", 409);
}

export async function findCustomerDuplicates(input: { name?: string | null; ruc?: string | null; documentNumber?: string | null; email?: string | null; phone?: string | null; whatsapp?: string | null }, excludeId?: string) {
  const email = input.email?.trim().toLowerCase() || null;
  const phone = normalizedPhone(input.phone);
  const whatsapp = normalizedPhone(input.whatsapp);
  const strong = [
    input.ruc?.trim() ? eq(customers.ruc, input.ruc.trim()) : undefined,
    input.documentNumber?.trim() ? eq(customers.documentNumber, input.documentNumber.trim()) : undefined,
    email ? sql`lower(${customers.email}) = ${email}` : undefined,
    phone ? sql`regexp_replace(coalesce(${customers.phone}, ''), '\\D', '', 'g') = ${phone}` : undefined,
    whatsapp ? sql`regexp_replace(coalesce(${customers.whatsapp}, ''), '\\D', '', 'g') = ${whatsapp}` : undefined,
  ].filter((value): value is NonNullable<typeof value> => Boolean(value));
  const weak = input.name?.trim() ? ilike(customers.name, `%${input.name.trim()}%`) : undefined;
  if (!strong.length && !weak) return [];
  const where = and(excludeId ? ne(customers.id, excludeId) : undefined, or(...strong, weak));
  const rows = await getDb().select({ id: customers.id, name: customers.name, legalName: customers.legalName, ruc: customers.ruc, documentNumber: customers.documentNumber, email: customers.email, phone: customers.phone, whatsapp: customers.whatsapp, location: customers.location, status: customers.status }).from(customers).where(where).limit(10);
  return rows.map((row) => {
    const matches: Array<{ field: string; strength: "strong" | "weak" }> = [];
    if (input.ruc && row.ruc === input.ruc.trim()) matches.push({ field: "RUC", strength: "strong" });
    if (input.documentNumber && row.documentNumber === input.documentNumber.trim()) matches.push({ field: "Documento", strength: "strong" });
    if (email && row.email?.toLowerCase() === email) matches.push({ field: "Email", strength: "strong" });
    if (phone && normalizedPhone(row.phone) === phone) matches.push({ field: "Teléfono", strength: "strong" });
    if (whatsapp && normalizedPhone(row.whatsapp) === whatsapp) matches.push({ field: "WhatsApp", strength: "strong" });
    if (input.name && row.name.toLowerCase().includes(input.name.trim().toLowerCase())) matches.push({ field: "Nombre", strength: "weak" });
    return { ...row, matches, strong: matches.some((match) => match.strength === "strong") };
  }).sort((a, b) => Number(b.strong) - Number(a.strong));
}

export async function getCustomerOpenOperationCounts(customerId: string) {
  const db = getDb();
  const [opportunityRows, orderRows, quoteRows] = await Promise.all([
    db.select({ total: count(opportunities.id) }).from(opportunities).where(and(eq(opportunities.customerId, customerId), inArray(opportunities.stage, [...openOpportunityStages]))),
    db.select({ total: count(orders.id) }).from(orders).where(and(eq(orders.customerId, customerId), inArray(orders.status, [...activeOrderStatuses]))),
    db.select({ total: count(quotes.id) }).from(customerQuoteLinks).innerJoin(quotes, eq(customerQuoteLinks.quoteId, quotes.id)).where(and(eq(customerQuoteLinks.customerId, customerId), notInArray(quotes.status, ["cerrada", "cerrado", "convertida"]))),
  ]);
  return { opportunities: Number(opportunityRows[0]?.total ?? 0), orders: Number(orderRows[0]?.total ?? 0), quotes: Number(quoteRows[0]?.total ?? 0) };
}

export async function deactivateCustomer(customerId: string, input: { reason: string; force?: boolean }, actor: Actor) {
  if (!input.reason.trim()) throw new CustomerOperationsError("CUSTOMER_STATUS_REASON_REQUIRED", "Indica el motivo del cambio.", 422);
  const open = await getCustomerOpenOperationCounts(customerId);
  if (!input.force && (open.opportunities || open.orders)) throw new CustomerOperationsError("CUSTOMER_HAS_OPEN_OPERATIONS", "El cliente tiene operaciones abiertas. Revisa el impacto antes de desactivarlo.", 409, open);
  return getDb().transaction(async (tx) => {
    const [before] = await tx.select().from(customers).where(eq(customers.id, customerId)).for("update").limit(1);
    if (!before) throw new CustomerOperationsError("CUSTOMER_NOT_FOUND", "Cliente no encontrado.", 404);
    if (before.status === "INACTIVE") return { customer: before, idempotent: true, open };
    const [customer] = await tx.update(customers).set({ status: "INACTIVE", updatedAt: new Date() }).where(eq(customers.id, customerId)).returning();
    await tx.insert(auditLogs).values(audit(actor, "customer.status_changed", customerId, before, customer, { reason: input.reason.trim().slice(0, 500), openOperations: open }));
    return { customer, idempotent: false, open };
  });
}

export async function previewCustomerMerge(primaryId: string, secondaryId: string) {
  if (!primaryId || !secondaryId || primaryId === secondaryId) throw new CustomerOperationsError("CUSTOMER_MERGE_INVALID", "Selecciona dos clientes diferentes.", 422);
  const db = getDb();
  const [primary, secondary] = await Promise.all([db.select().from(customers).where(eq(customers.id, primaryId)).limit(1), db.select().from(customers).where(eq(customers.id, secondaryId)).limit(1)]);
  if (!primary[0] || !secondary[0]) throw new CustomerOperationsError("CUSTOMER_NOT_FOUND", "Uno de los clientes no existe.", 404);
  assertCustomerMergeable(primary[0], secondary[0]);
  const counters = await Promise.all([
    db.select({ total: count(customerContacts.id) }).from(customerContacts).where(eq(customerContacts.customerId, secondaryId)),
    db.select({ total: count(customerAddresses.id) }).from(customerAddresses).where(eq(customerAddresses.customerId, secondaryId)),
    db.select({ total: count(opportunities.id) }).from(opportunities).where(eq(opportunities.customerId, secondaryId)),
    db.select({ total: count(customerQuoteLinks.id) }).from(customerQuoteLinks).where(eq(customerQuoteLinks.customerId, secondaryId)),
    db.select({ total: count(sales.id) }).from(sales).where(eq(sales.customerId, secondaryId)),
    db.select({ total: count(orders.id) }).from(orders).where(eq(orders.customerId, secondaryId)),
    db.select({ total: count(crmActivities.id) }).from(crmActivities).where(eq(crmActivities.customerId, secondaryId)),
    db.select({ total: count(crmTasks.id) }).from(crmTasks).where(eq(crmTasks.customerId, secondaryId)),
    db.select({ total: count(customerNotes.id) }).from(customerNotes).where(eq(customerNotes.customerId, secondaryId)),
    db.select({ total: count(crmAttachments.id) }).from(crmAttachments).where(eq(crmAttachments.customerId, secondaryId)),
  ]);
  const values = counters.map((row) => Number(row[0]?.total ?? 0));
  return { primary: primary[0], secondary: secondary[0], moved: { contacts: values[0], addresses: values[1], opportunities: values[2], quotes: values[3], sales: values[4], orders: values[5], activities: values[6], tasks: values[7], notes: values[8], attachments: values[9] } };
}

export async function mergeCustomers(input: { primaryId: string; secondaryId: string; reason: string }, actor: Actor) {
  if (!input.reason.trim()) throw new CustomerOperationsError("CUSTOMER_MERGE_REASON_REQUIRED", "El motivo de la fusión es obligatorio.", 422);
  const preview = await previewCustomerMerge(input.primaryId, input.secondaryId);
  return getDb().transaction(async (tx) => {
    const [primary] = await tx.select().from(customers).where(eq(customers.id, input.primaryId)).for("update").limit(1);
    const [secondary] = await tx.select().from(customers).where(eq(customers.id, input.secondaryId)).for("update").limit(1);
    if (!primary || !secondary) throw new CustomerOperationsError("CUSTOMER_NOT_FOUND", "Uno de los clientes ya no existe.", 404);
    assertCustomerMergeable(primary, secondary);
    const [primaryContact] = await tx.select({ id: customerContacts.id }).from(customerContacts).where(and(eq(customerContacts.customerId, primary.id), eq(customerContacts.isPrimary, true))).limit(1);
    const [primaryAddress] = await tx.select({ id: customerAddresses.id }).from(customerAddresses).where(and(eq(customerAddresses.customerId, primary.id), eq(customerAddresses.isPrimary, true))).limit(1);
    if (primaryContact) await tx.update(customerContacts).set({ isPrimary: false }).where(eq(customerContacts.customerId, secondary.id));
    if (primaryAddress) await tx.update(customerAddresses).set({ isPrimary: false }).where(eq(customerAddresses.customerId, secondary.id));
    await Promise.all([
      tx.update(customerContacts).set({ customerId: primary.id }).where(eq(customerContacts.customerId, secondary.id)),
      tx.update(customerAddresses).set({ customerId: primary.id }).where(eq(customerAddresses.customerId, secondary.id)),
      tx.update(customerNotes).set({ customerId: primary.id }).where(eq(customerNotes.customerId, secondary.id)),
      tx.update(opportunities).set({ customerId: primary.id }).where(eq(opportunities.customerId, secondary.id)),
      tx.update(customerQuoteLinks).set({ customerId: primary.id }).where(eq(customerQuoteLinks.customerId, secondary.id)),
      tx.update(sales).set({ customerId: primary.id }).where(eq(sales.customerId, secondary.id)),
      tx.update(orders).set({ customerId: primary.id }).where(eq(orders.customerId, secondary.id)),
      tx.update(crmActivities).set({ customerId: primary.id }).where(eq(crmActivities.customerId, secondary.id)),
      tx.update(crmTasks).set({ customerId: primary.id }).where(eq(crmTasks.customerId, secondary.id)),
      tx.update(crmAttachments).set({ customerId: primary.id }).where(eq(crmAttachments.customerId, secondary.id)),
    ]);
    const now = new Date();
    const transferredUserId = primary.userId ?? secondary.userId ?? null;
    if (!primary.userId && secondary.userId) await tx.update(customers).set({ userId: secondary.userId }).where(eq(customers.id, primary.id));
    const [merged] = await tx.update(customers).set({ userId: null, status: "INACTIVE", canonicalCustomerId: primary.id, mergeReason: input.reason.trim().slice(0, 500), mergedBy: actor.userId, mergedAt: now, updatedAt: now }).where(eq(customers.id, secondary.id)).returning();
    await tx.update(customers).set({ updatedAt: now }).where(eq(customers.id, primary.id));
    await tx.insert(auditLogs).values([
      audit(actor, "customer.merged", primary.id, primary, { ...primary, updatedAt: now }, { secondaryId: secondary.id, reason: input.reason.trim().slice(0, 500), moved: preview.moved }),
      audit(actor, "customer.merged_into", secondary.id, secondary, merged, { canonicalCustomerId: primary.id, reason: input.reason.trim().slice(0, 500), moved: preview.moved }),
    ]);
    return { primary: { ...primary, userId: transferredUserId, updatedAt: now }, secondary: merged, moved: preview.moved, idempotent: false };
  });
}

export async function addCustomerContact(customerId: string, input: { name: string; role?: string | null; email?: string | null; phone?: string | null; whatsapp?: string | null; isPrimary?: boolean }, actor: Actor) {
  if (!input.name.trim()) throw new CustomerOperationsError("CUSTOMER_CONTACT_NAME_REQUIRED", "El nombre del contacto es obligatorio.", 422);
  return getDb().transaction(async (tx) => {
    const [customer] = await tx.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId)).limit(1); if (!customer) throw new CustomerOperationsError("CUSTOMER_NOT_FOUND", "Cliente no encontrado.", 404);
    if (input.isPrimary) await tx.update(customerContacts).set({ isPrimary: false }).where(eq(customerContacts.customerId, customerId));
    const [contact] = await tx.insert(customerContacts).values({ id: id("customer-contact"), customerId, name: input.name.trim().slice(0, 160), role: input.role?.trim().slice(0, 120) || null, email: input.email?.trim().toLowerCase().slice(0, 180) || null, phone: input.phone?.trim().slice(0, 40) || null, whatsapp: input.whatsapp?.trim().slice(0, 40) || null, isPrimary: input.isPrimary ?? false }).returning();
    await tx.insert(auditLogs).values(audit(actor, "customer.contact_added", customerId, null, contact)); return contact;
  });
}

export async function addCustomerAddress(customerId: string, input: { label: string; address: string; country?: string | null; department?: string | null; province?: string | null; district?: string | null; isPrimary?: boolean }, actor: Actor) {
  if (!input.label.trim() || !input.address.trim()) throw new CustomerOperationsError("CUSTOMER_ADDRESS_REQUIRED", "Tipo y dirección son obligatorios.", 422);
  return getDb().transaction(async (tx) => {
    const [customer] = await tx.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId)).limit(1); if (!customer) throw new CustomerOperationsError("CUSTOMER_NOT_FOUND", "Cliente no encontrado.", 404);
    if (input.isPrimary) await tx.update(customerAddresses).set({ isPrimary: false }).where(eq(customerAddresses.customerId, customerId));
    const [address] = await tx.insert(customerAddresses).values({ id: id("customer-address"), customerId, label: input.label.trim().slice(0, 80), address: input.address.trim().slice(0, 300), country: input.country?.trim().slice(0, 80) || null, department: input.department?.trim().slice(0, 80) || null, province: input.province?.trim().slice(0, 80) || null, district: input.district?.trim().slice(0, 80) || null, isPrimary: input.isPrimary ?? false }).returning();
    await tx.insert(auditLogs).values(audit(actor, "customer.address_added", customerId, null, address)); return address;
  });
}

export async function addCustomerNote(customerId: string, body: string, actor: Actor) {
  if (!body.trim()) throw new CustomerOperationsError("CUSTOMER_NOTE_REQUIRED", "Escribe una nota.", 422);
  return getDb().transaction(async (tx) => {
    const [customer] = await tx.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId)).limit(1); if (!customer) throw new CustomerOperationsError("CUSTOMER_NOT_FOUND", "Cliente no encontrado.", 404);
    const [note] = await tx.insert(customerNotes).values({ id: id("customer-note"), customerId, body: body.trim().slice(0, 3000), createdBy: actor.userId }).returning();
    await tx.insert(auditLogs).values(audit(actor, "customer.note_added", customerId, null, { id: note.id, createdAt: note.createdAt })); return note;
  });
}
