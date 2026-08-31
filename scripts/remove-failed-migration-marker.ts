import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

async function main() {
  const result = await getDb().execute(sql.raw("DELETE FROM drizzle.__drizzle_migrations WHERE id = 10 AND hash = 'f21fafb382e05a6bd34c65c37e4b3737a980ced204f62368973a8f2dd4cfada0' RETURNING id"));
  console.log(JSON.stringify(result.rows));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
