import { desc, eq, count } from "drizzle-orm";
import { getDb } from "../src/db";
import { auditLogs, inventoryBalances, inventoryMovements, locations, products } from "../src/db/schema";
import { getCatalogProducts } from "../src/lib/catalog-repository";

async function main() {
  const db = getDb();
  const [statuses, regression, publicCatalog, locationCount, balanceCount, movementCount, auditCount] = await Promise.all([
    db.select({ status: products.publicationStatus, count: count(products.id) }).from(products).groupBy(products.publicationStatus).orderBy(desc(products.publicationStatus)),
    db.select({ sku: products.sku, publicationStatus: products.publicationStatus, requiresReview: products.requiresReview, reviewReason: products.reviewReason }).from(products).where(eq(products.sku, "CP-REF-OTR-0435")).limit(1),
    getCatalogProducts({ page: 1, pageSize: 1 }),
    db.select({ count: count(locations.id) }).from(locations),
    db.select({ count: count(inventoryBalances.id) }).from(inventoryBalances),
    db.select({ count: count(inventoryMovements.id) }).from(inventoryMovements),
    db.select({ count: count(auditLogs.id) }).from(auditLogs),
  ]);
  console.log(JSON.stringify({ statuses, regression, publicTotal: publicCatalog.total, locations: Number(locationCount[0]?.count ?? 0), balances: Number(balanceCount[0]?.count ?? 0), movements: Number(movementCount[0]?.count ?? 0), auditLogs: Number(auditCount[0]?.count ?? 0) }, null, 2));
}
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
