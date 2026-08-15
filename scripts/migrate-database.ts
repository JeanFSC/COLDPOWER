import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import * as schema from "../src/db/schema";

export function getMigrationFolder(root = process.cwd()) {
  return path.resolve(root, "drizzle");
}

export async function runMigrations(
  databaseUrl = process.env.DATABASE_URL?.trim(),
  root = process.cwd(),
) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL no está configurado; no se pueden aplicar migraciones.");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  try {
    await migrate(db, { migrationsFolder: getMigrationFolder(root) });
  } finally {
    await pool.end();
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
