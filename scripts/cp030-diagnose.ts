import { count, eq, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, companySettings, inventoryBalances, products, quotes, users } from "@/db/schema";
import { customers, opportunities } from "@/db/crm-schema";
import { orders, payments, sales } from "@/db/sales-schema";
import { notifications } from "@/db/operations-schema";

async function main() {
const db = getDb();
const [productTotals, publicationRows, duplicateRows, targetRows, inventoryTotals, userRows, settingsRows, entityTotals, notificationTotals, auditTotals] = await Promise.all([
  db.select({ total: count(products.id), skuCount: sql<number>`count(distinct ${products.sku})` }).from(products),
  db.select({ status: products.publicationStatus, total: count(products.id) }).from(products).groupBy(products.publicationStatus),
  db.select({ possibleDuplicate: products.possibleDuplicate, decision: products.duplicateDecision, total: count(products.id) }).from(products).groupBy(products.possibleDuplicate, products.duplicateDecision),
  db.select({ id: products.id, sku: products.sku, sourceRow: products.sourceRow, publicationStatus: products.publicationStatus, requiresReview: products.requiresReview, possibleDuplicate: products.possibleDuplicate }).from(products).where(or(eq(products.sku, "CP-REF-OTR-0435"), eq(products.sourceRow, 121))),
  db.select({ balances: count(inventoryBalances.id), products: sql<number>`count(distinct ${inventoryBalances.productId})`, knownOnHand: sql<number>`count(*) filter (where ${inventoryBalances.onHand} is not null)` }).from(inventoryBalances),
  db.select({ role: users.roleCode, status: users.status, total: count(users.id) }).from(users).groupBy(users.roleCode, users.status),
  db.select({ total: count(companySettings.id) }).from(companySettings),
  Promise.all([
    db.select({ name: sql<string>`'customers'`, total: count(customers.id) }).from(customers),
    db.select({ name: sql<string>`'opportunities'`, total: count(opportunities.id) }).from(opportunities),
    db.select({ name: sql<string>`'quotes'`, total: count(quotes.id) }).from(quotes),
    db.select({ name: sql<string>`'sales'`, total: count(sales.id) }).from(sales),
    db.select({ name: sql<string>`'orders'`, total: count(orders.id) }).from(orders),
    db.select({ name: sql<string>`'payments'`, total: count(payments.id) }).from(payments),
  ]),
  db.select({ state: notifications.state, total: count(notifications.id) }).from(notifications).groupBy(notifications.state),
  db.select({ total: count(auditLogs.id) }).from(auditLogs),
]);

console.log(JSON.stringify({
  products: { total: Number(productTotals[0]?.total ?? 0), uniqueSkus: Number(productTotals[0]?.skuCount ?? 0) },
  publication: publicationRows.map((row) => ({ status: row.status, total: Number(row.total) })),
  duplicates: duplicateRows.map((row) => ({ possibleDuplicate: row.possibleDuplicate, decision: row.decision, total: Number(row.total) })),
  targetRows,
  inventory: { balances: Number(inventoryTotals[0]?.balances ?? 0), productsWithBalances: Number(inventoryTotals[0]?.products ?? 0), knownOnHand: Number(inventoryTotals[0]?.knownOnHand ?? 0) },
  users: userRows.map((row) => ({ role: row.role, status: row.status, total: Number(row.total) })),
  companySettingsRows: Number(settingsRows[0]?.total ?? 0),
  entities: Object.fromEntries(entityTotals.map((row) => [row[0]?.name, Number(row[0]?.total ?? 0)])),
  notifications: notificationTotals.map((row) => ({ state: row.state, total: Number(row.total) })),
  auditEvents: Number(auditTotals[0]?.total ?? 0),
}, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
