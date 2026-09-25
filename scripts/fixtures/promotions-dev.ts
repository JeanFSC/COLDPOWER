import { and, asc, eq, inArray } from "drizzle-orm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "@/db";
import { auditLogs, categories, productPrices, products } from "@/db/schema";
import { promotionApplications, promotionCategories, promotionProducts, promotions } from "@/db/operations-schema";
import { applyPromotionToUnitPrice } from "@/lib/promotion-service";
import { loadRetailPrices } from "@/lib/retail-price";

const ACTOR_ID = "cp-dashboard-v5-user-gerencia";
const PREFIX = "promotion-dev-";
const promotionIds = [
  `${PREFIX}liquidacion-r134a`,
  `${PREFIX}capacitores-otono`,
  `${PREFIX}motores-programada`,
  `${PREFIX}pendiente-aprobacion`,
  `${PREFIX}borrador-sin-alcance`,
  `${PREFIX}campana-vencida`,
];
const applicationIds = ["promotion-application-dev-checkout", "promotion-application-dev-quote", "promotion-application-dev-checkout-2", "promotion-application-dev-quote-2"];

export function assertDevelopmentDatabase(env: { NODE_ENV?: string; DATABASE_URL?: string } = process.env) {
  if (env.NODE_ENV === "production") throw new Error("The development promotions fixture cannot run in production.");
  if (!env.DATABASE_URL?.trim()) throw new Error("The development promotions fixture requires a local DATABASE_URL.");
  let hostname: string;
  try {
    hostname = new URL(env.DATABASE_URL).hostname.toLowerCase();
  } catch {
    throw new Error("The development promotions fixture requires a valid local DATABASE_URL.");
  }
  if (hostname !== "127.0.0.1" && hostname !== "localhost") {
    throw new Error(`The development promotions fixture cannot run against ${hostname}; use 127.0.0.1 or localhost.`);
  }
}

function dates(now: Date) {
  const addDays = (days: number) => new Date(now.getTime() + days * 86_400_000);
  return { now, yesterday: addDays(-1), inSix: addDays(6), inTwentyOne: addDays(21), inThirtyFive: addDays(35), inFour: addDays(4), inTwentyEight: addDays(28), twoDaysAgo: addDays(-2), sevenDaysAgo: addDays(-7), fourteenDaysAgo: addDays(-14), fortyDaysAgo: addDays(-40) };
}

async function cleanup() {
  const db = getDb();
  await db.delete(promotionApplications).where(inArray(promotionApplications.id, applicationIds));
  await db.delete(promotions).where(inArray(promotions.id, promotionIds));
}

