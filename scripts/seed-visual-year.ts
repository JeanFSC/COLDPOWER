import { and, asc, eq, gte, isNull, like, or } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getDb } from "../src/db";
import {
  auditLogs,
  categories,
  companySettings,
  crmActivities,
  crmTasks,
  customers,
  inventoryBalances,
  inventoryMovements,
  locations,
  opportunityItems,
  opportunityStageHistory,
  opportunities,
  orderItems,
  orderStatusHistory,
  orders,
  paymentStatusHistory,
  payments,
  productPrices,
  products,
  quoteItems,
  quoteStatusHistory,
  quotes,
  saleItems,
  sales,
  users,
} from "../src/db/combined-schema";
import { assertDevDatabaseTarget, assertDevMockSeedAllowed } from "../src/lib/dev-mock-fixtures";

const PAYMENT_METHODS = ["CREDIT_CARD", "DEBIT_CARD", "YAPE", "PLIN", "CASH"] as const;
const FIXTURE_SOURCE = "visual-year-seed";

function fixtureYear() {
  const value = Number(process.env.CP_VISUAL_FIXTURE_YEAR ?? "2026");
  if (!Number.isInteger(value) || value < 2000 || value > 2100) {
    throw new Error("CP_VISUAL_FIXTURE_YEAR debe ser un año válido entre 2000 y 2100.");
  }
  return value;
}

function dateAt(year: number, month: number, day: number, hour = 15) {
  return new Date(Date.UTC(year, month, day, hour, 0, 0));
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function money(value: number) {
  return value.toFixed(2);
}

function id(fixture: string, entity: string, key: string) {
  return `${fixture}-${entity}-${key}`;
}

// Drizzle's transaction/table generic is intentionally kept at the boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertRows(tx: any, table: any, rows: any[]) {
  if (!rows.length) return 0;
  const inserted = await tx.insert(table).values(rows).onConflictDoNothing().returning({ id: table.id });
  return inserted.length;
}

