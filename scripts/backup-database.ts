import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeDb, getDb } from "../src/db";
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

const schemaVersion = "cp025-pre-migration-v1";

export type LogicalBackup = {
  schemaVersion: string;
  createdAt: string;
  tables: Record<string, unknown[]>;
};

function serialize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serialize(entry)]));
  }
  return value;
}

export async function createLogicalBackup(): Promise<LogicalBackup> {
  const db = getDb();
  const [categoryRows, familyRows, brandRows, productRows, relationRows, userRows, quoteRows, quoteItemRows, quoteHistoryRows, cartRows] = await Promise.all([
    db.select().from(categories),
    db.select().from(families),
    db.select().from(brands),
    db.select().from(products),
    db.select().from(productRelations),
    db.select({ id: users.id, email: users.email, name: users.name, phone: users.phone, role: users.role, roleCode: users.roleCode, createdAt: users.createdAt, updatedAt: users.updatedAt }).from(users),
    db.select({
      id: quotes.id,
      trackingCode: quotes.trackingCode,
      userId: quotes.userId,
      name: quotes.name,
      customerType: quotes.customerType,
      documentNumber: quotes.documentNumber,
      phone: quotes.phone,
      email: quotes.email,
      department: quotes.department,
      province: quotes.province,
      district: quotes.district,
      preferredContact: quotes.preferredContact,
      consentAt: quotes.consentAt,
      productSlug: quotes.productSlug,
      productName: quotes.productName,
      sku: quotes.sku,
      message: quotes.message,
      status: quotes.status,
      clientIp: quotes.clientIp,
      createdAt: quotes.createdAt,
      updatedAt: quotes.updatedAt,
    }).from(quotes),
    db.select().from(quoteItems),
    db.select().from(quoteStatusHistory),
    db.select().from(quoteCarts),
  ]);

  return {
    schemaVersion,
    createdAt: new Date().toISOString(),
    tables: {
      categories: serialize(categoryRows) as unknown[],
      families: serialize(familyRows) as unknown[],
      brands: serialize(brandRows) as unknown[],
      products: serialize(productRows) as unknown[],
      productRelations: serialize(relationRows) as unknown[],
      users: serialize(userRows) as unknown[],
      quotes: serialize(quoteRows) as unknown[],
      quoteItems: serialize(quoteItemRows) as unknown[],
      quoteStatusHistory: serialize(quoteHistoryRows) as unknown[],
      quoteCarts: serialize(cartRows) as unknown[],
    },
  };
}

export async function writeLogicalBackup(root = process.cwd()) {
  const backup = await createLogicalBackup();
  const directory = path.resolve(root, "tmp", "backups");
  await fs.mkdir(directory, { recursive: true });
  const filename = `cp025-pre-migration-${backup.createdAt.replace(/[:.]/g, "-")}.json`;
  const target = path.join(directory, filename);
  await fs.writeFile(target, `${JSON.stringify(backup, null, 2)}\n`, "utf8");
  return { target, backup };
}

async function main() {
  try {
    const { target, backup } = await writeLogicalBackup();
    const counts = Object.fromEntries(Object.entries(backup.tables).map(([name, rows]) => [name, rows.length]));
    console.log(JSON.stringify({ target, schemaVersion: backup.schemaVersion, counts }, null, 2));
  } finally {
    await closeDb();
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
