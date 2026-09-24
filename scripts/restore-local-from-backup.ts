import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { count, inArray } from "drizzle-orm";
import { createDbClient, getDatabaseDriver, type DatabaseDriver } from "../src/db";
import {
  brands,
  categories,
  families,
  productRelations,
  products,
  quoteCarts,
  quoteItems,
  quoteStatusHistory,
  quotes,
  users,
} from "../src/db/schema";

export const DEFAULT_BACKUP_PATH = path.resolve(
  process.cwd(),
  "tmp/backups/cp025-pre-migration-2026-09-23T23-19-56-959Z.json",
);

type LogicalBackup = {
  schemaVersion: string;
  createdAt?: string;
  tables: Record<string, unknown[]>;
};

type JsonRow = Record<string, unknown>;

const RESTORE_DATASETS = [
  { name: "users", table: users, dateFields: ["createdAt", "updatedAt"] },
  { name: "categories", table: categories, dateFields: ["createdAt", "updatedAt"] },
  { name: "families", table: families, dateFields: ["createdAt", "updatedAt"] },
  { name: "brands", table: brands, dateFields: ["createdAt", "updatedAt"] },
  { name: "products", table: products, dateFields: ["publicationChangedAt", "createdAt", "updatedAt"] },
  { name: "productRelations", table: productRelations, dateFields: ["createdAt", "updatedAt"] },
  { name: "quoteCarts", table: quoteCarts, dateFields: ["expiresAt", "createdAt", "updatedAt"] },
  { name: "quotes", table: quotes, dateFields: ["consentAt", "createdAt", "updatedAt"] },
  { name: "quoteItems", table: quoteItems, dateFields: ["createdAt", "updatedAt"] },
  { name: "quoteStatusHistory", table: quoteStatusHistory, dateFields: ["createdAt"] },
] as const;

export function assertLocalDatabaseUrl(databaseUrl: string | undefined | null) {
  if (!databaseUrl?.trim()) throw new Error("DATABASE_URL no está configurado.");

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL no contiene una URL válida.");
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!new Set(["localhost", "127.0.0.1", "::1"]).has(hostname)) {
    throw new Error(`Restauración local detenida: DATABASE_URL apunta a ${hostname}, no a localhost.`);
  }

  return databaseUrl.trim();
}

function readRows(backup: LogicalBackup, tableName: string): JsonRow[] {
  const rawRows = backup.tables[tableName];
  if (!Array.isArray(rawRows)) throw new Error(`El backup no contiene la tabla ${tableName}.`);

  return rawRows.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`${tableName}[${index}] no es un objeto válido.`);
    }
    return row as JsonRow;
  });
}

function parseBackup(raw: string): LogicalBackup {
  const parsed = JSON.parse(raw) as Partial<LogicalBackup>;
  if (!parsed.schemaVersion || !parsed.tables || typeof parsed.tables !== "object") {
    throw new Error("El backup no tiene schemaVersion y tables válidos.");
  }
  return parsed as LogicalBackup;
}

function withDates(row: JsonRow, dateFields: readonly string[], tableName: string, index: number) {
  const normalized = { ...row };
  for (const field of dateFields) {
    const value = normalized[field];
    if (value === null || value === undefined) continue;
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) throw new Error(`${tableName}[${index}].${field} no es una fecha válida.`);
    normalized[field] = date;
  }
  return normalized;
}

