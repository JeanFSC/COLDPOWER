import { readMigrationFiles } from "drizzle-orm/migrator";
import { getDb } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  const migrations = readMigrationFiles({ migrationsFolder: "drizzle" });
  const db = getDb();
  const rows = await db.execute(sql`select id, hash, created_at from drizzle.__drizzle_migrations order by created_at desc limit 3`);
  console.log(JSON.stringify({ local: migrations.map((m) => ({ folderMillis: m.folderMillis, hash: m.hash, first: m.sql[0]?.slice(0, 80) })), db: rows.rows }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
