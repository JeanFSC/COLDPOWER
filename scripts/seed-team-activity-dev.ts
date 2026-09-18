import { asc, desc, eq } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getDb } from "../src/db";
import { auditLogs, customers, orders, products, quotes, sales, users } from "../src/db/combined-schema";
import { assertDevDatabaseTarget, assertDevMockSeedAllowed, mockFixtureId } from "../src/lib/dev-mock-fixtures";

// Dev-only fixture for the Inicio "Actividad del equipo" widget (getOperationsDashboard's
// recentActivity, scoped to filters.range === "today"). seed-dev-mock.ts's audit rows are all
// backdated at least 1 day (built for the Dashboard's month view), so "today" always renders
// empty regardless of when it's rerun. This inserts a handful of audit_log rows timestamped
// within the last few hours, referencing real existing users/products/quotes/orders/customers/
// sales so nothing is fabricated — only the audit event itself is synthetic, tagged and
// idempotent like every other dev fixture in this repo (seed-notifications-dev.ts,
// seed-visual-year.ts).
const fixture = "cp-team-activity-dev";
const id = (entity: string, key: string) => mockFixtureId(entity, key);
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertRows(tx: any, table: any, rows: any[]) {
  if (!rows.length) return 0;
  const inserted = await tx.insert(table).values(rows).onConflictDoNothing().returning({ id: table.id });
  return inserted.length;
}

export async function seedTeamActivityDevData() {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [actor] = await tx.select({ id: users.id, name: users.name }).from(users).where(eq(users.roleCode, "SUPERADMIN")).orderBy(asc(users.createdAt)).limit(1);
    if (!actor) throw new Error("No existe un SUPERADMIN activo para atribuir el fixture de actividad del equipo.");
    const activeUsers = await tx.select({ id: users.id, name: users.name }).from(users).where(eq(users.status, "ACTIVE")).orderBy(asc(users.createdAt)).limit(6);
    const others = activeUsers.filter((user) => user.id !== actor.id);
    const actors = [actor, others[0] ?? actor, others[1] ?? actor, others[2] ?? actor];

    const [product] = await tx.select({ id: products.id }).from(products).orderBy(desc(products.createdAt)).limit(1);
    const [quote] = await tx.select({ id: quotes.id }).from(quotes).orderBy(desc(quotes.createdAt)).limit(1);
    const [order] = await tx.select({ id: orders.id }).from(orders).orderBy(desc(orders.createdAt)).limit(1);
    const [customer] = await tx.select({ id: customers.id }).from(customers).orderBy(desc(customers.createdAt)).limit(1);
    const [sale] = await tx.select({ id: sales.id }).from(sales).orderBy(desc(sales.createdAt)).limit(1);

    const definitions = [
      customer && { key: "1", action: "customers.created", entityType: "customer", entityId: customer.id, module: "customers", actorIndex: 1, hours: 1 },
      quote && { key: "2", action: "quotes.created", entityType: "quote", entityId: quote.id, module: "quotes", actorIndex: 2, hours: 2 },
      order && { key: "3", action: "orders.created", entityType: "order", entityId: order.id, module: "orders", actorIndex: 3, hours: 3 },
      product && { key: "4", action: "pricing.price_updated", entityType: "product", entityId: product.id, module: "pricing", actorIndex: 0, hours: 4 },
      sale && { key: "5", action: "sales.created", entityType: "sale", entityId: sale.id, module: "sales", actorIndex: 1, hours: 5 },
      product && { key: "6", action: "catalog.product_editorial_updated", entityType: "product", entityId: product.id, module: "catalog", actorIndex: 2, hours: 6 },
    ].filter((row): row is NonNullable<typeof row> => Boolean(row));

    const rows = definitions.map((event) => ({
      id: id(fixture, event.key),
      actorId: actors[event.actorIndex].id,
      actorRole: "SUPERADMIN",
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      module: event.module,
      severity: "INFO",
      origin: "DEV_TEAM_ACTIVITY_SEED",
      correlationId: fixture,
      after: { fixture },
      metadata: { source: "development-team-activity-seed" },
      createdAt: hoursAgo(event.hours),
    }));
    const auditCount = await insertRows(tx, auditLogs, rows);

    return { auditCount, actor: actor.name };
  });
}

async function main() {
  assertDevMockSeedAllowed(process.env, process.argv);
  assertDevDatabaseTarget(process.env, process.argv);
  const result = await seedTeamActivityDevData();
  console.log("Fixture de actividad del equipo aplicado:", result);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