export async function seedVisualYearData() {
  const year = fixtureYear();
  const fixture = `cp-visual-year-${year}`;
  const db = getDb();

  return db.transaction(async (tx) => {
    const [actor] = await tx
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.roleCode, "SUPERADMIN"), eq(users.status, "ACTIVE")))
      .orderBy(asc(users.createdAt))
      .limit(1);
    if (!actor) throw new Error("No existe un SUPERADMIN activo para atribuir el fixture anual.");

    const activeUsers = await tx
      .select({ id: users.id, name: users.name, email: users.email, roleCode: users.roleCode })
      .from(users)
      .where(eq(users.status, "ACTIVE"))
      .orderBy(asc(users.createdAt))
      .limit(100);
    const sellers = activeUsers.filter((user) => Boolean(user.roleCode));
    const sellerPool = sellers.length ? sellers : [actor];

    const customerRows = await tx
      .select({ id: customers.id, name: customers.name, phone: customers.phone, email: customers.email, address: customers.address, ruc: customers.ruc, documentNumber: customers.documentNumber })
      .from(customers)
      .where(eq(customers.status, "ACTIVE"))
      .orderBy(asc(customers.createdAt))
      .limit(100);
    if (!customerRows.length) throw new Error("No existen clientes activos para el fixture anual.");

    const locationRows = await tx
      .select({ id: locations.id, name: locations.name })
      .from(locations)
      .where(eq(locations.active, true))
      .orderBy(asc(locations.code))
      .limit(20);
    if (!locationRows.length) throw new Error("No existen ubicaciones activas para el fixture anual.");

    const catalogRows = await tx
      .select({ id: products.id, sku: products.sku, slug: products.slug, originalName: products.originalName, normalizedName: products.normalizedName, commercialName: products.commercialName })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.status, "Activo"))
      .orderBy(asc(products.sku))
      .limit(2000);
    if (!catalogRows.length) throw new Error("No existen productos activos para el fixture anual.");

    const productName = (product: (typeof catalogRows)[number]) => product.commercialName ?? product.normalizedName ?? product.originalName;
    const records = Array.from({ length: 12 * 4 }, (_, index) => {
      const month = Math.floor(index / 4);
      const position = index % 4;
      const createdAt = dateAt(year, month, [5, 12, 19, 26][position]);
      const customer = customerRows[index % customerRows.length];
      const product = catalogRows[index % catalogRows.length];
      const seller = sellerPool[index % sellerPool.length];
      const total = 180 + ((index * 137) % 2600);
      const quantity = 1 + (index % 4);
      const quoteStatus = ["enviada", "cerrada", "cerrada", "aprobada", "convertida", "cerrada", "borrador", "evaluacion", "cerrada", "aprobada", "convertida", "cerrada"][month];
      const workflowStatus = ["SENT", "REJECTED", "EXPIRED", "ACCEPTED", "CONVERTED", "REJECTED", "DRAFT", "FOLLOW_UP", "EXPIRED", "ACCEPTED", "CONVERTED", "EXPIRED"][month];
      const opportunityStage = ["NEW", "QUOTE_SENT", "FOLLOW_UP", "NEGOTIATION", "ACCEPTED", "SALE", "LOST", "NO_RESPONSE", "ACCEPTED", "SALE", "CLOSED", "CLOSED"][month];
      const saleStatus = month === 6 ? "CANCELLED" : "CONFIRMED";
      const orderStatus = month === 6 ? "CANCELLED" : ["DELIVERED", "DELIVERED", "PAID", "PAYMENT_PENDING", "PAYMENT_PENDING", "IN_TRANSIT", "CANCELLED", "PAYMENT_PENDING", "DELIVERED", "PAID", "READY_FOR_PICKUP", "DELIVERED"][month];
      const paymentStatus = month === 6 ? "CANCELLED" : ["APPROVED", "CONFIRMED", "CONFIRMED", "PENDING", "UNDER_REVIEW", "CONFIRMED", "CANCELLED", "PENDING", "APPROVED", "CONFIRMED", "UNDER_REVIEW", "CONFIRMED"][month];
      const method = PAYMENT_METHODS[index % PAYMENT_METHODS.length];
      return { index, month, createdAt, customer, product, seller, total, quantity, quoteStatus, workflowStatus, opportunityStage, saleStatus, orderStatus, paymentStatus, method };
    });

    const quoteRows = records.map((record) => {
      const key = String(record.index + 1).padStart(3, "0");
      return {
        id: id(fixture, "quote", key), trackingCode: `CP-COT-${year}-${key}`, userId: record.seller.id,
        name: record.customer.name, customerType: "company", documentNumber: record.customer.ruc ?? record.customer.documentNumber ?? "", phone: record.customer.phone ?? "", email: record.customer.email,
        department: "Lima", province: "Lima", district: "Miraflores", preferredContact: record.index % 2 ? "email" : "whatsapp", consentAt: record.createdAt,
        productSlug: record.product.slug, productName: productName(record.product), sku: record.product.sku, message: `Solicitud anual de prueba para ${productName(record.product)}.`, status: record.quoteStatus, workflowStatus: record.workflowStatus,
        assignedSellerId: record.seller.id, origin: record.index % 3 === 0 ? "WHATSAPP" : record.index % 3 === 1 ? "WEB" : "TELEFONO", currency: "PEN", subtotal: money(record.total), discountAmount: "0.00", taxAmount: "0.00", total: money(record.total), taxMode: "UNCONFIGURED", discountApprovalStatus: "NOT_REQUIRED",
        validUntil: addHours(record.createdAt, 24 * 30), sentAt: record.workflowStatus === "DRAFT" ? null : record.createdAt, sentBy: record.workflowStatus === "DRAFT" ? null : record.seller.id,
        respondedAt: ["ACCEPTED", "CONVERTED", "REJECTED", "EXPIRED"].includes(record.workflowStatus) ? addHours(record.createdAt, 48) : null, respondedBy: ["ACCEPTED", "CONVERTED", "REJECTED", "EXPIRED"].includes(record.workflowStatus) ? record.seller.id : null,
        createdAt: record.createdAt, updatedAt: addHours(record.createdAt, 8),
      };
    });
    const quoteItemRows = records.map((record) => {
      const key = String(record.index + 1).padStart(3, "0");
      const unitPrice = record.total / record.quantity;
      return { id: id(fixture, "quote-item", key), quoteId: id(fixture, "quote", key), productId: record.product.id, skuSnapshot: record.product.sku, productNameSnapshot: productName(record.product), quantity: record.quantity, baseUnitPrice: money(unitPrice), discountPercentage: "0.00", discountAmount: "0.00", finalUnitPrice: money(unitPrice), lineTotal: money(record.total), currency: "PEN", priceType: "RETAIL", createdAt: record.createdAt, updatedAt: addHours(record.createdAt, 1) };
    });
    const quoteHistoryRows = records.map((record) => {
      const key = String(record.index + 1).padStart(3, "0");
      return { id: id(fixture, "quote-history", key), quoteId: id(fixture, "quote", key), fromStatus: null, toStatus: record.quoteStatus, changedBy: actor.id, note: `Fixture visual ${year}: estado inicial mensual.`, createdAt: record.createdAt };
    });

    const opportunityRows = records.map((record) => {
      const key = String(record.index + 1).padStart(3, "0");
      return { id: id(fixture, "opportunity", key), code: `OPP-${year}-${key}`, customerId: record.customer.id, quoteId: id(fixture, "quote", key), title: `Proyecto mensual ${year}-${String(record.month + 1).padStart(2, "0")}-${key}`, origin: record.index % 3 === 0 ? "WHATSAPP" : record.index % 3 === 1 ? "WEB" : "TELEFONO", stage: record.opportunityStage, assignedSellerId: record.seller.id, totalAmount: money(record.total), currency: "PEN", discountPercentage: record.index % 4 === 0 ? "5.00" : "0.00", marginAmount: money(record.total * 0.3), lastContactAt: addHours(record.createdAt, 24), nextAction: ["CLOSED", "LOST"].includes(record.opportunityStage) ? null : "Confirmar especificaciones y despacho", followUpAt: addHours(record.createdAt, 24 * (record.opportunityStage === "FOLLOW_UP" ? 2 : 7)), notes: `Oportunidad de prueba del mes ${record.month + 1}.`, createdBy: actor.id, createdAt: record.createdAt, updatedAt: addHours(record.createdAt, 12) };
    });
    const opportunityItemRows = records.map((record) => {
      const key = String(record.index + 1).padStart(3, "0");
      return { id: id(fixture, "opportunity-item", key), opportunityId: id(fixture, "opportunity", key), productId: record.product.id, skuSnapshot: record.product.sku, productNameSnapshot: productName(record.product), quantity: record.quantity, unitPrice: money(record.total / record.quantity), currency: "PEN", discountPercentage: "0.00", lineTotal: money(record.total), createdAt: record.createdAt };
    });
    const opportunityHistoryRows = records.map((record) => {
      const key = String(record.index + 1).padStart(3, "0");
      return { id: id(fixture, "opportunity-history", key), opportunityId: id(fixture, "opportunity", key), fromStage: null, toStage: record.opportunityStage, changedBy: actor.id, note: `Fixture visual ${year}: etapa mensual.`, createdAt: record.createdAt };
    });

    const saleRows = records.map((record) => {
      const key = String(record.index + 1).padStart(3, "0");
      return { id: id(fixture, "sale", key), code: `VTA-${year}-${key}`, customerId: record.customer.id, opportunityId: id(fixture, "opportunity", key), quoteId: id(fixture, "quote", key), status: record.saleStatus, sellerId: record.seller.id, channel: record.index % 3 === 0 ? "WHATSAPP" : record.index % 3 === 1 ? "WEB" : "TELEFONO", subtotal: money(record.total), discountAmount: "0.00", total: money(record.total), currency: "PEN", notes: `Venta de visualización mensual ${year}.`, idempotencyKey: id(fixture, "sale-key", key), invoiceStatus: record.saleStatus === "CANCELLED" ? "CANCELLED" : record.month % 5 === 0 ? "ERROR" : record.month % 3 === 0 ? "PENDING" : "ISSUED", externalInvoiceReference: record.saleStatus === "CANCELLED" ? null : `BOL-${year}-${key}`, invoiceIssuedAt: record.saleStatus === "CANCELLED" || record.month % 3 === 0 ? null : addHours(record.createdAt, 24), createdAt: record.createdAt, updatedAt: addHours(record.createdAt, 18) };
    });
    const saleItemRows = records.map((record) => {
      const key = String(record.index + 1).padStart(3, "0");
      return { id: id(fixture, "sale-item", key), saleId: id(fixture, "sale", key), productId: record.product.id, skuSnapshot: record.product.sku, productNameSnapshot: productName(record.product), quantity: record.quantity, unitPrice: money(record.total / record.quantity), costSnapshot: money((record.total / record.quantity) * 0.62), currency: "PEN", discountAmount: "0.00", lineTotal: money(record.total), createdAt: record.createdAt };
    });

    const orderRows = records.map((record) => {
      const key = String(record.index + 1).padStart(3, "0");
      const location = locationRows[record.index % locationRows.length];
      const delivered = record.orderStatus === "DELIVERED";
      const cancelled = record.orderStatus === "CANCELLED";
      return { id: id(fixture, "order", key), code: `PED-${year}-${key}`, saleId: id(fixture, "sale", key), customerId: record.customer.id, opportunityId: id(fixture, "opportunity", key), status: record.orderStatus, deliveryMethod: record.index % 3 === 0 ? "DELIVERY" : record.index % 3 === 1 ? "SHIPPING" : "PICKUP", locationId: location.id, deliveryAddress: record.customer.address ?? "Lima", customerNameSnapshot: record.customer.name, customerPhoneSnapshot: record.customer.phone ?? "", customerEmailSnapshot: record.customer.email, sellerId: record.seller.id, subtotal: money(record.total), discountAmount: "0.00", total: money(record.total), currency: "PEN", idempotencyKey: id(fixture, "order-key", key), cancellationReason: cancelled ? "Cancelación de prueba para validar estados." : null, cancelledBy: cancelled ? actor.id : null, cancelledAt: cancelled ? addHours(record.createdAt, 24) : null, deliveredAt: delivered ? addHours(record.createdAt, 24 * 3) : null, receivedBy: delivered ? actor.id : null, createdAt: record.createdAt, updatedAt: addHours(record.createdAt, 20) };
    });
    const orderItemRows = records.map((record) => {
      const key = String(record.index + 1).padStart(3, "0");
      const picked = ["DELIVERED", "PAID", "IN_TRANSIT"].includes(record.orderStatus) ? record.quantity : 0;
      return { id: id(fixture, "order-item", key), orderId: id(fixture, "order", key), productId: record.product.id, skuSnapshot: record.product.sku, productNameSnapshot: productName(record.product), quantity: record.quantity, pickedQuantity: picked, pickedAt: picked ? addHours(record.createdAt, 24) : null, pickedBy: picked ? actor.id : null, unitPrice: money(record.total / record.quantity), currency: "PEN", lineTotal: money(record.total), createdAt: record.createdAt };
    });
    const paymentRows = records.map((record) => {
      const key = String(record.index + 1).padStart(3, "0");
      const providerMethod = record.method !== "CASH";
      return { id: id(fixture, "payment", key), orderId: id(fixture, "order", key), methodType: providerMethod ? "PROVIDER" : "MANUAL", method: record.method, provider: providerMethod ? "development-gateway" : "manual-cash", providerReference: `PAY-${year}-${key}`, idempotencyKey: id(fixture, "payment-key", key), amount: money(record.total), currency: "PEN", status: record.paymentStatus, metadata: { fixture, source: FIXTURE_SOURCE, acceptedMethods: [...PAYMENT_METHODS] }, createdBy: actor.id, createdAt: addHours(record.createdAt, 4), updatedAt: addHours(record.createdAt, 16) };
    });
    const paymentHistoryRows = records.map((record) => {
      const key = String(record.index + 1).padStart(3, "0");
      return { id: id(fixture, "payment-history", key), paymentId: id(fixture, "payment", key), fromStatus: null, toStatus: record.paymentStatus, changedBy: actor.id, actorRole: "SUPERADMIN", provider: record.method === "CASH" ? "manual-cash" : "development-gateway", reason: `Fixture visual ${year}: estado de pago mensual.`, createdAt: addHours(record.createdAt, 4) };
    });
    const orderHistoryRows = records.map((record) => {
      const key = String(record.index + 1).padStart(3, "0");
      return { id: id(fixture, "order-history", key), orderId: id(fixture, "order", key), fromStatus: null, toStatus: record.orderStatus, changedBy: actor.id, note: `Fixture visual ${year}: estado de pedido mensual.`, createdAt: addHours(record.createdAt, 20) };
    });

    const activityRows = records.map((record) => {
      const key = String(record.index + 1).padStart(3, "0");
      const dueAt = addHours(record.createdAt, record.index % 4 === 0 ? -24 : 24 * 5);
      return { id: id(fixture, "crm-activity", key), customerId: record.customer.id, opportunityId: id(fixture, "opportunity", key), quoteId: id(fixture, "quote", key), type: record.index % 4 === 0 ? "CALL" : record.index % 4 === 1 ? "WHATSAPP" : record.index % 4 === 2 ? "EMAIL" : "MEETING", subject: `Seguimiento comercial ${year}-${String(record.month + 1).padStart(2, "0")}`, body: "Actividad anual para validar cronología, estados y pendientes.", result: record.index % 3 === 0 ? "Contacto efectivo" : "Pendiente de respuesta", occurredAt: record.createdAt, nextAction: "Confirmar especificaciones y despacho", nextActionAt: addHours(record.createdAt, 24 * 7), performedBy: record.seller.id, dueAt, completedAt: record.index % 3 === 0 ? addHours(record.createdAt, 24) : null, idempotencyKey: id(fixture, "crm-activity-key", key), createdAt: record.createdAt };
    });
    const taskRows = records.map((record) => {
      const key = String(record.index + 1).padStart(3, "0");
      const completed = record.index % 4 === 0;
      return { id: id(fixture, "crm-task", key), customerId: record.customer.id, opportunityId: id(fixture, "opportunity", key), quoteId: id(fixture, "quote", key), title: `Tarea mensual ${year}-${String(record.month + 1).padStart(2, "0")}`, description: "Validar siguiente acción del cliente y disponibilidad de producto.", status: completed ? "COMPLETED" : "PENDING", assignedTo: record.seller.id, dueAt: addHours(record.createdAt, completed ? 24 : -24), completedAt: completed ? addHours(record.createdAt, 24) : null, createdBy: actor.id, idempotencyKey: id(fixture, "crm-task-key", key), createdAt: record.createdAt, updatedAt: addHours(record.createdAt, 12) };
    });

    const auditRows = records.flatMap((record) => {
      const key = String(record.index + 1).padStart(3, "0");
      const entities = [
        ["quote", id(fixture, "quote", key), "quotes.created"],
        ["opportunity", id(fixture, "opportunity", key), "opportunities.created"],
        ["sale", id(fixture, "sale", key), "sales.created"],
        ["order", id(fixture, "order", key), "orders.created"],
        ["payment", id(fixture, "payment", key), "payments.created"],
        ["customer", record.customer.id, "customers.created"],
        ["product", record.product.id, "pricing.price_updated"],
        ["inventory", id(fixture, "order", key), "inventory.adjustment"],
        ["product", record.product.id, "catalog.product_editorial_updated"],
        ["product", record.product.id, "catalog.media_associated"],
      ] as const;
      return entities.map(([entityType, entityId, action], entityIndex) => ({ id: id(fixture, "audit", `${key}-${entityIndex + 1}`), actorId: actor.id, actorRole: "SUPERADMIN", action, entityType, entityId, module: entityType === "payment" ? "payments" : entityType === "opportunity" ? "pipeline" : `${entityType}s`, severity: "INFO", origin: "DEV_VISUAL_YEAR_SEED", correlationId: fixture, after: { fixture, month: record.month + 1 }, metadata: { source: FIXTURE_SOURCE, year }, createdAt: addHours(record.createdAt, entityIndex) }));
    });

    const existingDevelopmentSaleItems = await tx
      .select({ itemId: saleItems.id, productId: saleItems.productId })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(and(isNull(saleItems.costSnapshot), or(like(sales.id, "cp-dashboard-v5-sale-%"), like(sales.id, "cp-mock-v1-sale-%"), like(sales.id, "cp-dashboard-v2-sale-%"), like(sales.id, "cp-dashboard-v3-sale-%"), like(sales.id, "cp-dashboard-v4-sale-%"))));
    const developmentCostRows = await tx
      .select({ productId: productPrices.productId, amount: productPrices.amount })
      .from(productPrices)
      .where(and(eq(productPrices.priceType, "COST"), eq(productPrices.currency, "PEN"), eq(productPrices.status, "ACTIVE"), eq(productPrices.active, true)));
    const costByProduct = new Map(developmentCostRows.map((row) => [row.productId, row.amount]));
    let repairedCostSnapshots = 0;
    for (const item of existingDevelopmentSaleItems) {
      const cost = costByProduct.get(item.productId);
      if (cost == null) continue;
      await tx.update(saleItems).set({ costSnapshot: cost }).where(eq(saleItems.id, item.itemId));
      repairedCostSnapshots += 1;
    }

    // Keep the operational "without recent movement" signal meaningful in the
    // visual environment without changing any persisted stock balance. Only
    // products that already have a real balance receive this trace, and the
    // resulting quantities mirror that balance exactly.
    const recentMovementCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentMovementProducts = await tx
      .select({ productId: inventoryMovements.productId })
      .from(inventoryMovements)
      .where(gte(inventoryMovements.createdAt, recentMovementCutoff));
    const recentMovementProductIds = new Set(recentMovementProducts.map((row) => row.productId));
    const balanceCandidates = await tx
      .select({ productId: inventoryBalances.productId, locationId: inventoryBalances.locationId, onHand: inventoryBalances.onHand, reserved: inventoryBalances.reserved })
      .from(inventoryBalances)
      .innerJoin(products, eq(inventoryBalances.productId, products.id))
      .where(eq(products.status, "Activo"));
    const balanceByProduct = new Map<string, (typeof balanceCandidates)[number]>();
    for (const row of balanceCandidates) {
      if (!recentMovementProductIds.has(row.productId) && !balanceByProduct.has(row.productId)) balanceByProduct.set(row.productId, row);
    }
    const visualMovementRows = [...balanceByProduct.values()].map((row) => {
      const hasStock = row.onHand > 0;
      return {
        id: id(fixture, "movement", `${row.productId}-${row.locationId}`), productId: row.productId, locationId: row.locationId,
        type: hasStock ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT", quantity: 1,
        previousOnHand: hasStock ? row.onHand - 1 : 1, resultingOnHand: row.onHand,
        previousReserved: row.reserved, resultingReserved: row.reserved,
        referenceType: "DEV_VISUAL_YEAR", referenceId: fixture, reason: "Movimiento de prueba para validación visual del inventario.",
        notes: "Traza aditiva; no modifica el saldo persistido.", performedBy: actor.id, idempotencyKey: id(fixture, "movement-key", `${row.productId}-${row.locationId}`), createdAt: new Date(),
      };
    });

    const counts = {
      quotes: await insertRows(tx, quotes, quoteRows), quoteItems: await insertRows(tx, quoteItems, quoteItemRows), quoteHistory: await insertRows(tx, quoteStatusHistory, quoteHistoryRows),
      opportunities: await insertRows(tx, opportunities, opportunityRows), opportunityItems: await insertRows(tx, opportunityItems, opportunityItemRows), opportunityHistory: await insertRows(tx, opportunityStageHistory, opportunityHistoryRows),
      sales: await insertRows(tx, sales, saleRows), saleItems: await insertRows(tx, saleItems, saleItemRows), orders: await insertRows(tx, orders, orderRows), orderItems: await insertRows(tx, orderItems, orderItemRows),
      orderHistory: await insertRows(tx, orderStatusHistory, orderHistoryRows), payments: await insertRows(tx, payments, paymentRows), paymentHistory: await insertRows(tx, paymentStatusHistory, paymentHistoryRows), activities: await insertRows(tx, crmActivities, activityRows), tasks: await insertRows(tx, crmTasks, taskRows), audits: await insertRows(tx, auditLogs, auditRows), movements: await insertRows(tx, inventoryMovements, visualMovementRows),
    };

    for (const quote of quoteRows) {
      await tx.update(quotes).set({ status: quote.status as (typeof quotes.$inferInsert)["status"], workflowStatus: quote.workflowStatus, validUntil: quote.validUntil, sentAt: quote.sentAt, sentBy: quote.sentBy, respondedAt: quote.respondedAt, respondedBy: quote.respondedBy, updatedAt: quote.updatedAt }).where(eq(quotes.id, quote.id));
    }
    for (const history of quoteHistoryRows) {
      await tx.update(quoteStatusHistory).set({ toStatus: history.toStatus as (typeof quoteStatusHistory.$inferInsert)["toStatus"], createdAt: history.createdAt }).where(eq(quoteStatusHistory.id, history.id));
    }

    await tx
      .insert(companySettings)
      .values({ id: "default", paymentMethods: [...PAYMENT_METHODS], updatedBy: actor.id, updatedAt: new Date() })
      .onConflictDoUpdate({ target: companySettings.id, set: { paymentMethods: [...PAYMENT_METHODS], updatedBy: actor.id, updatedAt: new Date() } });

    return { fixture, year, months: 12, recordsPerMonth: 4, acceptedPaymentMethods: [...PAYMENT_METHODS], repairedCostSnapshots, counts };
  });
}

async function main() {
  assertDevMockSeedAllowed(process.env, process.argv);
  assertDevDatabaseTarget(process.env, process.argv);
  console.log(JSON.stringify(await seedVisualYearData(), null, 2));
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  main().catch((error) => {
    const cause = error && typeof error === "object" && "cause" in error ? (error as { cause?: unknown }).cause : undefined;
    console.error(error instanceof Error ? error.message : error);
    if (cause) console.error(`Cause: ${cause instanceof Error ? cause.message : String(cause)}`);
    process.exitCode = 1;
  });
}
