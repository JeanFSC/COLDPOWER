import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

async function main() {
  const db = getDb();
  const columns = await db.execute(sql`select table_name, column_name, data_type, udt_name, is_nullable from information_schema.columns where table_schema = 'public' and table_name in ('product_prices','price_history','discount_rules') order by table_name, ordinal_position`);
  const constraints = await db.execute(sql`select table_name, constraint_name, constraint_type from information_schema.table_constraints where table_schema = 'public' and table_name in ('product_prices','price_history','discount_rules') order by table_name, constraint_name`);
  console.log(JSON.stringify({ columns: columns.rows, constraints: constraints.rows }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
