import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

async function main() {
  const result = await getDb().execute(sql.raw("INSERT INTO drizzle.__drizzle_migrations (hash, created_at) SELECT '9506c942dfe77f129d4bbea5c10e96c4f2339347a8cf84fd73f3937bed5bfbc4', 1786564449916 WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = '9506c942dfe77f129d4bbea5c10e96c4f2339347a8cf84fd73f3937bed5bfbc4') RETURNING id, hash, created_at"));
  console.log(JSON.stringify(result.rows));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
