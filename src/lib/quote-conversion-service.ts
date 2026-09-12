import { and, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, inventoryBalances, locations, quoteStatusHistory, quoteVersionItems, quoteVersions, quotes } from "@/db/schema";
import { customerQuoteLinks, customers, opportunities, opportunityStageHistory } from "@/db/crm-schema";
import { orderItems, orderStatusHistory, orders, payments, saleItems, sales } from "@/db/sales-schema";
import { reserveInventoryBatchInTransaction, type InventoryReservationInput } from "@/lib/inventory";
import { type DeliveryMethod } from "@/lib/sales-validation";
import { assertOpportunityTransition } from "@/lib/crm-validation";
import { assertCurrency, validateQuoteLine } from "@/lib/quote-pricing";

type Actor = { userId: string | null; role?: string | null };
type Input = { quoteId: string; locationId: string; deliveryMethod: DeliveryMethod; address: string | null };
type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

function id(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
function money(value: string | number | null | undefined) { const amount = Number(value ?? 0); if (!Number.isFinite(amount)) throw new Error("El monto de la cotización no es válido."); return amount.toFixed(2); }
function audit(actor: Actor, action: string, entityType: string, entityId: string, before: unknown, after: unknown, metadata?: Record<string, unknown>) { return { id: id("audit"), actorId: actor.userId, actorRole: actor.role ?? null, action, entityType, entityId, before: before as Record<string, unknown> | null, after: after as Record<string, unknown> | null, metadata: metadata ?? null }; }

async function findOrCreateCustomer(tx: Transaction, quote: typeof quotes.$inferSelect, actor: Actor) {
  const [link] = await tx.select().from(customerQuoteLinks).where(eq(customerQuoteLinks.quoteId, quote.id)).limit(1);
  if (link) {
    const [linked] = await tx.select().from(customers).where(eq(customers.id, link.customerId)).limit(1);
    if (!linked) throw new Error("El cliente vinculado a la cotización ya no existe.");
    return { customer: linked, link };
  }
  const duplicateConditions = [
    quote.documentNumber ? eq(customers.documentNumber, quote.documentNumber) : null,
    quote.email ? eq(customers.email, quote.email) : null,
    quote.phone ? or(eq(customers.phone, quote.phone), eq(customers.whatsapp, quote.phone)) : null,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  const existing = duplicateConditions.length ? (await tx.select().from(customers).where(or(...duplicateConditions)).limit(1))[0] : undefined;
  const customer = existing ?? (await tx.insert(customers).values({ id: id("customer"), userId: quote.userId, name: quote.name, documentNumber: quote.documentNumber || null, phone: quote.phone || null, whatsapp: quote.phone || null, email: quote.email, location: [quote.department, quote.province, quote.district].filter(Boolean).join(" / ") || null, customerType: quote.customerType === "company" ? "EMPRESA" : "CONSUMIDOR", status: "ACTIVE", assignedSellerId: quote.assignedSellerId ?? actor.userId }).returning())[0];
  if (!customer) throw new Error("No se pudo asociar la cotización a un cliente.");
  const createdLink = (await tx.insert(customerQuoteLinks).values({ id: id("quote-link"), customerId: customer.id, quoteId: quote.id, opportunityId: null }).returning())[0];
  return { customer, link: createdLink };
}

async function resolveOpportunity(tx: Transaction, quote: typeof quotes.$inferSelect, customerId: string, link: typeof customerQuoteLinks.$inferSelect | null, actor: Actor, currency: string, total: string) {
  if (link?.opportunityId) {
    const [opportunity] = await tx.select().from(opportunities).where(eq(opportunities.id, link.opportunityId)).for("update").limit(1);
    if (!opportunity || opportunity.customerId !== customerId) throw new Error("La oportunidad no pertenece al cliente de la cotización.");
    if (opportunity.stage !== "SALE") {
      assertOpportunityTransition(opportunity.stage, "SALE");
      await tx.update(opportunities).set({ stage: "SALE", totalAmount: total, currency, assignedSellerId: opportunity.assignedSellerId ?? quote.assignedSellerId ?? actor.userId, updatedAt: new Date() }).where(eq(opportunities.id, opportunity.id));
      await tx.insert(opportunityStageHistory).values({ id: id("opportunity-stage"), opportunityId: opportunity.id, fromStage: opportunity.stage, toStage: "SALE", changedBy: actor.userId ?? "system", note: "Cotización aceptada convertida en venta" });
      await tx.insert(auditLogs).values(audit(actor, "crm.opportunity_stage_changed", "opportunity", opportunity.id, { stage: opportunity.stage }, { stage: "SALE" }, { source: "quote_conversion" }));
    }
    return { ...opportunity, stage: "SALE" as const, assignedSellerId: opportunity.assignedSellerId ?? quote.assignedSellerId ?? actor.userId };
  }
  const created = (await tx.insert(opportunities).values({ id: id("opportunity"), code: `OP-${quote.trackingCode}`, customerId, quoteId: quote.id, title: quote.productName ? `Cotización: ${quote.productName}` : "Venta desde cotización", origin: quote.origin === "WEB" ? "WEB" : "LOCAL", stage: "SALE", assignedSellerId: quote.assignedSellerId ?? actor.userId, totalAmount: total, currency, createdBy: actor.userId }).returning())[0];
  if (!created) throw new Error("No se pudo crear la oportunidad comercial.");
  await tx.update(customerQuoteLinks).set({ opportunityId: created.id }).where(eq(customerQuoteLinks.quoteId, quote.id));
  await tx.insert(opportunityStageHistory).values({ id: id("opportunity-stage"), opportunityId: created.id, toStage: "SALE", changedBy: actor.userId ?? "system", note: "Oportunidad creada por conversión de cotización aceptada" });
  await tx.insert(auditLogs).values(audit(actor, "crm.opportunity_created", "opportunity", created.id, null, created, { source: "quote_conversion" }));
  return created;
}

export async function getQuoteConversionPreview(quoteId: string) {
  const db = getDb();
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!quote) throw new Error("Cotización no encontrada.");
  if (quote.workflowStatus !== "ACCEPTED" || !quote.acceptedVersionId) throw new Error("Solo una cotización aceptada con versión aprobada puede convertirse.");
  const [version, activeLocations, existingSale] = await Promise.all([
    db.select().from(quoteVersions).where(and(eq(quoteVersions.id, quote.acceptedVersionId), eq(quoteVersions.quoteId, quote.id))).limit(1),
    db.select({ id: locations.id, name: locations.name, address: locations.address }).from(locations).where(eq(locations.active, true)).orderBy(locations.name),
    db.select({ id: sales.id, code: sales.code }).from(sales).where(eq(sales.quoteId, quote.id)).limit(1),
  ]);
  if (!version[0] || version[0].status !== "ACCEPTED") throw new Error("La versión aceptada ya no está disponible.");
  const items = await db.select().from(quoteVersionItems).where(eq(quoteVersionItems.versionId, version[0].id));
  return { quote, version: version[0], items, locations: activeLocations, existingSale: existingSale[0] ?? null };
}

export async function convertQuoteToSale(input: Input, actor: Actor) {
  if (!input.quoteId || !input.locationId) throw new Error("La conversión necesita cotización y local.");
  if (input.deliveryMethod !== "PICKUP" && !input.address?.trim()) throw new Error("La dirección es obligatoria para la entrega.");
  return getDb().transaction(async (tx) => {
    const [quote] = await tx.select().from(quotes).where(eq(quotes.id, input.quoteId)).for("update").limit(1);
    if (!quote) throw new Error("Cotización no encontrada.");
    const [existingSale] = await tx.select().from(sales).where(eq(sales.quoteId, input.quoteId)).limit(1);
    if (existingSale) {
      const [existingOrder] = await tx.select().from(orders).where(eq(orders.saleId, existingSale.id)).limit(1);
      return { sale: existingSale, order: existingOrder ?? null, reservations: [], idempotent: true };
    }
    if (quote.workflowStatus !== "ACCEPTED" || !quote.acceptedVersionId) throw new Error("La cotización debe estar aceptada antes de convertirse en venta.");
    const [version] = await tx.select().from(quoteVersions).where(and(eq(quoteVersions.id, quote.acceptedVersionId), eq(quoteVersions.quoteId, quote.id))).for("update").limit(1);
    if (!version || version.status !== "ACCEPTED") throw new Error("La versión aceptada no está disponible para conversión.");
    const versionLines = await tx.select().from(quoteVersionItems).where(eq(quoteVersionItems.versionId, version.id));
    if (!versionLines.length) throw new Error("La versión aceptada no tiene líneas persistidas.");
    for (const line of versionLines) validateQuoteLine(line);
    const currency = assertCurrency(version.currency);
    if (versionLines.some((line) => line.currency !== currency)) throw new Error("La venta no puede mezclar monedas.");
    const subtotal = money(version.subtotal);
    const discountAmount = money(version.discountAmount);
    const total = money(version.total);
    const [location] = await tx.select().from(locations).where(and(eq(locations.id, input.locationId), eq(locations.active, true))).limit(1);
    if (!location) throw new Error("El local no está activo o no existe.");
    const balances = await tx.select({ productId: inventoryBalances.productId, onHand: inventoryBalances.onHand, reserved: inventoryBalances.reserved }).from(inventoryBalances).where(and(eq(inventoryBalances.locationId, input.locationId), inArray(inventoryBalances.productId, versionLines.map((line) => line.productId)))).for("update");
    const balanceByProduct = new Map(balances.map((balance) => [balance.productId, balance]));
    for (const line of versionLines) {
      const balance = balanceByProduct.get(line.productId);
      if (!balance) throw new Error(`INVENTORY_UNKNOWN: No hay saldo cuantitativo confirmado para ${line.skuSnapshot} en ${location.name}.`);
      if (balance.onHand - balance.reserved < line.quantity) throw new Error(`Stock insuficiente para ${line.skuSnapshot} en ${location.name}.`);
    }
    const { customer, link } = await findOrCreateCustomer(tx, quote, actor);
    const opportunity = await resolveOpportunity(tx, quote, customer.id, link, actor, currency, total);
    const sellerId = opportunity.assignedSellerId ?? quote.assignedSellerId ?? actor.userId;
    const now = new Date();
    const saleId = id("sale");
    const orderId = id("order");
    const saleCode = `VTA-${crypto.randomUUID().slice(0, 10).toUpperCase()}`;
    const orderCode = `ORD-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const [sale] = await tx.insert(sales).values({ id: saleId, code: saleCode, customerId: customer.id, opportunityId: opportunity.id, quoteId: quote.id, status: "CONFIRMED", sellerId, subtotal, discountAmount, total, currency, idempotencyKey: `quote-convert-${quote.id}`, createdAt: now, updatedAt: now }).returning();
    await tx.insert(saleItems).values(versionLines.map((line) => ({ id: id("sale-item"), saleId, productId: line.productId, skuSnapshot: line.skuSnapshot, productNameSnapshot: line.productNameSnapshot, quantity: line.quantity, unitPrice: line.finalUnitPrice!, currency, discountAmount: (Number(line.discountAmount ?? 0) * line.quantity).toFixed(2), lineTotal: line.lineTotal! })));
    const [order] = await tx.insert(orders).values({ id: orderId, code: orderCode, saleId, customerId: customer.id, opportunityId: opportunity.id, status: "PAYMENT_PENDING", deliveryMethod: input.deliveryMethod, locationId: input.locationId, deliveryAddress: input.address?.trim() || null, customerNameSnapshot: customer.name, customerPhoneSnapshot: customer.phone ?? customer.whatsapp ?? quote.phone, customerEmailSnapshot: customer.email ?? quote.email, sellerId, subtotal, discountAmount, total, currency, idempotencyKey: `quote-convert-${quote.id}`, createdAt: now, updatedAt: now }).returning();
    const reservationInputs: InventoryReservationInput[] = versionLines.map((line) => ({ productId: line.productId, locationId: input.locationId, quantity: line.quantity, referenceType: "order", referenceId: orderId, performedBy: actor.userId ?? undefined, performedByRole: actor.role ?? undefined, idempotencyKey: `quote-convert-${quote.id}:${line.productId}` }));
    const reservations = await reserveInventoryBatchInTransaction(tx, reservationInputs);
    await tx.insert(orderItems).values(versionLines.map((line) => ({ id: id("order-item"), orderId, productId: line.productId, skuSnapshot: line.skuSnapshot, productNameSnapshot: line.productNameSnapshot, quantity: line.quantity, unitPrice: line.finalUnitPrice!, currency, lineTotal: line.lineTotal!, reservationId: reservations.find((reservation) => reservation.productId === line.productId)?.reservationId ?? null })));
    await tx.insert(payments).values({ id: id("payment"), orderId, methodType: "PROVIDER", method: "UNCONFIGURED", provider: null, providerReference: null, amount: total, currency, status: "PENDING", metadata: { reason: "provider_not_configured", source: "quote_conversion", quoteVersionId: version.id }, createdBy: actor.userId });
    await tx.update(quotes).set({ status: "convertida", workflowStatus: "CONVERTED", updatedAt: now, revision: quote.revision + 1 }).where(eq(quotes.id, quote.id));
    await tx.insert(quoteStatusHistory).values({ id: id("quote-status"), quoteId: quote.id, fromStatus: quote.status, toStatus: "convertida", changedBy: actor.userId ?? "system", note: `Convertida en venta ${sale.code}` });
    await tx.insert(orderStatusHistory).values({ id: id("order-status"), orderId, fromStatus: null, toStatus: "PAYMENT_PENDING", changedBy: actor.userId ?? "system", note: "Pedido creado desde cotización aceptada" });
    await tx.insert(auditLogs).values(audit(actor, "sales.quote_converted", "quote", quote.id, { workflowStatus: quote.workflowStatus, acceptedVersionId: quote.acceptedVersionId }, { workflowStatus: "CONVERTED", saleId, orderId, quoteVersionId: version.id }, { reservationCount: reservations.length, sellerId }));
    return { sale, order, reservations, idempotent: false };
  });
}
