import { and, asc, eq, like } from "drizzle-orm";
import { getDb } from "../src/db";
import { categories, families, productPrices, products, users } from "../src/db/combined-schema";
import { promotionProducts, promotions } from "../src/db/combined-schema";
import { assertDevDatabaseTarget, assertDevMockSeedAllowed } from "../src/lib/dev-mock-fixtures";

const fixturePrefix = "home-espejo-v1";
const actorMarker = `${fixturePrefix}-fixture`;
const targetPatterns = [
  /motocompresor|compresor(?!a)/i,
  /motor.*vent|ventilador/i,
  /control|termostat/i,
  /refrigerante/i,
  /h[eé]lice|ventilador/i,
  /v[aá]lvula/i,
  /presostat/i,
  /tarjeta/i,
  /bomba.*drenaje|drenaje/i,
  /condensador/i,
  /rel[eé]|protector/i,
  /filtro.*secador/i,
];
const visualPrices = [1250, 320, 480, 650, 120, 280, 180, 420, 95, 380, 75, 90];

type FixtureProduct = { id: string; name: string; originalName?: string; category: string; family: string; publicationStatus: string };

function fixtureId(entity: string, key: string) {
  return `${fixturePrefix}-${entity}-${key}`;
}

// Drizzle's transaction/table generic is intentionally kept at this script boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function chooseProducts(tx: any): Promise<FixtureProduct[]> {
  const rows = await tx
    .select({ id: products.id, name: products.normalizedName, originalName: products.originalName, category: categories.name, family: families.name, publicationStatus: products.publicationStatus })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(families, eq(products.familyId, families.id))
    .where(eq(products.status, "Activo"))
    .orderBy(asc(products.sku));
  const candidates = rows.filter((row: FixtureProduct) => row.publicationStatus !== "published");
  const used = new Set<string>();
  const selected: FixtureProduct[] = [];
  for (const pattern of targetPatterns) {
    const match = candidates.find((row: FixtureProduct) => !used.has(row.id) && pattern.test(`${row.name} ${row.originalName ?? ""} ${row.family}`));
    if (match) {
      used.add(match.id);
      selected.push(match);
    }
  }
  for (const row of candidates) {
    if (selected.length >= targetPatterns.length) break;
    if (!used.has(row.id)) {
      used.add(row.id);
      selected.push(row);
    }
  }
  if (selected.length < targetPatterns.length) throw new Error(`El catálogo activo solo permite preparar ${selected.length} de ${targetPatterns.length} productos para la fixture.`);
  return selected.slice(0, targetPatterns.length);
}

export async function seedHomeEspejoFixture() {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [actor] = await tx.select({ id: users.id }).from(users).where(and(eq(users.roleCode, "SUPERADMIN"), eq(users.status, "ACTIVE"))).orderBy(asc(users.createdAt)).limit(1);
    if (!actor) throw new Error("No existe un SUPERADMIN activo para atribuir la fixture del home.");
    const selected = await chooseProducts(tx);
    const now = new Date();

    for (const [index, product] of selected.entries()) {
      await tx.update(products).set({ updatedAt: now, publicationStatus: "published", requiresReview: false, possibleDuplicate: false, availabilityStatus: "in_stock", featured: index < 6, publicationChangedAt: now, publicationChangedBy: actorMarker, publicationNote: `${fixturePrefix}: datos de visualización no operativos` }).where(eq(products.id, product.id));
      await tx.insert(productPrices).values({ id: fixtureId("price", String(index + 1).padStart(2, "0")), productId: product.id, priceType: "RETAIL", amount: visualPrices[index].toFixed(2), currency: "PEN", status: "ACTIVE", active: true, validFrom: now, idempotencyKey: fixtureId("price-key", product.id), createdBy: actor.id }).onConflictDoNothing();
    }

    const promotionId = fixtureId("promotion", "home");
    await tx.insert(promotions).values({ id: promotionId, name: "Fixture visual Home Espejo", description: "Promoción no operativa para validar el home en desarrollo.", type: "PERCENTAGE", discountValue: "10.00", startsAt: now, endsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), status: "ACTIVE", priority: 1, policy: "EXCLUSIVE", approvalStatus: "NOT_REQUIRED", createdBy: actor.id, updatedBy: actor.id }).onConflictDoNothing();
    await tx.insert(promotionProducts).values(selected.slice(0, 3).map((product, index) => ({ id: fixtureId("promotion-product", String(index + 1).padStart(2, "0")), promotionId, productId: product.id }))).onConflictDoNothing();
    return { products: selected.length, promotionId };
  });
}

export async function revertHomeEspejoFixture() {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.delete(promotionProducts).where(like(promotionProducts.id, `${fixturePrefix}-%`));
    await tx.delete(promotions).where(like(promotions.id, `${fixturePrefix}-%`));
    await tx.delete(productPrices).where(like(productPrices.id, `${fixturePrefix}-%`));
    const reverted = await tx.update(products).set({ publicationStatus: "review", requiresReview: true, possibleDuplicate: false, availabilityStatus: "unknown", featured: false, publicationChangedAt: null, publicationChangedBy: null, publicationNote: null }).where(eq(products.publicationChangedBy, actorMarker)).returning({ id: products.id });
    return { products: reverted.length };
  });
}

async function main() {
  const args = process.argv.slice(2);
  assertDevDatabaseTarget(process.env, args);
  assertDevMockSeedAllowed(process.env, args);
  const result = args.includes("--revert") ? await revertHomeEspejoFixture() : await seedHomeEspejoFixture();
  console.log(JSON.stringify({ fixture: fixturePrefix, action: args.includes("--revert") ? "revert" : "seed", ...result }));
}

if (process.argv[1]?.endsWith("seed-home-espejo.ts")) void main();
