import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { databaseConfig } from "@/lib/env";
import * as schema from "@/db/combined-schema";

let cachedPool: Pool | null = null;
let cachedDb: NeonDatabase<typeof schema> | null = null;

export function getDb(): NeonDatabase<typeof schema> {
  if (cachedDb) return cachedDb;
  if (!databaseConfig.url) throw new Error("ColdPower: DATABASE_URL no configurado.");
  // Default node-postgres/Neon pool max is 10; the operations dashboard fires
  // 35 independent queries in a single Promise.all, so a small pool queues
  // most of them for a free connection instead of running truly in parallel.
  // This process is long-lived (pnpm start), not per-request serverless, so a
  // larger persistent pool against Neon's pooled connection string is safe.
  cachedPool = new Pool({ connectionString: databaseConfig.url, max: databaseConfig.poolMax });
  cachedDb = drizzle(cachedPool, { schema });
  return cachedDb;
}