async function seed() {
  assertDevelopmentDatabase();
  const db = getDb();
  await cleanup();
  const now = new Date();
  const window = dates(now);
  const productsWithPrices = await db
    .select({ id: products.id, sku: products.sku, categoryId: products.categoryId })
    .from(products)
    .innerJoin(productPrices, and(eq(productPrices.productId, products.id), eq(productPrices.priceType, "RETAIL"), eq(productPrices.status, "ACTIVE"), eq(productPrices.active, true)))
    .where(eq(products.status, "Activo"))
    .orderBy(asc(products.sku))
    .limit(40);
  const selectedProducts = [...new Map(productsWithPrices.map((row) => [row.id, row])).values()].slice(0, 6);
  if (selectedProducts.length < 3) throw new Error("Not enough active products with retail prices for the fixture.");
  const selectedCategoryIds = [...new Set(selectedProducts.map((row) => row.categoryId))];
  const [category] = await db.select({ id: categories.id }).from(categories).where(inArray(categories.id, selectedCategoryIds)).orderBy(asc(categories.name)).limit(1);
  if (!category) throw new Error("No active category found for the fixture.");
  const priceMap = await loadRetailPrices(db, selectedProducts.map((row) => row.id), now);
  const records = [
    { id: promotionIds[0], name: "[DEV] Liquidación compresores R134a", description: "Fixture visual para validar campaña activa, impacto y conflicto.", type: "PERCENTAGE" as const, discountValue: "15.00", startsAt: window.yesterday, endsAt: window.inSix, status: "ACTIVE" as const, priority: 5, policy: "EXCLUSIVE", approvalStatus: "APPROVED", approvedBy: ACTOR_ID },
    { id: promotionIds[1], name: "[DEV] Capacitores 35 µF · lote otoño", description: "Fixture visual de campaña activa con choque de prioridad.", type: "AMOUNT" as const, discountValue: "20.00", startsAt: window.yesterday, endsAt: window.inSix, status: "ACTIVE" as const, priority: 3, policy: "EXCLUSIVE", approvalStatus: "NOT_REQUIRED", approvedBy: null },
    { id: promotionIds[2], name: "[DEV] Precio especial motores ventilador", description: "Fixture visual de campaña programada.", type: "SPECIAL_PRICE" as const, discountValue: "99.00", startsAt: window.inFour, endsAt: window.inTwentyEight, status: "ACTIVE" as const, priority: 2, policy: "BEST_VALUE", approvalStatus: "NOT_REQUIRED", approvedBy: null },
    { id: promotionIds[3], name: "[DEV] Liquidación verano · por aprobar", description: "Fixture visual de aprobación pendiente.", type: "PERCENTAGE" as const, discountValue: "15.00", startsAt: window.now, endsAt: window.inTwentyOne, status: "DRAFT" as const, priority: 4, policy: "EXCLUSIVE", approvalStatus: "PENDING", approvedBy: null },
    { id: promotionIds[4], name: "[DEV] Filtros deshidratadores", description: "Fixture visual de borrador sin alcance para validar advertencia.", type: "AMOUNT" as const, discountValue: "10.00", startsAt: window.inFour, endsAt: window.inTwentyEight, status: "DRAFT" as const, priority: 1, policy: "STACKABLE", approvalStatus: "NOT_REQUIRED", approvedBy: null },
    { id: promotionIds[5], name: "[DEV] Campaña vencida", description: "Fixture visual de historial vencido.", type: "PERCENTAGE" as const, discountValue: "8.00", startsAt: window.fortyDaysAgo, endsAt: window.twoDaysAgo, status: "EXPIRED" as const, priority: 1, policy: "EXCLUSIVE", approvalStatus: "NOT_REQUIRED", approvedBy: null },
  ];
  await db.transaction(async (tx) => {
    for (const record of records) {
      await tx.insert(promotions).values({ ...record, createdBy: ACTOR_ID, updatedBy: ACTOR_ID, approvedAt: record.approvedBy ? window.twoDaysAgo : null, createdAt: window.twoDaysAgo, updatedAt: now }).onConflictDoUpdate({ target: promotions.id, set: { ...record, createdBy: ACTOR_ID, updatedBy: ACTOR_ID, approvedAt: record.approvedBy ? window.twoDaysAgo : null, updatedAt: now } });
    }
    const direct = [
      [promotionIds[0], selectedProducts[0].id], [promotionIds[0], selectedProducts[1].id], [promotionIds[0], selectedProducts[2].id],
      [promotionIds[1], selectedProducts[0].id], [promotionIds[1], selectedProducts[1].id],
      [promotionIds[2], selectedProducts[3]?.id ?? selectedProducts[2].id],
      [promotionIds[3], selectedProducts[0].id], [promotionIds[3], selectedProducts[2].id],
      [promotionIds[5], selectedProducts[4]?.id ?? selectedProducts[0].id],
    ] as const;
    await tx.insert(promotionProducts).values(direct.map(([promotionId, productId], index) => ({ id: `promotion-product-dev-${index}`, promotionId, productId })));
    await tx.insert(promotionCategories).values([{ id: "promotion-category-dev-1", promotionId: promotionIds[2], categoryId: category.id }, { id: "promotion-category-dev-2", promotionId: promotionIds[4], categoryId: category.id }]);
    for (const record of records) {
      await tx.insert(auditLogs).values({ id: `audit-dev-${record.id}-created`, actorId: ACTOR_ID, actorRole: "GERENCIA", action: "promotions.created", entityType: "promotion", entityId: record.id, before: null, after: { id: record.id, name: record.name, status: record.status }, metadata: { fixture: true }, createdAt: window.fortyDaysAgo }).onConflictDoNothing();
      if (record.approvedBy) await tx.insert(auditLogs).values({ id: `audit-dev-${record.id}-approved`, actorId: ACTOR_ID, actorRole: "GERENCIA", action: "promotions.approved", entityType: "promotion", entityId: record.id, before: { approvalStatus: "PENDING" }, after: { approvalStatus: "APPROVED" }, metadata: { fixture: true }, createdAt: window.twoDaysAgo }).onConflictDoNothing();
    }
  });
  const applicationSpecs = [
    { id: applicationIds[0], idempotencyKey: `${applicationIds[0]}-key`, promotionId: promotionIds[0], productId: selectedProducts[0].id, contextType: "checkout", contextId: "dev-order-001", createdAt: window.twoDaysAgo },
    { id: applicationIds[1], idempotencyKey: `${applicationIds[1]}-key`, promotionId: promotionIds[0], productId: selectedProducts[1].id, contextType: "quote", contextId: "dev-quote-001", createdAt: window.sevenDaysAgo },
    { id: applicationIds[2], idempotencyKey: `${applicationIds[2]}-key`, promotionId: promotionIds[1], productId: selectedProducts[0].id, contextType: "checkout", contextId: "dev-order-002", createdAt: window.fourteenDaysAgo },
    { id: applicationIds[3], idempotencyKey: `${applicationIds[3]}-key`, promotionId: promotionIds[0], productId: selectedProducts[2].id, contextType: "quote", contextId: "dev-quote-002", createdAt: window.fortyDaysAgo },
  ];
  await db.insert(promotionApplications).values(applicationSpecs.map((application) => {
    const base = Number(priceMap.get(application.productId)?.amount ?? "0");
    const promotion = records.find((record) => record.id === application.promotionId)!;
    const calculated = applyPromotionToUnitPrice({ id: promotion.id, type: promotion.type, discountValue: promotion.discountValue }, base);
    return { ...application, baseUnitPrice: calculated.baseUnitPrice, discountAmount: calculated.discountAmount, finalUnitPrice: calculated.finalUnitPrice };
  }));
  console.log(JSON.stringify({ fixture: "promotions-dev", promotionIds, productIds: selectedProducts.map((row) => row.id), categoryId: category.id }, null, 2));
}

async function main() {
  assertDevelopmentDatabase();
  if (process.argv.includes("--cleanup")) {
    await cleanup();
    console.log(JSON.stringify({ fixture: "promotions-dev", cleaned: true, promotionIds }, null, 2));
    return;
  }
  await seed();
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  void main().catch((error) => { console.error(error); process.exitCode = 1; });
}
