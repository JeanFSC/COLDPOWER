import { and, asc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { closeDb, getDb } from "../src/db";
import { customers } from "../src/db/crm-schema";
import {
  locations,
  productPrices,
  products,
  users,
} from "../src/db/schema";
import {
  orderItems,
  orderStatusHistory,
  orders,
  paymentStatusHistory,
  payments,
  saleItems,
  sales,
  shipmentEvents,
  shipments,
} from "../src/db/sales-schema";

const FIXTURE = "cp-brief16-orders";
const DAY = 24 * 60 * 60 * 1000;
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

const fixtureId = (entity: string, key: string) => `${FIXTURE}-${entity}-${key}`;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

function isTruthy(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}

export function assertOrdersFixtureAllowed(
  env: NodeJS.ProcessEnv = process.env,
  args: string[] = process.argv,
) {
  if (env.NODE_ENV === "production") throw new Error("La fixture de pedidos no se permite en producción.");
  if (!args.includes("--confirm-dev-mock")) throw new Error("Debes confirmar la fixture con --confirm-dev-mock.");
  if (!isTruthy(env.CP_DEV_AUTH_BYPASS)) throw new Error("Falta CP_DEV_AUTH_BYPASS=true; se detuvo para proteger la base de datos.");
  if (!env.CP_DEV_AUTH_USER_ID?.trim()) throw new Error("Falta CP_DEV_AUTH_USER_ID para asociar los pedidos al usuario de prueba.");
  if (!env.DATABASE_URL?.trim()) throw new Error("Falta DATABASE_URL para cargar la fixture.");

  let hostname: string;
  try {
    hostname = new URL(env.DATABASE_URL).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  } catch {
    throw new Error("DATABASE_URL no contiene una URL válida.");
  }
  if (!localHosts.has(hostname)) throw new Error(`Fixture detenida: DATABASE_URL apunta a ${hostname}, no a localhost.`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertRows(tx: any, table: any, rows: any[]) {
  if (!rows.length) return 0;
  const inserted = await tx.insert(table).values(rows).onConflictDoNothing().returning({ id: table.id });
  return inserted.length;
}

type FixtureOrder = {
  key: string;
  code: string;
  status: (typeof orders.$inferInsert)["status"];
  deliveryMethod: (typeof orders.$inferInsert)["deliveryMethod"];
  days: number;
  paymentStatus?: (typeof payments.$inferInsert)["status"];
  shipmentStatus?: (typeof shipments.$inferInsert)["status"];
  cancellationReason?: string;
  history: Array<(typeof orders.$inferInsert)["status"]>;
};

const orderDefinitions: FixtureOrder[] = [
  {
    key: "payment-pending",
    code: "CP16-PED-001",
    status: "PAYMENT_PENDING",
    deliveryMethod: "DELIVERY",
    days: 1,
    paymentStatus: "PENDING",
    history: ["PAYMENT_PENDING"],
  },
  {
    key: "paid",
    code: "CP16-PED-002",
    status: "PAID",
    deliveryMethod: "PICKUP",
    days: 2,
    paymentStatus: "APPROVED",
    history: ["PAID"],
  },
  {
    key: "preparing",
    code: "CP16-PED-003",
    status: "PREPARING",
    deliveryMethod: "DELIVERY",
    days: 3,
    paymentStatus: "APPROVED",
    history: ["PAID", "PREPARING"],
  },
  {
    key: "shipped",
    code: "CP16-PED-004",
    status: "SHIPPED",
    deliveryMethod: "SHIPPING",
    days: 4,
    paymentStatus: "APPROVED",
    shipmentStatus: "IN_TRANSIT",
    history: ["PAID", "PREPARING", "SHIPPED"],
  },
  {
    key: "delivered",
    code: "CP16-PED-005",
    status: "DELIVERED",
    deliveryMethod: "SHIPPING",
    days: 8,
    paymentStatus: "APPROVED",
    shipmentStatus: "DELIVERED",
    history: ["PAID", "PREPARING", "SHIPPED", "DELIVERED"],
  },
  {
    key: "cancelled",
    code: "CP16-PED-006",
    status: "CANCELLED",
    deliveryMethod: "DELIVERY",
    days: 10,
    paymentStatus: "CANCELLED",
    cancellationReason: "Fixture de desarrollo: cancelación para validar el estado terminal.",
    history: ["PAYMENT_PENDING", "CANCELLED"],
  },
];

export async function seedOrdersDevData() {
  const db = getDb();
  const userId = process.env.CP_DEV_AUTH_USER_ID!.trim();
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select({ id: users.id, email: users.email, name: users.name, phone: users.phone, status: users.status })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user || user.status !== "ACTIVE") throw new Error("El usuario de prueba no existe o no está activo en la base local.");

    const [location] = await tx
      .select({ id: locations.id, name: locations.name, address: locations.address, city: locations.city })
      .from(locations)
      .where(eq(locations.active, true))
      .orderBy(asc(locations.code))
      .limit(1);
    if (!location) throw new Error("No existe un local activo para asociar los pedidos de prueba.");

    const now = new Date();
    const [pricedProduct] = await tx
      .select({
        product: products,
        amount: productPrices.amount,
        currency: productPrices.currency,
      })
      .from(products)
      .innerJoin(
        productPrices,
        and(
          eq(productPrices.productId, products.id),
          eq(productPrices.priceType, "RETAIL"),
          eq(productPrices.status, "ACTIVE"),
          eq(productPrices.active, true),
          lte(productPrices.validFrom, now),
          or(isNull(productPrices.validUntil), gt(productPrices.validUntil, now)),
        ),
      )
      .where(
        and(
          eq(products.publicationStatus, "published"),
          or(
            eq(products.status, "Activo"),
            eq(products.status, "activo"),
            eq(products.status, "active"),
          ),
        ),
      )
      .orderBy(asc(products.sku))
      .limit(1);
    if (!pricedProduct) throw new Error("No existe un producto publicado con precio retail vigente para la fixture.");

    const [existingCustomer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.userId, userId))
      .limit(1);
    let customer = existingCustomer;
    if (!customer) {
      [customer] = await tx
        .insert(customers)
        .values({
          id: fixtureId("customer", "test-user"),
          userId,
          name: user.name || "Usuario de prueba ColdPower",
          email: user.email,
          phone: user.phone || "999999999",
          address: "Dirección de prueba local",
          location: location.city || "Lima",
          customerType: "CONSUMIDOR",
          status: "ACTIVE",
          notes: `Fixture ${FIXTURE}; no es un cliente operativo.`,
        })
        .onConflictDoNothing()
        .returning();
      if (!customer) {
        [customer] = await tx.select().from(customers).where(eq(customers.userId, userId)).limit(1);
      }
    }
    if (!customer) throw new Error("No se pudo resolver el cliente del usuario de prueba.");

    const actorId = userId;
    const productName = pricedProduct.product.commercialName || pricedProduct.product.normalizedName || pricedProduct.product.originalName;
    const unitPrice = String(pricedProduct.amount);
    const currency = pricedProduct.currency;
    const saleRows = orderDefinitions.map((definition) => {
      const createdAt = daysAgo(definition.days);
      return {
        id: fixtureId("sale", definition.key),
        code: `CP16-VTA-${definition.code.slice(-3)}`,
        customerId: customer.id,
        status: definition.status === "CANCELLED" ? "CANCELLED" as const : "CONFIRMED" as const,
        sellerId: null,
        subtotal: unitPrice,
        discountAmount: "0.00",
        total: unitPrice,
        currency,
        notes: `Fixture ${FIXTURE}; pedido de desarrollo ${definition.status}.`,
        idempotencyKey: fixtureId("sale-key", definition.key),
        cancellationReason: definition.cancellationReason || null,
        cancelledBy: definition.status === "CANCELLED" ? actorId : null,
        cancelledAt: definition.status === "CANCELLED" ? createdAt : null,
        createdAt,
        updatedAt: createdAt,
      };
    });
    const salesInserted = await insertRows(tx, sales, saleRows);

    const saleItemRows = orderDefinitions.map((definition) => {
      const sale = saleRows.find((row) => row.id === fixtureId("sale", definition.key))!;
      return {
        id: fixtureId("sale-item", definition.key),
        saleId: sale.id,
        productId: pricedProduct.product.id,
        skuSnapshot: pricedProduct.product.sku,
        productNameSnapshot: productName,
        quantity: 1,
        unitPrice,
        currency,
        discountAmount: "0.00",
        lineTotal: unitPrice,
        createdAt: sale.createdAt,
      };
    });
    const saleItemsInserted = await insertRows(tx, saleItems, saleItemRows);

    const orderRows = orderDefinitions.map((definition) => {
      const createdAt = daysAgo(definition.days);
      return {
        id: fixtureId("order", definition.key),
        code: definition.code,
        saleId: fixtureId("sale", definition.key),
        customerId: customer.id,
        status: definition.status,
        deliveryMethod: definition.deliveryMethod,
        locationId: location.id,
        deliveryAddress: definition.deliveryMethod === "PICKUP" ? null : customer.address || "Dirección de prueba local",
        customerNameSnapshot: customer.name,
        customerPhoneSnapshot: customer.phone || user.phone || "999999999",
        customerEmailSnapshot: customer.email || user.email,
        sellerId: null,
        subtotal: unitPrice,
        discountAmount: "0.00",
        total: unitPrice,
        currency,
        idempotencyKey: fixtureId("order-key", definition.key),
        cancellationReason: definition.cancellationReason || null,
        cancelledBy: definition.status === "CANCELLED" ? actorId : null,
        cancelledAt: definition.status === "CANCELLED" ? createdAt : null,
        deliveredAt: definition.status === "DELIVERED" ? createdAt : null,
        receivedBy: definition.status === "DELIVERED" ? "Usuario de prueba" : null,
        userId,
        paymentDueAt: definition.status === "PAYMENT_PENDING" ? new Date(Date.now() + 2 * DAY) : null,
        deliveryDetails: definition.deliveryMethod === "PICKUP"
          ? null
          : definition.deliveryMethod === "SHIPPING"
            ? { agencyName: "Agencia ColdPower Demo", province: "Lima", department: "Lima", recipientName: customer.name }
            : { district: "Miraflores", province: "Lima", department: "Lima", reference: "Fixture local" },
        version: 1,
        createdAt,
        updatedAt: createdAt,
      };
    });
    const ordersInserted = await insertRows(tx, orders, orderRows);

    const orderItemRows = orderDefinitions.map((definition) => {
      const order = orderRows.find((row) => row.id === fixtureId("order", definition.key))!;
      const picked = ["SHIPPED", "DELIVERED"].includes(definition.status ?? "") ? 1 : 0;
      return {
        id: fixtureId("order-item", definition.key),
        orderId: order.id,
        productId: pricedProduct.product.id,
        skuSnapshot: pricedProduct.product.sku,
        productNameSnapshot: productName,
        quantity: 1,
        pickedQuantity: picked,
        pickedAt: picked ? order.createdAt : null,
        pickedBy: picked ? actorId : null,
        unitPrice,
        currency,
        lineTotal: unitPrice,
        reservationId: null,
        createdAt: order.createdAt,
      };
    });
    const orderItemsInserted = await insertRows(tx, orderItems, orderItemRows);

    const paymentRows = orderDefinitions
      .filter((definition) => definition.paymentStatus)
      .map((definition) => {
        const order = orderRows.find((row) => row.id === fixtureId("order", definition.key))!;
        return {
          id: fixtureId("payment", definition.key),
          orderId: order.id,
          methodType: "PROVIDER" as const,
          method: "DEVELOPMENT_FIXTURE",
          provider: "mock",
          providerReference: `CP16-PAY-${definition.code.slice(-3)}`,
          idempotencyKey: fixtureId("payment-key", definition.key),
          amount: unitPrice,
          currency,
          status: definition.paymentStatus!,
          metadata: { fixture: FIXTURE },
          createdBy: actorId,
          createdAt: order.createdAt,
          updatedAt: order.createdAt,
        };
      });
    const paymentsInserted = await insertRows(tx, payments, paymentRows);
    const paymentHistoryRows = paymentRows.map((payment) => ({
      id: fixtureId("payment-history", payment.id),
      paymentId: payment.id,
      fromStatus: null,
      toStatus: payment.status,
      changedBy: actorId,
      actorRole: "DEV_FIXTURE",
      provider: payment.provider,
      reason: `Fixture ${FIXTURE}`,
      createdAt: payment.createdAt,
    }));
    const paymentHistoryInserted = await insertRows(tx, paymentStatusHistory, paymentHistoryRows);

    const shipmentDefinitions = orderDefinitions.filter((definition) => definition.shipmentStatus);
    const shipmentRows = shipmentDefinitions.map((definition) => {
      const order = orderRows.find((row) => row.id === fixtureId("order", definition.key))!;
      return {
        id: fixtureId("shipment", definition.key),
        orderId: order.id,
        provider: "mock",
        carrier: "ColdPower Demo",
        trackingNumber: `CP16-TRK-${definition.code.slice(-3)}`,
        trackingUrl: null,
        status: definition.shipmentStatus!,
        estimatedDeliveryAt: definition.status === "DELIVERED" ? order.createdAt : new Date(Date.now() + 2 * DAY),
        createdAt: order.createdAt,
        updatedAt: order.createdAt,
      };
    });
    const shipmentsInserted = await insertRows(tx, shipments, shipmentRows);
    const shipmentEventRows = shipmentDefinitions.flatMap((definition) => {
      const shipment = shipmentRows.find((row) => row.id === fixtureId("shipment", definition.key))!;
      const order = orderRows.find((row) => row.id === fixtureId("order", definition.key))!;
      const statuses = definition.status === "DELIVERED" ? ["LABEL_CREATED", "IN_TRANSIT", "DELIVERED"] as const : ["LABEL_CREATED", "IN_TRANSIT"] as const;
      return statuses.map((status, index) => ({
        id: fixtureId("shipment-event", `${definition.key}-${status.toLowerCase()}`),
        shipmentId: shipment.id,
        providerEventId: fixtureId("provider-event", `${definition.key}-${status.toLowerCase()}`),
        status,
        description: status === "DELIVERED" ? "Pedido entregado al cliente." : status === "IN_TRANSIT" ? "Pedido en tránsito." : "Guía creada para despacho.",
        location: status === "DELIVERED" ? "Lima" : "Centro de distribución ColdPower",
        occurredAt: new Date(order.createdAt.getTime() + index * 60 * 60 * 1000),
        createdAt: new Date(order.createdAt.getTime() + index * 60 * 60 * 1000),
      }));
    });
    const shipmentEventsInserted = await insertRows(tx, shipmentEvents, shipmentEventRows);

    const historyRows = orderDefinitions.flatMap((definition) => {
      const order = orderRows.find((row) => row.id === fixtureId("order", definition.key))!;
      return definition.history.map((status, index) => ({
        id: fixtureId("order-history", `${definition.key}-${index + 1}`),
        orderId: order.id,
        fromStatus: index === 0 ? null : definition.history[index - 1],
        toStatus: status,
        changedBy: actorId,
        note: `Fixture ${FIXTURE}`,
        idempotencyKey: fixtureId("order-history-key", `${definition.key}-${index + 1}`),
        createdAt: new Date(order.createdAt.getTime() + index * 60 * 60 * 1000),
      }));
    });
    const orderHistoryInserted = await insertRows(tx, orderStatusHistory, historyRows);

    return {
      fixture: FIXTURE,
      userId,
      customerId: customer.id,
      locationId: location.id,
      product: { id: pricedProduct.product.id, sku: pricedProduct.product.sku, name: productName, currency, unitPrice },
      orders: orderDefinitions.map((definition) => ({ code: definition.code, status: definition.status })),
      inserted: { sales: salesInserted, saleItems: saleItemsInserted, orders: ordersInserted, orderItems: orderItemsInserted, payments: paymentsInserted, paymentHistory: paymentHistoryInserted, shipments: shipmentsInserted, shipmentEvents: shipmentEventsInserted, orderHistory: orderHistoryInserted },
    };
  });
}

async function main() {
  assertOrdersFixtureAllowed();
  try {
    console.log(JSON.stringify(await seedOrdersDevData(), null, 2));
  } finally {
    await closeDb();
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
