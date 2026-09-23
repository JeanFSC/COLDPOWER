import { and, asc, eq, sql } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getDb } from "../src/db";
import {
  auditLogs,
  categories,
  crmActivities,
  crmTasks,
  customers,
  inventoryBalances,
  inventoryMovements,
  inventoryReservations,
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
import {
  assertDevDatabaseTarget,
  assertDevMockSeedAllowed,
  DEV_MOCK_SEED_VERSION,
  LEGACY_DEV_MOCK_SEED_VERSIONS,
  mockFixtureId,
} from "../src/lib/dev-mock-fixtures";

const day = 24 * 60 * 60 * 1000;
const id = (entity: string, key: string) => mockFixtureId(entity, key);
const shiftedDate = (daysAgo: number) => new Date(Date.now() - daysAgo * day);
const money = (value: number) => value.toFixed(2);

// Drizzle's transaction/table generic is intentionally kept at the boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertRows(tx: any, table: any, rows: any[]) {
  if (!rows.length) return 0;
  const inserted = await tx.insert(table).values(rows).onConflictDoNothing().returning({ id: table.id });
  return inserted.length;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deleteLegacyFixture(tx: any) {
  const tables = [
    "payment_status_history",
    "order_status_history",
    "quote_items",
    "quote_status_history",
    "opportunity_items",
    "opportunity_stage_history",
    "crm_activities",
    "crm_tasks",
    "sale_items",
    "order_items",
    "payments",
    "inventory_reservations",
    "notifications",
    "promotion_products",
    "price_history",
    "discount_rules",
    "promotions",
    "transfer_items",
    "purchase_receipt_items",
    "purchase_receipts",
    "purchase_items",
    "transfers",
    "purchases",
    "opportunities",
    "quotes",
    "orders",
    "sales",
    "customers",
    "suppliers",
    "inventory_movements",
    "inventory_balances",
    "product_prices",
    "locations",
    "products",
    "users",
  ];
  let deleted = 0;
  for (const version of LEGACY_DEV_MOCK_SEED_VERSIONS) {
    const prefix = `${version}-%`;
    for (const table of tables) {
      const result = await tx.execute(sql.raw(`delete from ${table} where id like '${prefix}'`));
      deleted += Number(result.rowCount ?? 0);
    }
  }
  return deleted;
}

function productName(product: { commercialName: string | null; normalizedName: string; originalName: string }) {
  return product.commercialName ?? product.normalizedName ?? product.originalName;
}

function chooseSeedProducts<T extends { originalName: string; categoryName: string }>(rows: T[]) {
  const refrigeration = rows.filter((row) => /refrigeraci/i.test(row.categoryName));
  const preferred = refrigeration.filter((row) =>
    /capacitor|filtro|bimetal|valvula|compresor|ventilador/i.test(row.originalName),
  );
  const selected: T[] = [];
  for (const row of [...preferred, ...refrigeration, ...rows]) {
    if (!selected.includes(row)) selected.push(row);
    if (selected.length === 8) break;
  }
  return selected;
}

export async function seedDevelopmentMockData(options: { replaceLegacyMock?: boolean } = {}) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const legacyDeleted = options.replaceLegacyMock ? await deleteLegacyFixture(tx) : 0;
    const [actor] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.roleCode, "SUPERADMIN"), eq(users.status, "ACTIVE")))
      .orderBy(asc(users.createdAt))
      .limit(1);
    if (!actor) throw new Error("No existe un SUPERADMIN activo para atribuir el fixture del dashboard.");

    const catalogRows = await tx
      .select({
        id: products.id,
        sku: products.sku,
        slug: products.slug,
        originalName: products.originalName,
        normalizedName: products.normalizedName,
        commercialName: products.commercialName,
        categoryId: products.categoryId,
        familyId: products.familyId,
        brandId: products.brandId,
        categoryName: categories.name,
        familyName: sql<string>`${categories.name} || ' / ' || ${products.familyId}`,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.status, "Activo"))
      .orderBy(asc(products.sku))
      .limit(2000);
    if (catalogRows.length < 8) throw new Error("El catálogo activo no tiene al menos 8 productos reales para el fixture.");

    const seedProducts = chooseSeedProducts(catalogRows);
    const bulkProducts = [
      ...catalogRows.filter((product) => /refrigeraci/i.test(product.categoryName)),
      ...catalogRows.filter((product) => !/refrigeraci/i.test(product.categoryName)),
    ].slice(0, 96);
    const unknownProductIds = new Set(catalogRows.slice(-6).map((product) => product.id));
    const priceProfile = [
      { retail: 420, cost: 250 },
      { retail: 680, cost: 410 },
      { retail: 125, cost: 70 },
      { retail: 890, cost: 540 },
      { retail: 75, cost: 42 },
      { retail: 240, cost: 145 },
      { retail: 1560, cost: 980 },
      { retail: 58, cost: 31 },
    ];
    const profileFor = (index: number) => {
      const profile = priceProfile[index % priceProfile.length];
      if (index === 0) return { ...profile, onHand: 2, reserved: 1, minimum: 5, case: "critical" };
      if (index === 1) return { ...profile, onHand: 8, reserved: 1, minimum: 10, case: "low" };
      if (index === 2) return { ...profile, onHand: 0, reserved: 0, minimum: 5, case: "zero" };
      if (index === 3) return { ...profile, onHand: 120, reserved: 4, minimum: 10, case: "overstock" };
      if (index === 4) return { ...profile, onHand: 26, reserved: 3, minimum: 8, case: "normal" };
      return { ...profile, onHand: 14 + index, reserved: index % 3, minimum: 8, case: "normal" };
    };

    const mockUsers = [
      { id: id("user", "gerencia"), email: "maria.gerencia@coldpower.local", name: "María Torres", phone: "+51 900 000 101", role: "admin", roleCode: "GERENCIA", status: "ACTIVE", clerkSyncStatus: "SYNCED", clerkSyncedAt: shiftedDate(20), createdAt: shiftedDate(20), updatedAt: shiftedDate(1) },
      { id: id("user", "ventas"), email: "carlos.ventas@coldpower.local", name: "Carlos Ramírez", phone: "+51 900 000 102", role: "admin", roleCode: "OPERACIONES_VENTAS", status: "ACTIVE", clerkSyncStatus: "SYNCED", clerkSyncedAt: shiftedDate(18), createdAt: shiftedDate(18), updatedAt: shiftedDate(1) },
      { id: id("user", "almacen"), email: "lucia.almacen@coldpower.local", name: "Lucía Quispe", phone: "+51 900 000 103", role: "admin", roleCode: "ALMACEN", status: "ACTIVE", clerkSyncStatus: "SYNCED", clerkSyncedAt: shiftedDate(16), createdAt: shiftedDate(16), updatedAt: shiftedDate(1) },
      { id: id("user", "compras"), email: "diego.compras@coldpower.local", name: "Diego Salazar", phone: "+51 900 000 104", role: "admin", roleCode: "COMPRAS", status: "ACTIVE", clerkSyncStatus: "SYNCED", clerkSyncedAt: shiftedDate(14), createdAt: shiftedDate(14), updatedAt: shiftedDate(1) },
      ...Array.from({ length: 16 }, (_, index) => {
        const roles = ["VENTAS", "ALMACEN", "COMPRAS", "REPORTES", "JEFATURA", "ADMIN"] as const;
        const roleCode = roles[index % roles.length];
        return { id: id("user", `staff-${String(index + 1).padStart(3, "0")}`), email: `empleado.${String(index + 1).padStart(3, "0")}@coldpower.local`, name: `Colaborador ${String(index + 1).padStart(2, "0")}`, phone: `+51 900 ${String(200 + index).padStart(3, "0")} ${String(100 + index).padStart(3, "0")}`, role: "admin", roleCode, status: "ACTIVE", clerkSyncStatus: "SYNCED", clerkSyncedAt: shiftedDate(10 + index), createdAt: shiftedDate(10 + index), updatedAt: shiftedDate(1) };
      }),
    ];
    const salesTeamIds = [
      id("user", "gerencia"),
      id("user", "ventas"),
      ...Array.from({ length: 16 }, (_, index) => id("user", `staff-${String(index + 1).padStart(3, "0")}`)),
    ];
    const userCount = await insertRows(tx, users, mockUsers);

    const locationRows = [
      { id: id("location", "lima"), code: "CP-LIM-DEV", name: "Almacén Lima", type: "WAREHOUSE", active: true, address: "Av. Industrial 100, Lima", createdAt: shiftedDate(90), updatedAt: shiftedDate(1) },
      { id: id("location", "arequipa"), code: "CP-AQP-DEV", name: "Tienda Arequipa", type: "STORE", active: true, address: "Calle Comercio 200, Arequipa", createdAt: shiftedDate(90), updatedAt: shiftedDate(1) },
      ...["Trujillo", "Cusco", "Piura", "Chiclayo"].map((city, index) => ({ id: id("location", `branch-${index + 1}`), code: `CP-${city.slice(0, 3).toUpperCase()}-DEV`, name: `Sucursal ${city}`, type: "STORE", active: true, address: `Av. Principal ${300 + index}, ${city}`, createdAt: shiftedDate(80), updatedAt: shiftedDate(1) })),
    ];
    const locationCount = await insertRows(tx, locations, locationRows);

    const priceRows = bulkProducts.flatMap((product, index) => {
      const focusIndex = seedProducts.findIndex((focusProduct) => focusProduct.id === product.id);
      const profile = focusIndex >= 0 ? profileFor(focusIndex) : { retail: 85 + ((index * 73) % 1800), cost: 45 + ((index * 41) % 1100) };
      return [
        { id: id("price", `${product.id}-retail`), productId: product.id, priceType: "RETAIL", amount: money(profile.retail), currency: "PEN", status: "ACTIVE", active: true, validFrom: shiftedDate(90), idempotencyKey: id("price-key", `${product.id}-retail`), createdBy: actor.id },
        { id: id("price", `${product.id}-cost`), productId: product.id, priceType: "COST", amount: money(profile.cost), currency: "PEN", status: "ACTIVE", active: true, validFrom: shiftedDate(90), idempotencyKey: id("price-key", `${product.id}-cost`), createdBy: actor.id },
      ];
    });
    const priceCount = await insertRows(tx, productPrices, priceRows);

    const balanceRows = catalogRows
      .filter((product) => !unknownProductIds.has(product.id))
      .map((product, index) => {
        const selectedIndex = seedProducts.findIndex((seedProduct) => seedProduct.id === product.id);
        const profile = profileFor(selectedIndex >= 0 ? selectedIndex : 20 + index);
        return {
          id: id("balance", `${product.id}-lima`),
          productId: product.id,
          locationId: id("location", "lima"),
          onHand: profile.onHand,
          reserved: profile.reserved,
          minimumStock: profile.minimum,
          updatedAt: selectedIndex === 0 ? shiftedDate(1) : selectedIndex === 1 ? shiftedDate(3) : shiftedDate(18),
        };
      });
    const secondaryBalance = {
      id: id("balance", `${seedProducts[0].id}-arequipa`),
      productId: seedProducts[0].id,
      locationId: id("location", "arequipa"),
      onHand: 3,
      reserved: 1,
      minimumStock: 6,
      updatedAt: shiftedDate(35),
    };
    const balanceCount = await insertRows(tx, inventoryBalances, [...balanceRows, secondaryBalance]);

    const customerRows = [
      { id: id("customer", "001"), name: "Restaurante Costa Azul", legalName: "Restaurante Costa Azul S.A.C.", documentNumber: "20501010101", ruc: "20501010101", phone: "+51 910 003 001", whatsapp: "+51 910 003 001", email: "compras@costaazul.pe", address: "Miraflores, Lima", location: "Lima / Lima / Miraflores", customerType: "COMPANY", assignedSellerId: id("user", "ventas"), notes: "Cliente corporativo de mantenimiento", status: "ACTIVE", lastActivityAt: shiftedDate(1), createdAt: shiftedDate(70), updatedAt: shiftedDate(1) },
      { id: id("customer", "002"), name: "Frío Norte Servicios", documentNumber: "10450022001", phone: "+51 910 003 002", whatsapp: "+51 910 003 002", email: "contacto@frionorte.pe", address: "Trujillo", location: "La Libertad / Trujillo", customerType: "TECNICO", assignedSellerId: id("user", "ventas"), status: "ACTIVE", lastActivityAt: shiftedDate(3), createdAt: shiftedDate(60), updatedAt: shiftedDate(3) },
      { id: id("customer", "003"), name: "Hotel Valle Sur", legalName: "Hotel Valle Sur S.A.C.", documentNumber: "20402020202", ruc: "20402020202", phone: "+51 910 003 003", whatsapp: "+51 910 003 003", email: "mantenimiento@vallesur.pe", address: "Yanahuara, Arequipa", location: "Arequipa / Arequipa", customerType: "COMPANY", assignedSellerId: id("user", "gerencia"), status: "ACTIVE", lastActivityAt: shiftedDate(7), createdAt: shiftedDate(55), updatedAt: shiftedDate(7) },
      { id: id("customer", "004"), name: "Lavandería Central", phone: "+51 910 003 004", whatsapp: "+51 910 003 004", email: "operaciones@lavanderiacentral.pe", address: "San Miguel, Lima", location: "Lima / Lima / San Miguel", customerType: "EMPRESA", assignedSellerId: id("user", "ventas"), status: "ACTIVE", lastActivityAt: shiftedDate(10), createdAt: shiftedDate(48), updatedAt: shiftedDate(10) },
      { id: id("customer", "005"), name: "Distribuidora Andes", phone: "+51 910 003 005", whatsapp: "+51 910 003 005", email: "compras@distribuidoraandes.pe", location: "Cusco / Cusco", customerType: "DISTRIBUIDOR", assignedSellerId: id("user", "gerencia"), status: "PROSPECT", lastActivityAt: shiftedDate(18), createdAt: shiftedDate(40), updatedAt: shiftedDate(18) },
      { id: id("customer", "006"), name: "Mantenimiento Plaza Norte", phone: "+51 910 003 006", whatsapp: "+51 910 003 006", email: "servicios@plazanorte.pe", location: "Lima / Lima", customerType: "COMPANY", assignedSellerId: id("user", "ventas"), status: "ACTIVE", lastActivityAt: shiftedDate(22), createdAt: shiftedDate(35), updatedAt: shiftedDate(22) },
    ];
    customerRows.push(...Array.from({ length: 54 }, (_, index) => {
      const customerNumber = String(index + 7).padStart(3, "0");
      const sellerId = salesTeamIds[index % salesTeamIds.length];
      const cities = ["Lima", "Arequipa", "Trujillo", "Cusco", "Piura", "Chiclayo"] as const;
      const city = cities[index % cities.length];
      return { id: id("customer", customerNumber), name: `Cliente corporativo ${customerNumber}`, legalName: `Cliente corporativo ${customerNumber} S.A.C.`, documentNumber: `206${String(10000000 + index).padStart(8, "0")}`, ruc: `206${String(10000000 + index).padStart(8, "0")}`, phone: `+51 910 ${String(100 + index).padStart(3, "0")} ${String(100 + index).padStart(3, "0")}`, whatsapp: `+51 910 ${String(100 + index).padStart(3, "0")} ${String(100 + index).padStart(3, "0")}`, email: `compras.${customerNumber}@empresa-corporativa.local`, address: `Av. Industrial ${500 + index}, ${city}`, location: `${city} / ${city}`, customerType: index % 4 === 0 ? "DISTRIBUIDOR" : "COMPANY", assignedSellerId: sellerId, notes: "Cuenta corporativa de desarrollo para validar segmentación y recurrencia.", status: index % 10 === 0 ? "PROSPECT" : "ACTIVE", lastActivityAt: shiftedDate(1 + (index % 27)), createdAt: shiftedDate(8 + (index % 54)), updatedAt: shiftedDate(1 + (index % 20)) };
    }));
    const customerCount = await insertRows(tx, customers, customerRows);

    const quoteDefinitions = Array.from({ length: 80 }, (_, index) => {
      const current = index < 52;
      const openStatuses = [
        ["enviada", "SENT"],
        ["evaluacion", "IN_REVIEW"],
        ["cotizada", "QUOTED"],
        ["aprobada", "APPROVED"],
        ["nuevo", "DRAFT"],
      ] as const;
      const historicalStatuses = [["convertida", "CONVERTED"], ["cerrada", "CLOSED"], ["enviada", "SENT"]] as const;
      const [status, workflowStatus] = (current ? openStatuses[index % openStatuses.length] : historicalStatuses[index % historicalStatuses.length]);
      return { daysAgo: current ? 1 + (index % 23) : 31 + (index % 24), status, workflowStatus, customerIndex: index % customerRows.length };
    });
    const quoteRows = quoteDefinitions.map((definition, index) => {
      const customer = customerRows[definition.customerIndex];
      const product = bulkProducts[index % bulkProducts.length];
      return {
        id: id("quote", String(index + 1).padStart(3, "0")),
        trackingCode: `CP-COT-DEV-${String(index + 1).padStart(3, "0")}`,
        name: customer.name,
        customerType: "company",
        documentNumber: customer.ruc ?? customer.documentNumber ?? "",
        phone: customer.phone ?? "",
        email: customer.email,
        department: "Lima",
        province: "Lima",
        district: "Miraflores",
        preferredContact: "whatsapp",
        consentAt: shiftedDate(definition.daysAgo),
        productSlug: product.slug,
        productName: productName(product),
        sku: product.sku,
        message: `Solicitud comercial para ${productName(product)}.`,
        status: definition.status,
        workflowStatus: definition.workflowStatus,
        clientIp: "127.0.0.1",
        createdAt: shiftedDate(definition.daysAgo),
        updatedAt: shiftedDate(Math.max(0, definition.daysAgo - 1)),
      };
    });
    const quoteCount = await insertRows(tx, quotes, quoteRows);
    const quoteItemCount = await insertRows(tx, quoteItems, quoteRows.map((quote, index) => {
      const product = bulkProducts[index % bulkProducts.length];
      return { id: id("quote-item", String(index + 1).padStart(3, "0")), quoteId: quote.id, productId: product.id, skuSnapshot: product.sku, productNameSnapshot: productName(product), quantity: (index % 3) + 1, createdAt: quote.createdAt };
    }));
    const quoteHistoryCount = await insertRows(tx, quoteStatusHistory, quoteRows.map((quote, index) => ({ id: id("quote-history", String(index + 1).padStart(3, "0")), quoteId: quote.id, fromStatus: null, toStatus: quote.status, changedBy: actor.id, note: "Estado inicial de la demostración comercial", createdAt: quote.createdAt })));

    const opportunityDefinitions = Array.from({ length: 72 }, (_, index) => {
      const current = index < 48;
      const openStages = ["NEW", "QUOTE_SENT", "FOLLOW_UP", "NEGOTIATION", "ACCEPTED", "SALE"] as const;
      const historicalStages = ["CLOSED", "LOST"] as const;
      return {
        daysAgo: current ? 2 + (index % 22) : 31 + (index % 25),
        stage: current ? openStages[index % openStages.length] : historicalStages[index % historicalStages.length],
        quoteIndex: index % quoteRows.length,
        customerIndex: index % customerRows.length,
        amount: 520 + ((index * 137) % 4800),
      };
    });
    const opportunityRows = opportunityDefinitions.map((definition, index) => ({
      id: id("opportunity", String(index + 1).padStart(3, "0")),
      code: `OPP-DEV-${String(index + 1).padStart(3, "0")}`,
      customerId: customerRows[definition.customerIndex].id,
      quoteId: quoteRows[definition.quoteIndex].id,
      title: `Proyecto de suministro ${index + 1}`,
      origin: index % 2 ? "WHATSAPP" : "WEB",
      stage: definition.stage,
      assignedSellerId: salesTeamIds[index % salesTeamIds.length],
      totalAmount: money(definition.amount),
      currency: "PEN",
      discountPercentage: index % 2 ? "0.00" : "5.00",
      marginAmount: money(definition.amount * 0.3),
      lastContactAt: shiftedDate(Math.max(1, definition.daysAgo - 1)),
      nextAction: definition.stage === "LOST" ? null : "Confirmar especificaciones y despacho",
      followUpAt: definition.stage === "FOLLOW_UP" ? shiftedDate(-1) : shiftedDate(Math.max(1, definition.daysAgo - 2)),
      notes: "Oportunidad de demostración para validar el pipeline.",
      createdBy: actor.id,
      createdAt: shiftedDate(definition.daysAgo),
      updatedAt: shiftedDate(Math.max(0, definition.daysAgo - 1)),
    }));
    const opportunityCount = await insertRows(tx, opportunities, opportunityRows);
    const opportunityItemCount = await insertRows(tx, opportunityItems, opportunityRows.map((opportunity, index) => {
      const product = bulkProducts[(index + 1) % bulkProducts.length];
      return { id: id("opportunity-item", String(index + 1).padStart(3, "0")), opportunityId: opportunity.id, productId: product.id, skuSnapshot: product.sku, productNameSnapshot: productName(product), quantity: (index % 3) + 1, unitPrice: opportunity.totalAmount, currency: "PEN", discountPercentage: opportunity.discountPercentage, lineTotal: opportunity.totalAmount, createdAt: opportunity.createdAt };
    }));
    const opportunityHistoryCount = await insertRows(tx, opportunityStageHistory, opportunityRows.map((opportunity, index) => ({ id: id("opportunity-history", String(index + 1).padStart(3, "0")), opportunityId: opportunity.id, fromStage: null, toStage: opportunity.stage, changedBy: actor.id, note: "Etapa inicial de la demostración comercial", createdAt: opportunity.createdAt })));

    const activityRows = opportunityRows.slice(0, 48).map((opportunity, index) => ({ id: id("crm-activity", String(index + 1).padStart(3, "0")), customerId: opportunity.customerId, opportunityId: opportunity.id, quoteId: opportunity.quoteId, type: index % 3 === 0 ? "WHATSAPP" : index % 3 === 1 ? "CALL" : "EMAIL", subject: index % 2 ? "Seguimiento de cotización" : "Llamada comercial", body: "Contacto registrado para validar la siguiente acción.", performedBy: salesTeamIds[index % salesTeamIds.length], dueAt: shiftedDate(index % 5 === 0 ? -1 : Math.max(0, index % 20)), completedAt: index % 4 === 0 ? shiftedDate(Math.max(1, index % 12)) : null, idempotencyKey: id("crm-activity-key", String(index + 1).padStart(3, "0")), createdAt: shiftedDate(1 + (index % 28)) }));
    const activityCount = await insertRows(tx, crmActivities, activityRows);
    const taskRows = opportunityRows.slice(0, 48).map((opportunity, index) => ({ id: id("crm-task", String(index + 1).padStart(3, "0")), customerId: opportunity.customerId, opportunityId: opportunity.id, quoteId: opportunity.quoteId, title: index % 3 === 0 ? "Confirmar medidas del equipo" : "Dar seguimiento a cotización", description: "Tarea de seguimiento para validar la operación.", status: index % 5 === 2 ? "COMPLETED" : "PENDING", assignedTo: salesTeamIds[index % salesTeamIds.length], dueAt: index % 5 === 1 ? shiftedDate(2) : shiftedDate(-1), completedAt: index % 5 === 2 ? shiftedDate(1) : null, createdBy: actor.id, idempotencyKey: id("crm-task-key", String(index + 1).padStart(3, "0")), createdAt: shiftedDate(3 + (index % 26)), updatedAt: shiftedDate(1) }));
    const taskCount = await insertRows(tx, crmTasks, taskRows);

    const saleDefinitions = Array.from({ length: 120 }, (_, index) => {
      const current = index < 80;
      const quantity = 1 + (index % 6);
      const unitPrice = 55 + ((index * 79) % 1450);
      return {
        daysAgo: current ? 1 + (index % 23) : 31 + (index % 25),
        customerIndex: index % customerRows.length,
        productIndex: index % bulkProducts.length,
        quantity,
        total: unitPrice * quantity,
        opportunityIndex: index < opportunityRows.length ? index : null,
        quoteIndex: index < quoteRows.length ? index : null,
      };
    });
    const saleRows = saleDefinitions.map((definition, index) => ({
      id: id("sale", String(index + 1).padStart(3, "0")),
      code: `VTA-DEV-${String(index + 1).padStart(3, "0")}`,
      customerId: customerRows[definition.customerIndex].id,
      opportunityId: definition.opportunityIndex === null ? null : opportunityRows[definition.opportunityIndex].id,
      quoteId: definition.quoteIndex === null ? null : quoteRows[definition.quoteIndex].id,
      status: "CONFIRMED",
      channel: index % 3 === 0 ? "WEB" : "DIRECT",
      sellerId: salesTeamIds[index % salesTeamIds.length],
      subtotal: money(definition.total),
      discountAmount: "0.00",
      total: money(definition.total),
      currency: "PEN",
      notes: "Venta de demostración para validar métricas comerciales.",
      idempotencyKey: id("sale-key", String(index + 1).padStart(3, "0")),
      createdAt: shiftedDate(definition.daysAgo),
      updatedAt: shiftedDate(Math.max(0, definition.daysAgo - 1)),
    }));
    const saleCount = await insertRows(tx, sales, saleRows);
    const saleItemRows = saleRows.map((sale, index) => {
      const definition = saleDefinitions[index];
      const product = bulkProducts[definition.productIndex];
      return { id: id("sale-item", String(index + 1).padStart(3, "0")), saleId: sale.id, productId: product.id, skuSnapshot: product.sku, productNameSnapshot: productName(product), quantity: definition.quantity, unitPrice: money(definition.total / definition.quantity), currency: "PEN", discountAmount: "0.00", lineTotal: sale.total, createdAt: sale.createdAt };
    });
    const saleItemCount = await insertRows(tx, saleItems, saleItemRows);

    const paymentStatusForOrder = (orderIndex: number): (typeof payments.$inferInsert)["status"] | null => {
      if (orderIndex % 2 !== 0) return null;
      return ["APPROVED", "UNDER_REVIEW", "PENDING", "CONFIRMED", "PENDING", "APPROVED"][
        (orderIndex / 2) % 6
      ] as (typeof payments.$inferInsert)["status"];
    };
    const orderStatusForFixture = (orderIndex: number): (typeof orders.$inferInsert)["status"] => {
      const paymentStatus = paymentStatusForOrder(orderIndex);
      if (!paymentStatus || ["PENDING", "UNDER_REVIEW"].includes(paymentStatus)) {
        return orderIndex % 3 === 0 ? "PAYMENT_PENDING" : "RECEIVED";
      }
      return ["PAID", "PREPARING", "READY", "DELIVERED"][(orderIndex / 2) % 4] as (typeof orders.$inferInsert)["status"];
    };
    const orderRows = saleRows.map((sale, index) => {
      const customer = customerRows[saleDefinitions[index].customerIndex];
      return { id: id("order", String(index + 1).padStart(3, "0")), code: `PED-DEV-${String(index + 1).padStart(3, "0")}`, saleId: sale.id, customerId: customer.id, opportunityId: sale.opportunityId, status: orderStatusForFixture(index), deliveryMethod: index % 3 === 0 ? "DELIVERY" : index % 3 === 1 ? "SHIPPING" : "PICKUP", locationId: index % 2 ? id("location", "arequipa") : id("location", "lima"), deliveryAddress: customer.address ?? "Lima", customerNameSnapshot: customer.name, customerPhoneSnapshot: customer.phone ?? "", customerEmailSnapshot: customer.email, sellerId: sale.sellerId, subtotal: sale.subtotal, discountAmount: sale.discountAmount, total: sale.total, currency: "PEN", idempotencyKey: id("order-key", String(index + 1).padStart(3, "0")), createdAt: sale.createdAt, updatedAt: sale.updatedAt };
    });
    const orderCount = await insertRows(tx, orders, orderRows);
    const orderItemCount = await insertRows(tx, orderItems, orderRows.map((order, index) => { const item = saleItemRows[index]!; const picked = ["READY", "READY_FOR_PICKUP", "DELIVERED"].includes(String(order.status)) ? item.quantity : 0; return { id: id("order-item", String(index + 1).padStart(3, "0")), orderId: order.id, productId: item.productId, skuSnapshot: item.skuSnapshot, productNameSnapshot: item.productNameSnapshot, quantity: item.quantity, pickedQuantity: picked, unitPrice: item.unitPrice, currency: "PEN", lineTotal: order.total, reservationId: index < 8 ? id("reservation", String(index + 1).padStart(3, "0")) : null, createdAt: order.createdAt }; }));
    const paymentDefinitions = orderRows.filter((_, index) => index % 2 === 0).map((_, index) => ({ status: paymentStatusForOrder(index * 2)!, orderIndex: index * 2 }));
    const paymentRows = paymentDefinitions.map((definition, index) => { const order = orderRows[definition.orderIndex]; return { id: id("payment", String(index + 1).padStart(3, "0")), orderId: order.id, methodType: index % 2 ? "MANUAL" : "PROVIDER", method: index % 2 ? "TRANSFERENCIA" : "CARD", provider: "development-gateway", providerReference: `DEV-PAY-${String(index + 1).padStart(3, "0")}`, amount: order.total, currency: "PEN", status: definition.status, metadata: { fixture: DEV_MOCK_SEED_VERSION }, createdBy: actor.id, createdAt: shiftedDate(Math.max(1, index + 2)), updatedAt: shiftedDate(Math.max(0, index + 1)) }; });
    const paymentCount = await insertRows(tx, payments, paymentRows);
    const paymentHistoryCount = await insertRows(tx, paymentStatusHistory, paymentRows.map((payment, index) => ({ id: id("payment-history", String(index + 1).padStart(3, "0")), paymentId: payment.id, fromStatus: null, toStatus: payment.status, changedBy: actor.id, actorRole: "SUPERADMIN", provider: payment.provider, reason: "Estado inicial de la demostración", createdAt: payment.createdAt })));
    const reservationRows = Array.from({ length: 30 }, (_, index) => {
      const reservationNumber = String(index + 1).padStart(3, "0");
      const referenceOrder = orderRows[index < 8 ? index : (index + 8) % orderRows.length];
      const terminal = referenceOrder.status === "DELIVERED" ? "CONSUMED" : referenceOrder.status === "CANCELLED" ? "CANCELLED" : "ACTIVE";
      return { id: id("reservation", reservationNumber), productId: bulkProducts[index % bulkProducts.length].id, locationId: index % 2 ? id("location", "arequipa") : id("location", "lima"), quantity: 1 + (index % 3), status: terminal, referenceType: "ORDER", referenceId: referenceOrder.id, idempotencyKey: id("reservation-key", reservationNumber), expiresAt: terminal === "ACTIVE" ? shiftedDate(-(2 + (index % 8))) : null, createdBy: actor.id, createdAt: shiftedDate(3 + (index % 20)), releasedAt: terminal === "ACTIVE" ? null : shiftedDate(1) };
    });
    const reservationCount = await insertRows(tx, inventoryReservations, reservationRows);
    const orderHistoryCount = await insertRows(tx, orderStatusHistory, orderRows.map((order, index) => ({ id: id("order-history", String(index + 1).padStart(3, "0")), orderId: order.id, fromStatus: null, toStatus: order.status, changedBy: actor.id, note: "Estado inicial de la demostración", createdAt: order.createdAt })));

    const movementRows = balanceRows.map((balance, index) => {
      const selectedIndex = seedProducts.findIndex((product) => product.id === balance.productId);
      const profile = profileFor(selectedIndex >= 0 ? selectedIndex : 20 + index);
      const old = index >= balanceRows.length - 6;
      return { id: id("movement", balance.productId), productId: balance.productId, locationId: balance.locationId, type: profile.onHand === 0 ? "ADJUSTMENT_OUT" : "OPENING_BALANCE", quantity: profile.onHand === 0 ? 1 : Math.max(1, profile.onHand), previousOnHand: profile.onHand === 0 ? 1 : 0, resultingOnHand: profile.onHand, previousReserved: 0, resultingReserved: profile.reserved, referenceType: "DEV_DASHBOARD_SEED", referenceId: DEV_MOCK_SEED_VERSION, reason: old ? "Saldo inicial histórico" : "Saldo inicial de desarrollo", notes: "Movimiento controlado para validar inventario.", performedBy: actor.id, createdAt: shiftedDate(old ? 40 : (index % 24) + 1) };
    });
    const movementCount = await insertRows(tx, inventoryMovements, movementRows);

    const auditDefinitions = Array.from({ length: 48 }, (_, index) => {
      const events = [
        { action: "catalog.product_editorial_updated", entityType: "product", entityId: bulkProducts[index % bulkProducts.length].id, module: "catalog" },
        { action: "pricing.price_updated", entityType: "product", entityId: bulkProducts[index % bulkProducts.length].id, module: "pricing" },
        { action: "quotes.created", entityType: "quote", entityId: quoteRows[index % quoteRows.length].id, module: "quotes" },
        { action: "orders.created", entityType: "order", entityId: orderRows[index % orderRows.length].id, module: "orders" },
        { action: "inventory.adjustment", entityType: "inventory", entityId: balanceRows[index % balanceRows.length].id, module: "inventory" },
        { action: "customers.created", entityType: "customer", entityId: customerRows[index % customerRows.length].id, module: "customers" },
        { action: "sales.created", entityType: "sale", entityId: saleRows[index % saleRows.length].id, module: "sales" },
        { action: "catalog.product_created", entityType: "product", entityId: bulkProducts[index % bulkProducts.length].id, module: "catalog" },
      ] as const;
      const event = events[index % events.length];
      return { ...event, daysAgo: index < 36 ? 1 + (index % 26) : 31 + (index % 25) };
    });
    const auditCount = await insertRows(tx, auditLogs, auditDefinitions.map((event, index) => ({ id: id("audit", String(index + 1).padStart(3, "0")), actorId: actor.id, actorRole: "SUPERADMIN", action: event.action, entityType: event.entityType, entityId: event.entityId, module: event.module, severity: "INFO", origin: "DEV_DASHBOARD_SEED", correlationId: DEV_MOCK_SEED_VERSION, after: { fixture: DEV_MOCK_SEED_VERSION }, metadata: { source: "development-dashboard-seed" }, createdAt: shiftedDate(event.daysAgo) })));

    return {
      seedVersion: DEV_MOCK_SEED_VERSION,
      legacyDeleted,
      selectedProducts: seedProducts.map((product) => ({ id: product.id, sku: product.sku, name: productName(product), category: product.categoryName })),
      inventoryCases: { critical: 1, low: 1, zero: 1, overstock: 1, unknown: unknownProductIds.size, activeReservations: reservationRows.filter((row) => row.status === "ACTIVE").length },
      counts: {
        users: userCount,
        products: 0,
        prices: priceCount,
        locations: locationCount,
        balances: balanceCount,
        movements: movementCount,
        customers: customerCount,
        quotes: quoteCount,
        quoteItems: quoteItemCount,
        quoteHistory: quoteHistoryCount,
        opportunities: opportunityCount,
        opportunityItems: opportunityItemCount,
        opportunityHistory: opportunityHistoryCount,
        activities: activityCount,
        tasks: taskCount,
        sales: saleCount,
        saleItems: saleItemCount,
        orders: orderCount,
        orderItems: orderItemCount,
        payments: paymentCount,
        paymentHistory: paymentHistoryCount,
        reservations: reservationCount,
        orderHistory: orderHistoryCount,
        audits: auditCount,
      },
    };
  });
}

async function main() {
  assertDevMockSeedAllowed(process.env, process.argv);
  assertDevDatabaseTarget(process.env, process.argv);
  const result = await seedDevelopmentMockData({ replaceLegacyMock: process.argv.includes("--replace-legacy-mock") });
  console.log(JSON.stringify(result, null, 2));
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
