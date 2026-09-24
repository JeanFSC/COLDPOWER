const DEFAULT_POOL_MAX = 20;

export function getConfiguredDatabaseDriver(value = process.env.DATABASE_DRIVER) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === "neon") return "neon";
  if (normalized === "pg") return "pg";
  throw new Error(`DATABASE_DRIVER no soportado: ${value}. Usa "neon" o "pg".`);
}

export async function createDatabasePool(databaseUrl = process.env.DATABASE_URL?.trim()) {
  if (!databaseUrl) throw new Error("DATABASE_URL no configurado.");
  const max = Number(process.env.DATABASE_POOL_MAX);
  const poolOptions = { connectionString: databaseUrl, max: Number.isFinite(max) && max > 0 ? max : DEFAULT_POOL_MAX };

  if (getConfiguredDatabaseDriver() === "pg") {
    const { Pool } = await import("pg");
    return new Pool(poolOptions);
  }

  const { Pool } = await import("@neondatabase/serverless");
  return new Pool(poolOptions);
}
