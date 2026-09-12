import { and, asc, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, companySettings, discountRules, productPrices, products, quoteDiscountApprovals, quoteItems, quoteStatusHistory, quoteVersionItems, quoteVersions, quotes } from "@/db/schema";
import { crmActivities, crmTasks, customerQuoteLinks, customers, opportunities, opportunityStageHistory } from "@/db/crm-schema";
import { can, type AppRole } from "@/lib/roles";
import { buildQuoteTotals, discountApprovalState, snapshotHash, type CommercialLine } from "@/lib/quote-pricing";
import { canTransitionQuote, effectiveQuoteStatus, normalizeQuoteStatus, type QuoteWorkflowStatus } from "@/lib/quote-workflow";
import type { QuoteResponseChannel, QuoteTaxMode } from "@/lib/quote-contract";

type Actor = { userId: string | null; role: AppRole | string | null };
type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
type Database = ReturnType<typeof getDb>;
type QuoteLineInput = { productId: string; quantity: number; discountPercentage?: number | string | null; discountReason?: string | null; manualUnitPrice?: number | string | null; manualCurrency?: string | null; priceReason?: string | null };

function id(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
function text(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function positiveInteger(value: unknown) { const number = Number(value); return Number.isInteger(number) && number > 0 ? number : null; }
function dateValue(value: unknown) { if (value === null || value === undefined || value === "") return null; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? null : date; }
function audit(actor: Actor, action: string, entityType: string, entityId: string, before: unknown, after: unknown, metadata?: Record<string, unknown>) { return { id: id("audit"), actorId: actor.userId, actorRole: actor.role, action, entityType, entityId, before: before as Record<string, unknown> | null, after: after as Record<string, unknown> | null, metadata: metadata ?? null }; }
function legacyStatus(status: QuoteWorkflowStatus) { const values: Record<QuoteWorkflowStatus, (typeof quoteStatusHistory.$inferInsert)["toStatus"]> = { DRAFT: "borrador", SENT: "enviada", FOLLOW_UP: "cotizada", ACCEPTED: "aprobada", REJECTED: "cerrada", EXPIRED: "cerrada", CONVERTED: "convertida", CANCELLED: "cerrada" }; return values[status]; }

async function activeDiscountRule(tx: Transaction) {
  const now = new Date();
  const [rule] = await tx.select().from(discountRules).where(and(eq(discountRules.status, "ACTIVE"), or(isNull(discountRules.validFrom), lte(discountRules.validFrom, now)), or(isNull(discountRules.validUntil), gt(discountRules.validUntil, now)))).orderBy(desc(discountRules.approvalAbovePercentage)).limit(1);
  return rule ?? null;
}

async function resolveLinePricing(tx: Transaction, input: QuoteLineInput, actor: Actor) {
  const quantity = positiveInteger(input.quantity);
  if (!quantity) throw new Error("La cantidad debe ser un entero mayor que cero.");
  const [product] = await tx.select({ id: products.id, sku: products.sku, commercialName: products.commercialName, normalizedName: products.normalizedName }).from(products).where(eq(products.id, input.productId)).limit(1);
  if (!product) throw new Error("El producto seleccionado ya no existe.");
  const prices = await tx.select().from(productPrices).where(and(eq(productPrices.productId, input.productId), eq(productPrices.active, true), inArray(productPrices.priceType, ["RETAIL", "WHOLESALE", "SPECIAL"]))).orderBy(desc(productPrices.validFrom));
  const now = new Date();
  const effective = prices.filter((price) => price.validFrom <= now && (!price.validUntil || price.validUntil > now) && price.status === "ACTIVE");
  const manual = input.manualUnitPrice !== null && input.manualUnitPrice !== undefined && input.manualUnitPrice !== "";
  const selected = manual ? null : effective.find((price) => price.priceType === "SPECIAL") ?? effective.find((price) => price.priceType === "WHOLESALE" && price.wholesaleMinQty !== null && quantity >= price.wholesaleMinQty) ?? effective.find((price) => price.priceType === "RETAIL");
  if (!selected && !manual) return { product, quantity, baseUnitPrice: null, discountPercentage: null, discountAmount: null, finalUnitPrice: null, lineTotal: null, currency: null, priceType: null, priceSourceId: null, priceReason: null, discountStatus: "NOT_REQUIRED" as const, discountReason: null };
  const baseUnitPrice = manual ? Number(input.manualUnitPrice) : Number(selected?.amount);
  const currency = (manual ? text(input.manualCurrency, 3).toUpperCase() : selected?.currency ?? "").toUpperCase();
  const reason = text(input.priceReason, 240) || (manual ? "Precio manual autorizado" : null);
  if (!Number.isFinite(baseUnitPrice) || baseUnitPrice <= 0 || Math.round(baseUnitPrice * 100) !== baseUnitPrice * 100) throw new Error("El precio comercial debe ser positivo y tener hasta dos decimales.");
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("El precio manual necesita una moneda ISO válida.");
  if (manual && (!can(actor.role as AppRole, "pricing.edit") || !reason)) throw new Error("El precio manual requiere permiso de pricing y un motivo.");
  const discountPercentage = input.discountPercentage === null || input.discountPercentage === undefined || input.discountPercentage === "" ? 0 : Number(input.discountPercentage);
  if (!Number.isFinite(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) throw new Error("El descuento debe estar entre 0 y 100%.");
  const rule = await activeDiscountRule(tx);
  const state = discountApprovalState(discountPercentage, rule?.approvalAbovePercentage, rule?.maxPercentage);
  if (state === "BLOCKED") throw new Error("El descuento supera el máximo permitido.");
  const discountAmount = (baseUnitPrice * discountPercentage / 100).toFixed(2);
  const finalUnitPrice = Math.max(0, baseUnitPrice - Number(discountAmount)).toFixed(2);
  if (state === "PENDING" && !text(input.discountReason, 240)) throw new Error("El descuento requiere un motivo para aprobación.");
  return { product, quantity, baseUnitPrice: baseUnitPrice.toFixed(2), discountPercentage: discountPercentage.toFixed(2), discountAmount, finalUnitPrice, lineTotal: (Number(finalUnitPrice) * quantity).toFixed(2), currency, priceType: manual ? "MANUAL" : selected?.priceType ?? null, priceSourceId: manual ? null : selected?.id ?? null, priceReason: reason, discountStatus: state, discountReason: text(input.discountReason, 240) || null };
}

async function ensureOpportunity(tx: Transaction, customerId: string, opportunityId: string | null, quoteId: string, actor: Actor) {
  if (opportunityId) {
    const [opportunity] = await tx.select().from(opportunities).where(eq(opportunities.id, opportunityId)).limit(1);
    if (!opportunity || opportunity.customerId !== customerId) throw new Error("La oportunidad no pertenece al cliente seleccionado.");
    return opportunity;
  }
  const opportunity = (await tx.insert(opportunities).values({ id: id("opportunity"), code: `OP-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`, customerId, quoteId, title: "Nueva cotización comercial", origin: "LOCAL", stage: "QUOTING", assignedSellerId: actor.userId, createdBy: actor.userId }).returning())[0];
  return opportunity;
}

export async function createAdminQuote(input: { customerId: string; opportunityId?: string | null; message?: string | null; validUntil?: Date | null; taxMode?: QuoteTaxMode; origin?: string; items?: QuoteLineInput[] }, actor: Actor) {
  if (!actor.userId) throw new Error("No se pudo identificar al usuario que crea la cotización.");
  if (!text(input.customerId, 160)) throw new Error("Debes seleccionar un cliente.");
  return getDb().transaction(async (tx) => {
    const [customer] = await tx.select().from(customers).where(eq(customers.id, input.customerId)).limit(1);
    if (!customer) throw new Error("El cliente seleccionado no existe.");
    const quoteId = id("quote");
    const opportunity = await ensureOpportunity(tx, customer.id, input.opportunityId ?? null, quoteId, actor);
    const lineInputs = input.items ?? [];
    const lines = [] as Awaited<ReturnType<typeof resolveLinePricing>>[];
    for (const line of lineInputs) lines.push(await resolveLinePricing(tx, line, actor));
    const totals = buildQuoteTotals(lines.map((line) => ({ ...line, sku: line.product.sku, name: line.product.commercialName ?? line.product.normalizedName, productId: line.product.id } as CommercialLine)));
    const trackingCode = `COT-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const now = new Date();
    const [quote] = await tx.insert(quotes).values({ id: quoteId, trackingCode, userId: null, name: customer.name, customerType: customer.customerType, documentNumber: customer.documentNumber ?? customer.ruc ?? "", phone: customer.phone ?? customer.whatsapp ?? "", email: customer.email, department: "", province: "", district: "", preferredContact: customer.whatsapp ? "whatsapp" : customer.email ? "email" : "phone", productName: lines[0]?.product.commercialName ?? lines[0]?.product.normalizedName ?? null, sku: lines[0]?.product.sku ?? null, message: text(input.message, 2000) || "Propuesta comercial interna", status: "borrador", workflowStatus: "DRAFT", currentVersionNumber: 0, revision: 0, assignedSellerId: opportunity.assignedSellerId ?? actor.userId, origin: text(input.origin, 30) || "LOCAL", currency: totals.currency, subtotal: totals.subtotal, discountAmount: totals.discountAmount, taxAmount: totals.taxAmount, total: totals.total, taxMode: input.taxMode ?? "UNCONFIGURED", discountApprovalStatus: lines.some((line) => line.discountStatus === "PENDING") ? "PENDING" : "NOT_REQUIRED", validUntil: input.validUntil ?? null, createdAt: now, updatedAt: now }).returning();
    if (input.opportunityId) {
      const nextStage = opportunity.stage === "NEW" || opportunity.stage === "CONTACTED" ? "QUOTING" : opportunity.stage;
      await tx.update(opportunities).set({ quoteId, stage: nextStage, updatedAt: now }).where(eq(opportunities.id, opportunity.id));
      if (nextStage !== opportunity.stage) await tx.insert(opportunityStageHistory).values({ id: id("opportunity-stage"), opportunityId: opportunity.id, fromStage: opportunity.stage, toStage: nextStage, changedBy: actor.userId ?? "system", note: "Cotización creada desde el pipeline" });
    }
    if (lineInputs.length) await tx.insert(quoteItems).values(lines.map((line) => ({ id: id("quote-item"), quoteId, productId: line.product.id, skuSnapshot: line.product.sku, productNameSnapshot: line.product.commercialName ?? line.product.normalizedName, quantity: line.quantity, baseUnitPrice: line.baseUnitPrice, discountPercentage: line.discountPercentage, discountAmount: line.discountAmount, finalUnitPrice: line.finalUnitPrice, lineTotal: line.lineTotal, currency: line.currency, priceType: line.priceType, priceSourceId: line.priceSourceId, priceReason: line.priceReason, discountStatus: line.discountStatus, discountReason: line.discountReason, createdAt: now, updatedAt: now })));
    if (lines.some((line) => line.discountStatus === "PENDING")) for (const line of lines.filter((value) => value.discountStatus === "PENDING")) await tx.insert(quoteDiscountApprovals).values({ id: id("discount-approval"), quoteId, quoteItemId: null, requestedBy: actor.userId, percentage: line.discountPercentage ?? "0.00", amount: line.discountAmount ?? "0.00", reason: line.discountReason ?? "Descuento comercial solicitado", status: "PENDING", createdAt: now, updatedAt: now });
    await tx.insert(customerQuoteLinks).values({ id: id("quote-link"), customerId: customer.id, quoteId, opportunityId: opportunity.id });
    await tx.insert(quoteStatusHistory).values({ id: id("quote-status"), quoteId, toStatus: "borrador", changedBy: actor.userId ?? "system", note: "Cotización interna creada" });
    await tx.insert(auditLogs).values(audit(actor, "quote.created", "quote", quoteId, null, { trackingCode, workflowStatus: "DRAFT", opportunityId: opportunity.id }));
    return quote;
  });
}

export async function updateAdminQuoteDraft(quoteId: string, input: { message?: string | null; validUntil?: Date | null; taxMode?: QuoteTaxMode; items?: QuoteLineInput[] }, actor: Actor) {
  return getDb().transaction(async (tx) => {
    const [quote] = await tx.select().from(quotes).where(eq(quotes.id, quoteId)).for("update").limit(1);
    if (!quote) throw new Error("Cotización no encontrada.");
    if (normalizeQuoteStatus(quote.status, quote.workflowStatus) !== "DRAFT") throw new Error("Sólo se puede editar un borrador.");
    const lineInputs = input.items ?? [];
    const lines = [] as Awaited<ReturnType<typeof resolveLinePricing>>[];
    for (const line of lineInputs) lines.push(await resolveLinePricing(tx, line, actor));
    const totals = buildQuoteTotals(lines.map((line) => ({ ...line, sku: line.product.sku, name: line.product.commercialName ?? line.product.normalizedName, productId: line.product.id } as CommercialLine)));
    const now = new Date();
    await tx.delete(quoteItems).where(eq(quoteItems.quoteId, quoteId));
    if (lines.length) await tx.insert(quoteItems).values(lines.map((line) => ({ id: id("quote-item"), quoteId, productId: line.product.id, skuSnapshot: line.product.sku, productNameSnapshot: line.product.commercialName ?? line.product.normalizedName, quantity: line.quantity, baseUnitPrice: line.baseUnitPrice, discountPercentage: line.discountPercentage, discountAmount: line.discountAmount, finalUnitPrice: line.finalUnitPrice, lineTotal: line.lineTotal, currency: line.currency, priceType: line.priceType, priceSourceId: line.priceSourceId, priceReason: line.priceReason, discountStatus: line.discountStatus, discountReason: line.discountReason, createdAt: now, updatedAt: now })));
    const [updated] = await tx.update(quotes).set({ message: text(input.message, 2000) || quote.message, currency: totals.currency, subtotal: totals.subtotal, discountAmount: totals.discountAmount, taxAmount: totals.taxAmount, total: totals.total, taxMode: input.taxMode ?? quote.taxMode, discountApprovalStatus: lines.some((line) => line.discountStatus === "PENDING") ? "PENDING" : "NOT_REQUIRED", validUntil: input.validUntil ?? quote.validUntil, updatedAt: now, revision: quote.revision + 1 }).where(eq(quotes.id, quoteId)).returning();
    for (const line of lines.filter((value) => value.discountStatus === "PENDING")) await tx.insert(quoteDiscountApprovals).values({ id: id("discount-approval"), quoteId, quoteItemId: null, requestedBy: actor.userId, percentage: line.discountPercentage ?? "0.00", amount: line.discountAmount ?? "0.00", reason: line.discountReason ?? "Descuento comercial solicitado", status: "PENDING", createdAt: now, updatedAt: now });
    await tx.insert(quoteStatusHistory).values({ id: id("quote-status"), quoteId, fromStatus: quote.status, toStatus: "borrador", changedBy: actor.userId ?? "system", note: "Borrador editado" });
    await tx.insert(auditLogs).values(audit(actor, "quote.draft_updated", "quote", quoteId, { revision: quote.revision }, { revision: updated.revision, itemCount: lines.length }));
    return updated;
  });
}

async function quoteSendData<T extends Database | Transaction>(tx: T, quoteId: string) {
  const [quote] = await tx.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!quote) throw new Error("Cotización no encontrada.");
  const [link] = await tx.select({ customer: customers }).from(customerQuoteLinks).innerJoin(customers, eq(customerQuoteLinks.customerId, customers.id)).where(eq(customerQuoteLinks.quoteId, quoteId)).limit(1);
  const items = await tx.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId)).orderBy(asc(quoteItems.createdAt));
  return { quote, customer: link?.customer ?? null, items };
}

function sendBlockers(data: Awaited<ReturnType<typeof quoteSendData>>) {
  const blockers: Array<{ code: string; label: string }> = [];
  if (!data.customer) blockers.push({ code: "CUSTOMER_REQUIRED", label: "Seleccionar un cliente válido" });
  if (!data.customer?.phone && !data.customer?.email) blockers.push({ code: "CONTACT_REQUIRED", label: "Registrar un contacto del cliente" });
  if (!data.items.length) blockers.push({ code: "ITEMS_REQUIRED", label: "Agregar al menos un producto" });
  for (const item of data.items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) blockers.push({ code: `QUANTITY_${item.id}`, label: `Corregir cantidad de ${item.skuSnapshot}` });
    if (item.baseUnitPrice === null || item.finalUnitPrice === null || item.lineTotal === null || !item.currency) blockers.push({ code: `PRICE_${item.id}`, label: `Asignar precio a ${item.skuSnapshot}` });
    if (item.discountStatus === "PENDING") blockers.push({ code: `DISCOUNT_${item.id}`, label: `Aprobar descuento de ${item.skuSnapshot}` });
  }
  const currencies = new Set(data.items.map((item) => item.currency).filter(Boolean));
  if (currencies.size > 1) blockers.push({ code: "MULTI_CURRENCY", label: "Usar una sola moneda en la versión" });
  if (!data.quote.validUntil) blockers.push({ code: "VALID_UNTIL_REQUIRED", label: "Definir vigencia" });
  else if (data.quote.validUntil <= new Date()) blockers.push({ code: "VALID_UNTIL_PAST", label: "La vigencia debe ser futura" });
  if (data.quote.taxMode === "UNCONFIGURED") blockers.push({ code: "TAX_MODE_REQUIRED", label: "Definir si los precios incluyen impuestos" });
  if (data.quote.discountApprovalStatus === "PENDING") blockers.push({ code: "DISCOUNT_APPROVAL_REQUIRED", label: "Aprobar descuentos pendientes" });
  return blockers;
}

export async function preflightQuoteSend(quoteId: string) {
  const data = await quoteSendData(getDb(), quoteId);
  const blockers = sendBlockers(data);
  return { eligible: blockers.length === 0, blockers, warnings: data.quote.taxMode === "UNCONFIGURED" ? [] : [{ code: "STOCK_NOT_RESERVED", label: "El stock queda sujeto a disponibilidad hasta la conversión" }], versionPreview: { currency: data.quote.currency, subtotal: data.quote.subtotal, discountAmount: data.quote.discountAmount, taxAmount: data.quote.taxAmount, total: data.quote.total, validUntil: data.quote.validUntil } };
}

async function createVersion(tx: Transaction, data: Awaited<ReturnType<typeof quoteSendData>>, actor: Actor, versionNumber: number) {
  const [company] = await tx.select().from(companySettings).limit(1);
  const versionId = id("quote-version");
  const snapshot = { quote: { trackingCode: data.quote.trackingCode, message: data.quote.message, taxMode: data.quote.taxMode }, customer: data.customer, company: company ?? null, items: data.items };
  const [version] = await tx.insert(quoteVersions).values({ id: versionId, quoteId: data.quote.id, versionNumber, status: "SENT", createdBy: actor.userId, sentAt: new Date(), sentBy: actor.userId, currency: data.quote.currency, subtotal: data.quote.subtotal, discountAmount: data.quote.discountAmount, taxAmount: data.quote.taxAmount, total: data.quote.total, taxMode: data.quote.taxMode, validUntil: data.quote.validUntil, termsSnapshot: { message: data.quote.message }, companySnapshot: (company ?? {}) as Record<string, unknown>, customerSnapshot: (data.customer ?? {}) as Record<string, unknown>, contentHash: snapshotHash(snapshot) }).returning();
  await tx.insert(quoteVersionItems).values(data.items.map((item) => ({ id: id("quote-version-item"), versionId, productId: item.productId, skuSnapshot: item.skuSnapshot, productNameSnapshot: item.productNameSnapshot, quantity: item.quantity, baseUnitPrice: item.baseUnitPrice, discountPercentage: item.discountPercentage, discountAmount: item.discountAmount, finalUnitPrice: item.finalUnitPrice, lineTotal: item.lineTotal, currency: item.currency, priceType: item.priceType, priceSourceId: item.priceSourceId, priceReason: item.priceReason, discountStatus: item.discountStatus, discountReason: item.discountReason })));
  return version;
}

export async function sendQuote(quoteId: string, actor: Actor, channel: string, recipient?: string | null) {
  return getDb().transaction(async (tx) => {
    const data = await quoteSendData(tx, quoteId);
    const blockers = sendBlockers(data);
    if (blockers.length) throw new Error(`No se puede enviar: ${blockers.map((blocker) => blocker.label).join("; ")}.`);
    const current = effectiveQuoteStatus(data.quote.status, data.quote.workflowStatus, data.quote.validUntil);
    if (current !== "DRAFT" && current !== "FOLLOW_UP") throw new Error("Solo un borrador o seguimiento puede enviarse.");
    if (data.quote.currentVersionNumber > 0) await tx.update(quoteVersions).set({ status: "SUPERSEDED" }).where(and(eq(quoteVersions.quoteId, quoteId), eq(quoteVersions.versionNumber, data.quote.currentVersionNumber)));
    const version = await createVersion(tx, data, actor, data.quote.currentVersionNumber + 1);
    const now = new Date();
    const [updated] = await tx.update(quotes).set({ workflowStatus: "SENT", status: legacyStatus("SENT"), currentVersionNumber: version.versionNumber, sentAt: now, sentBy: actor.userId, updatedAt: now, revision: data.quote.revision + 1 }).where(and(eq(quotes.id, quoteId), eq(quotes.revision, data.quote.revision))).returning();
    if (!updated) throw new Error("Esta cotización fue actualizada por otro usuario. Recarga los cambios.");
    await tx.insert(quoteStatusHistory).values({ id: id("quote-status"), quoteId, fromStatus: data.quote.status, toStatus: "enviada", changedBy: actor.userId ?? "system", note: `Versión v${version.versionNumber} enviada por ${text(channel, 30) || "canal no indicado"}` });
    await tx.insert(crmActivities).values({ id: id("activity"), customerId: data.customer?.id ?? null, opportunityId: null, quoteId, type: channel === "EMAIL" ? "EMAIL" : channel === "PHONE" ? "CALL" : channel === "IN_PERSON" ? "MEETING" : "WHATSAPP", subject: `Cotización v${version.versionNumber} enviada`, body: recipient ? `Destinatario: ${recipient}` : null, performedBy: actor.userId });
    await tx.insert(auditLogs).values(audit(actor, "quote.sent", "quote", quoteId, { workflowStatus: data.quote.workflowStatus, version: data.quote.currentVersionNumber }, { workflowStatus: "SENT", version: version.versionNumber, channel, recipient: recipient ?? null }));
    return { quote: updated, version, idempotent: false };
  });
}

export async function createNewQuoteVersion(quoteId: string, actor: Actor) {
  return getDb().transaction(async (tx) => {
    const [quote] = await tx.select().from(quotes).where(eq(quotes.id, quoteId)).for("update").limit(1);
    if (!quote) throw new Error("Cotización no encontrada.");
    const current = normalizeQuoteStatus(quote.status, quote.workflowStatus);
    if (current !== "SENT" && current !== "FOLLOW_UP") throw new Error("Solo una cotización enviada puede revisarse.");
    const now = new Date();
    if (quote.currentVersionNumber > 0) await tx.update(quoteVersions).set({ status: "SUPERSEDED" }).where(and(eq(quoteVersions.quoteId, quoteId), eq(quoteVersions.versionNumber, quote.currentVersionNumber)));
    const [updated] = await tx.update(quotes).set({ workflowStatus: "DRAFT", status: "borrador", acceptedVersionId: null, acceptedAt: null, acceptedBy: null, responseChannel: null, responseNote: null, updatedAt: now, revision: quote.revision + 1 }).where(and(eq(quotes.id, quoteId), eq(quotes.revision, quote.revision))).returning();
    if (!updated) throw new Error("Esta cotización fue actualizada por otro usuario. Recarga los cambios.");
    await tx.insert(quoteStatusHistory).values({ id: id("quote-status"), quoteId, fromStatus: quote.status, toStatus: "borrador", changedBy: actor.userId ?? "system", note: `Nueva revisión basada en v${quote.currentVersionNumber}` });
    await tx.insert(auditLogs).values(audit(actor, "quote.version_created", "quote", quoteId, { workflowStatus: current, version: quote.currentVersionNumber }, { workflowStatus: "DRAFT", version: quote.currentVersionNumber + 1 }));
    return updated;
  });
}

export async function recordQuoteResponse(quoteId: string, input: { response: "ACCEPTED" | "REJECTED" | "NEEDS_CHANGES" | "NO_RESPONSE"; channel: QuoteResponseChannel; note?: string | null; rejectionCode?: string | null }, actor: Actor) {
  return getDb().transaction(async (tx) => {
    const [quote] = await tx.select().from(quotes).where(eq(quotes.id, quoteId)).for("update").limit(1);
    if (!quote) throw new Error("Cotización no encontrada.");
    const current = normalizeQuoteStatus(quote.status, quote.workflowStatus);
    if (current !== "SENT" && current !== "FOLLOW_UP") throw new Error("La respuesta solo aplica a cotizaciones enviadas o en seguimiento.");
    const now = new Date();
    const next: QuoteWorkflowStatus = input.response === "ACCEPTED" ? "ACCEPTED" : input.response === "REJECTED" ? "REJECTED" : "FOLLOW_UP";
    if (input.response === "REJECTED" && !text(input.note, 500)) throw new Error("El rechazo requiere un motivo.");
    const [version] = await tx.select().from(quoteVersions).where(and(eq(quoteVersions.quoteId, quoteId), eq(quoteVersions.versionNumber, quote.currentVersionNumber))).limit(1);
    if (input.response === "ACCEPTED" && !version) throw new Error("La aceptación necesita una versión comercial enviada.");
    if (version && input.response === "ACCEPTED") await tx.update(quoteVersions).set({ status: "ACCEPTED", acceptedAt: now, acceptedBy: actor.userId, acceptedChannel: input.channel, acceptanceNote: text(input.note, 500) || null }).where(eq(quoteVersions.id, version.id));
    const [updated] = await tx.update(quotes).set({ workflowStatus: next, status: legacyStatus(next), acceptedVersionId: input.response === "ACCEPTED" ? version?.id ?? null : null, acceptedAt: input.response === "ACCEPTED" ? now : null, acceptedBy: input.response === "ACCEPTED" ? actor.userId : null, responseChannel: input.channel, responseNote: text(input.note, 500) || null, respondedAt: now, respondedBy: actor.userId, rejectionReasonCode: input.response === "REJECTED" ? text(input.rejectionCode, 80) || "OTHER" : null, rejectionReason: input.response === "REJECTED" ? text(input.note, 500) : null, updatedAt: now, revision: quote.revision + 1 }).where(eq(quotes.id, quoteId)).returning();
    await tx.insert(quoteStatusHistory).values({ id: id("quote-status"), quoteId, fromStatus: quote.status, toStatus: legacyStatus(next), changedBy: actor.userId ?? "system", note: text(input.note, 500) || `Respuesta ${input.response} por ${input.channel}` });
    await tx.insert(auditLogs).values(audit(actor, `quote.${input.response.toLowerCase()}`, "quote", quoteId, { workflowStatus: current, acceptedVersionId: quote.acceptedVersionId }, { workflowStatus: next, acceptedVersionId: updated.acceptedVersionId, channel: input.channel }));
    return updated;
  });
}

export async function createQuoteFollowUp(quoteId: string, input: { dueAt: Date; title: string; note?: string | null; assignedTo?: string | null }, actor: Actor) {
  if (!input.dueAt || Number.isNaN(input.dueAt.getTime()) || !text(input.title, 180)) throw new Error("Fecha y siguiente acción son obligatorias.");
  return getDb().transaction(async (tx) => {
    const [quote] = await tx.select().from(quotes).where(eq(quotes.id, quoteId)).for("update").limit(1);
    if (!quote) throw new Error("Cotización no encontrada.");
    const current = normalizeQuoteStatus(quote.status, quote.workflowStatus);
    if (current !== "SENT" && current !== "FOLLOW_UP") throw new Error("El seguimiento requiere una cotización enviada.");
    const [link] = await tx.select().from(customerQuoteLinks).where(eq(customerQuoteLinks.quoteId, quoteId)).limit(1);
    const task = (await tx.insert(crmTasks).values({ id: id("task"), customerId: link?.customerId ?? null, opportunityId: link?.opportunityId ?? null, quoteId, title: text(input.title, 180), description: text(input.note, 1000) || null, status: "PENDING", assignedTo: input.assignedTo ?? quote.assignedSellerId, dueAt: input.dueAt, createdBy: actor.userId }).returning())[0];
    const now = new Date();
    if (current === "SENT") await tx.update(quotes).set({ workflowStatus: "FOLLOW_UP", status: legacyStatus("FOLLOW_UP"), updatedAt: now, revision: quote.revision + 1 }).where(eq(quotes.id, quoteId));
    if (link?.opportunityId) await tx.update(opportunities).set({ followUpAt: input.dueAt, nextAction: text(input.title, 240), updatedAt: now }).where(eq(opportunities.id, link.opportunityId));
    await tx.insert(crmActivities).values({ id: id("activity"), customerId: link?.customerId ?? null, opportunityId: link?.opportunityId ?? null, quoteId, type: "TASK", subject: `Seguimiento: ${text(input.title, 180)}`, body: text(input.note, 1000) || null, performedBy: actor.userId, dueAt: input.dueAt });
    await tx.insert(quoteStatusHistory).values({ id: id("quote-status"), quoteId, fromStatus: quote.status, toStatus: current === "SENT" ? legacyStatus("FOLLOW_UP") : quote.status, changedBy: actor.userId ?? "system", note: text(input.title, 180) });
    await tx.insert(auditLogs).values(audit(actor, "quote.follow_up_created", "quote", quoteId, { workflowStatus: current }, { workflowStatus: current === "SENT" ? "FOLLOW_UP" : current, taskId: task.id, dueAt: input.dueAt }));
    return task;
  });
}

export async function cancelQuote(quoteId: string, reason: string, actor: Actor) {
  const note = text(reason, 500);
  if (!note) throw new Error("La cancelación requiere un motivo.");
  return recordQuoteStatus(quoteId, "CANCELLED", actor, note);
}

export async function recordQuoteStatus(quoteId: string, next: QuoteWorkflowStatus, actor: Actor, note?: string | null) {
  return getDb().transaction(async (tx) => {
    const [before] = await tx.select().from(quotes).where(eq(quotes.id, quoteId)).for("update").limit(1);
    if (!before) throw new Error("Cotización no encontrada.");
    const current = normalizeQuoteStatus(before.status, before.workflowStatus);
    if (current === "LEGACY_CLOSED" || !canTransitionQuote(current, next)) throw new Error(`Transición no permitida: ${current} → ${next}.`);
    const now = new Date();
    const [after] = await tx.update(quotes).set({ workflowStatus: next, status: legacyStatus(next), cancellationReason: next === "CANCELLED" ? text(note, 500) : before.cancellationReason, cancelledBy: next === "CANCELLED" ? actor.userId : before.cancelledBy, cancelledAt: next === "CANCELLED" ? now : before.cancelledAt, updatedAt: now, revision: before.revision + 1 }).where(and(eq(quotes.id, quoteId), eq(quotes.revision, before.revision))).returning();
    if (!after) throw new Error("Esta cotización fue actualizada por otro usuario. Recarga los cambios.");
    await tx.insert(quoteStatusHistory).values({ id: id("quote-status"), quoteId, fromStatus: before.status, toStatus: legacyStatus(next), changedBy: actor.userId ?? "system", note: text(note, 500) || null });
    await tx.insert(auditLogs).values(audit(actor, `quote.${next.toLowerCase()}`, "quote", quoteId, { workflowStatus: current }, { workflowStatus: next, note: text(note, 500) || null }));
    return after;
  });
}

export async function approveQuoteDiscount(approvalId: string, approved: boolean, note: string | null, actor: Actor) {
  if (!can(actor.role as AppRole, "pricing.discount.approve")) throw new Error("No tienes permiso para aprobar descuentos.");
  return getDb().transaction(async (tx) => {
    const [approval] = await tx.select().from(quoteDiscountApprovals).where(eq(quoteDiscountApprovals.id, approvalId)).for("update").limit(1);
    if (!approval) throw new Error("Solicitud de descuento no encontrada.");
    if (approval.status !== "PENDING") return approval;
    const status = approved ? "APPROVED" : "REJECTED";
    const [updated] = await tx.update(quoteDiscountApprovals).set({ status, approvedBy: actor.userId, approvedAt: new Date(), note: text(note, 500) || null, updatedAt: new Date() }).where(eq(quoteDiscountApprovals.id, approvalId)).returning();
    const pending = await tx.select({ id: quoteDiscountApprovals.id }).from(quoteDiscountApprovals).where(and(eq(quoteDiscountApprovals.quoteId, approval.quoteId), eq(quoteDiscountApprovals.status, "PENDING")));
    await tx.update(quotes).set({ discountApprovalStatus: pending.length ? "PENDING" : approved ? "APPROVED" : "REJECTED", updatedAt: new Date() }).where(eq(quotes.id, approval.quoteId));
    await tx.insert(auditLogs).values(audit(actor, approved ? "quote.discount_approved" : "quote.discount_rejected", "quote_discount_approval", approvalId, approval, updated));
    return updated;
  });
}

export function parseAdminQuoteInput(value: Record<string, unknown>) {
  const items = Array.isArray(value.items) ? value.items.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const line = raw as Record<string, unknown>;
    const productId = text(line.productId, 160);
    const quantity = positiveInteger(line.quantity);
    return productId && quantity ? [{ productId, quantity, discountPercentage: line.discountPercentage as number | string | null, discountReason: text(line.discountReason, 240) || null }] : [];
  }) : [];
  const taxMode: QuoteTaxMode = value.taxMode === "INCLUDED" || value.taxMode === "EXCLUDED" || value.taxMode === "UNCONFIGURED" ? value.taxMode : "UNCONFIGURED";
  return { customerId: text(value.customerId, 160), opportunityId: text(value.opportunityId, 160) || null, message: text(value.message, 2000) || null, validUntil: dateValue(value.validUntil), taxMode, origin: text(value.origin, 30) || "LOCAL", items };
}