// The backup contains rows from a previous schema revision, so rows are applied one by one
// with only the primary key removed from the update set. Newer columns keep their defaults.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertRows(tx: any, table: any, rows: JsonRow[]) {
  for (const row of rows) {
    if (typeof row.id !== "string" || !row.id) throw new Error("Cada fila del backup debe tener un id.");
    const updates = Object.fromEntries(Object.entries(row).filter(([key]) => key !== "id"));
    await tx.insert(table).values(row).onConflictDoUpdate({ target: table.id, set: updates });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countRowsByIds(tx: any, table: any, rows: JsonRow[]) {
  const ids = [...new Set(rows.map((row) => row.id).filter((id): id is string => typeof id === "string"))];
  if (ids.length !== rows.length) throw new Error("El backup contiene ids duplicados o ausentes.");
  if (!ids.length) return 0;
  const [result] = await tx.select({ total: count() }).from(table).where(inArray(table.id, ids));
  return Number(result?.total ?? 0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function verifyIdentity(tableName: string, expectedRows: JsonRow[], actualRows: any[], fields: readonly string[]) {
  const actualById = new Map(actualRows.map((row) => [row.id, row]));
  for (const expected of expectedRows) {
    const actual = actualById.get(expected.id);
    if (!actual) throw new Error(`No se encontró ${tableName} con id ${String(expected.id)} después de restaurar.`);
    for (const field of fields) {
      if (actual[field] !== expected[field]) {
        throw new Error(`${tableName}.${field} no coincide para ${String(expected.id)}.`);
      }
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function verifyCatalogIdentity(tx: any, backup: LogicalBackup) {
  const categoryRows = readRows(backup, "categories");
  const familyRows = readRows(backup, "families");
  const brandRows = readRows(backup, "brands");
  const productRows = readRows(backup, "products");

  if (categoryRows.length) {
    const ids = categoryRows.map((row) => row.id as string);
    const actual = await tx.select({ id: categories.id, slug: categories.slug }).from(categories).where(inArray(categories.id, ids));
    verifyIdentity("categories", categoryRows, actual, ["slug"]);
  }
  if (familyRows.length) {
    const ids = familyRows.map((row) => row.id as string);
    const actual = await tx.select({ id: families.id, slug: families.slug }).from(families).where(inArray(families.id, ids));
    verifyIdentity("families", familyRows, actual, ["slug"]);
  }
  if (brandRows.length) {
    const ids = brandRows.map((row) => row.id as string);
    const actual = await tx.select({ id: brands.id, slug: brands.slug }).from(brands).where(inArray(brands.id, ids));
    verifyIdentity("brands", brandRows, actual, ["slug"]);
  }
  if (productRows.length) {
    const ids = productRows.map((row) => row.id as string);
    const actual = await tx.select({ id: products.id, slug: products.slug, sku: products.sku }).from(products).where(inArray(products.id, ids));
    verifyIdentity("products", productRows, actual, ["slug", "sku"]);
  }
}

export async function restoreLocalFromBackup(
  backupPath = DEFAULT_BACKUP_PATH,
  databaseUrl = process.env.DATABASE_URL,
  driver: DatabaseDriver = getDatabaseDriver(),
) {
  const localUrl = assertLocalDatabaseUrl(databaseUrl);
  if (driver !== "pg") throw new Error("La restauración local requiere DATABASE_DRIVER=pg.");

  const backup = parseBackup(await fs.readFile(backupPath, "utf8"));
  const client = createDbClient({ databaseUrl: localUrl, driver });
  const counts: Record<string, { expected: number; restored: number }> = {};

  try {
    await client.db.transaction(async (tx) => {
      for (const dataset of RESTORE_DATASETS) {
        const rawRows = readRows(backup, dataset.name);
        const rows = rawRows.map((row, index) => withDates(row, dataset.dateFields, dataset.name, index));
        await upsertRows(tx, dataset.table, rows);
        const restored = await countRowsByIds(tx, dataset.table, rows);
        counts[dataset.name] = { expected: rows.length, restored };
        if (restored !== rows.length) throw new Error(`La tabla ${dataset.name} esperaba ${rows.length} filas y restauró ${restored}.`);
      }
      await verifyCatalogIdentity(tx, backup);
    });
  } finally {
    await client.close();
  }

  return { backupPath: path.resolve(backupPath), schemaVersion: backup.schemaVersion, counts };
}

async function main() {
  const backupArgument = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
  const result = await restoreLocalFromBackup(backupArgument ? path.resolve(backupArgument) : DEFAULT_BACKUP_PATH);
  console.log(JSON.stringify(result, null, 2));
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
