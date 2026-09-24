import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import { migrate as migrateNeon } from "drizzle-orm/neon-serverless/migrator";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { createDbClient, getDatabaseDriver, type DatabaseDriver } from "../src/db";
import * as schema from "../src/db/schema";

export function getMigrationFolder(root = process.cwd()) {
  return path.resolve(root, "drizzle");
}

export async function runMigrations(
  databaseUrl = process.env.DATABASE_URL?.trim(),
  root = process.cwd(),
  driver: DatabaseDriver = getDatabaseDriver(),
) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL no está configurado; no se pueden aplicar migraciones.");
  }

  const client = createDbClient({ databaseUrl, driver });

  try {
    const migrations = { migrationsFolder: getMigrationFolder(root) };
    if (driver === "pg") {
      await migratePg(client.db as NodePgDatabase<typeof schema>, migrations);
    } else {
      await migrateNeon(client.db as NeonDatabase<typeof schema>, migrations);
    }
  } finally {
    await client.close();
  }
}

async function main() {
  await runMigrations();
  console.log("Migraciones de ColdPower aplicadas correctamente.");
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
