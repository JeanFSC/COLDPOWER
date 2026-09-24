import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { count, countDistinct, eq, gt } from "drizzle-orm";
import { createDbClient } from "../src/db";
import { brands, categories, families, products } from "../src/db/schema";

export const EXPECTED_PRODUCT_COUNT = 1348;
export const REQUIRED_CATEGORY_SLUGS = [
  "lavadoras",
  "licuadoras",
  "bombas-de-agua",
  "cocinas",
  "campanas-extractoras",
  "refrigeracion",
] as const;

export type InventoryQaMetrics = {
  totalProducts: number;
  uniqueSkuCount: number;
  duplicateSkus: string[];
  categories: number;
  families: number;
  brands: number;
  requiredCategoryCounts: Record<(typeof REQUIRED_CATEGORY_SLUGS)[number], number>;
};

export type InventoryQaReport = InventoryQaMetrics & {
  expectedProductCount: number;
  passed: boolean;
  errors: string[];
};

export function evaluateInventoryQa(metrics: InventoryQaMetrics): InventoryQaReport {
  const errors: string[] = [];

  if (metrics.totalProducts !== EXPECTED_PRODUCT_COUNT) {
    errors.push(`Se esperaban ${EXPECTED_PRODUCT_COUNT} productos y la base tiene ${metrics.totalProducts}.`);
  }
  if (metrics.uniqueSkuCount !== metrics.totalProducts) {
    errors.push(`Los SKU únicos (${metrics.uniqueSkuCount}) no coinciden con los productos (${metrics.totalProducts}).`);
  }
  if (metrics.duplicateSkus.length > 0) {
    errors.push(`Hay SKU duplicados: ${metrics.duplicateSkus.join(", ")}.`);
  }
  if (metrics.categories <= 0 || metrics.families <= 0 || metrics.brands <= 0) {
    errors.push("Las dimensiones categories, families y brands deben quedar persistidas con registros.");
  }
  for (const slug of REQUIRED_CATEGORY_SLUGS) {
    if ((metrics.requiredCategoryCounts[slug] ?? 0) <= 0) {
      errors.push(`La categoría requerida ${slug} no tiene productos persistidos.`);
    }
  }

  return {
    expectedProductCount: EXPECTED_PRODUCT_COUNT,
    ...metrics,
    passed: errors.length === 0,
    errors,
  };
}

export async function runInventoryQa(
  databaseUrl = process.env.DATABASE_URL?.trim(),
): Promise<InventoryQaReport> {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL no está configurado; no se puede ejecutar el QA de inventario.");
  }

  const client = createDbClient({ databaseUrl });
  const db = client.db;

  try {
    const [productSummary] = await db
      .select({ totalProducts: count(products.id), uniqueSkuCount: countDistinct(products.sku) })
      .from(products);
    const duplicateRows = await db
      .select({ sku: products.sku, total: count(products.id) })
      .from(products)
      .groupBy(products.sku)
      .having(gt(count(products.id), 1));
    const [categorySummary] = await db.select({ value: count(categories.id) }).from(categories);
    const [familySummary] = await db.select({ value: count(families.id) }).from(families);
    const [brandSummary] = await db.select({ value: count(brands.id) }).from(brands);
    const categoryRows = await db
      .select({ slug: categories.slug, total: count(products.id) })
      .from(categories)
      .leftJoin(products, eq(products.categoryId, categories.id))
      .groupBy(categories.slug);
    const categoryCounts = new Map(categoryRows.map((row) => [row.slug, Number(row.total)]));
    const requiredCategoryCounts = Object.fromEntries(
      REQUIRED_CATEGORY_SLUGS.map((slug) => [slug, categoryCounts.get(slug) ?? 0]),
    ) as InventoryQaMetrics["requiredCategoryCounts"];

    return evaluateInventoryQa({
      totalProducts: Number(productSummary?.totalProducts ?? 0),
      uniqueSkuCount: Number(productSummary?.uniqueSkuCount ?? 0),
      duplicateSkus: duplicateRows.map((row) => row.sku),
      categories: Number(categorySummary?.value ?? 0),
      families: Number(familySummary?.value ?? 0),
      brands: Number(brandSummary?.value ?? 0),
      requiredCategoryCounts,
    });
  } finally {
    await client.close();
  }
}

async function main() {
  const report = await runInventoryQa();
  const reportPath = path.resolve(process.cwd(), "tmp/inventory-qa-latest.json");
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));

  if (!report.passed) process.exitCode = 1;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
