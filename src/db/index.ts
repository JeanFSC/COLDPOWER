import { Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as neonDrizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { drizzle as pgDrizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import { databaseConfig } from "@/lib/env";
import * as schema from "@/db/combined-schema";

export type DatabaseDriver = "neon" | "pg";
export type AppDatabase = NeonDatabase<typeof schema> | NodePgDatabase<typeof schema>;

type DatabaseClient = {
  db: AppDatabase;
  close: () => Promise<void>;
};

type DatabaseClientOptions = {
  databaseUrl?: string | null;
  driver?: DatabaseDriver;
};

let cachedDb: AppDatabase | null = null;
let cachedClose: (() => Promise<void>) | null = null;

export function getDatabaseDriver(value = process.env.DATABASE_DRIVER): DatabaseDriver {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === "neon") return "neon";
  if (normalized === "pg") return "pg";
  throw new Error(`ColdPower: DATABASE_DRIVER no soportado: ${value}. Usa \"neon\" o \"pg\".`);
}

function requireDatabaseUrl(databaseUrl: string | null | undefined) {
  const value = databaseUrl?.trim();
  if (!value) throw new Error("ColdPower: DATABASE_URL no configurado.");
  return value;
}

export function createDbClient(options: DatabaseClientOptions = {}): DatabaseClient {
  const databaseUrl = requireDatabaseUrl(options.databaseUrl ?? databaseConfig.url);
  const driver = options.driver ?? getDatabaseDriver();

  if (driver === "pg") {
    const pool = new PgPool({ connectionString: databaseUrl, max: databaseConfig.poolMax });
    return { db: pgDrizzle(pool, { schema }), close: () => pool.end() };
  }

  const pool = new NeonPool({ connectionString: databaseUrl, max: databaseConfig.poolMax });
  return { db: neonDrizzle(pool, { schema }), close: () => pool.end() };
}

export function getDb(): AppDatabase {
  if (cachedDb) return cachedDb;
  const client = createDbClient();
  cachedDb = client.db;
  cachedClose = client.close;
  return cachedDb;
}

export async function closeDb() {
  const close = cachedClose;
  cachedDb = null;
  cachedClose = null;
  if (close) await close();
}
