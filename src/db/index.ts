import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { databaseConfig } from "@/lib/env";
import * as schema from "@/db/combined-schema";

let cachedPool: Pool | null = null;
let cachedDb: NeonDatabase<typeof schema> | null = null;

export function getDb(): NeonDatabase<typeof schema> {
  if (cachedDb) return cachedDb;
  if (!databaseConfig.url) throw new Error("ColdPower: DATABASE_URL no configurado.");
  cachedPool = new Pool({ connectionString: databaseConfig.url });
  cachedDb = drizzle(cachedPool, { schema });
  return cachedDb;
}
