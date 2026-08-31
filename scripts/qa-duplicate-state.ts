import { count } from "drizzle-orm";
import { getDb } from "../src/db";
import { products } from "../src/db/schema";

async function main() {
  const db = getDb();
  const rows = await db.select({ decision: products.duplicateDecision, possibleDuplicate: products.possibleDuplicate, total: count(products.id) }).from(products).groupBy(products.duplicateDecision, products.possibleDuplicate);
  console.log(JSON.stringify(rows, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
