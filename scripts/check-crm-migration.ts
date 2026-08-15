import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

async function main() {
  const db = getDb();
  const tables = await db.execute(sql`select table_name from information_schema.tables where table_schema = 'public' and table_name in ('customers','opportunities','crm_activities','crm_tasks') order by table_name`);
  const migrations = await db.execute(sql`select id, hash from drizzle.__drizzle_migrations order by id`);
  console.log(JSON.stringify({ tables: tables.rows, migrations: migrations.rows }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
