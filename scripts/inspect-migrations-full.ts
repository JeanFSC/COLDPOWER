import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

async function main() {
  const db = getDb();
  const types = await db.execute(sql`select n.nspname as schema_name, t.typname as type_name from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typname in ('price_type','discount_rule_status','customer_type','customer_status','opportunity_stage','opportunity_origin','crm_activity_type','crm_task_status') order by t.typname`);
  const tables = await db.execute(sql`select table_name from information_schema.tables where table_schema = 'public' and table_name in ('product_prices','price_history','discount_rules','customers','opportunities','crm_activities','crm_tasks','opportunity_items','opportunity_stage_history','customer_quote_links') order by table_name`);
  const migrations = await db.execute(sql`select id, hash, created_at from drizzle.__drizzle_migrations order by id`);
  console.log(JSON.stringify({ types: types.rows, tables: tables.rows, migrations: migrations.rows }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
