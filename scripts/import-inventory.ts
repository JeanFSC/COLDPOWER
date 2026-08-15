import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "../src/db/schema";
import { brands, categories, families, products } from "../src/db/schema";
import { planProductSlugs, readImportRows, validateImportRows } from "./inventory-import.mjs";

type SourceRow = Record<string, string | boolean | null>;
type DimensionIds = { categoryId: string; familyId: string; brandId: string | null; slug: string };
const IMMUTABLE_PRODUCT_FIELDS = new Set(["id", "sku", "slug"]);

export type ImportReport = {
  totalRead: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  categoriesCreated: number;
  familiesCreated: number;
  brandsCreated: number;
};

export function splitCompatibilityBrands(value: string | null) {
  if (!value) return null;
  const values = [...new Set(value.split(/[;,|]/).map((item) => item.trim()).filter(Boolean))];
  return values.length > 0 ? values : null;
}

export function mapSourceRow(row: SourceRow, dimensions: DimensionIds) {
  const sku = required(row, "sku");
  const originalName = required(row, "nombre_original");
  const normalizedName = required(row, "nombre_normalizado");
  const productType = required(row, "producto");
  const status = required(row, "estado");

  return {
    id: `product-${slugPart(sku)}`,
    sku,
    slug: dimensions.slug,
    originalName,
    normalizedName,
    productType,
    categoryId: dimensions.categoryId,
    familyId: dimensions.familyId,
    brandId: dimensions.brandId,
    compatibilityBrands: splitCompatibilityBrands(text(row.compatibilidad_marcas)),
    modelCode: text(row.modelo_codigo),
    application: text(row.aplicacion),
    voltage: text(row.voltaje),
    power: text(row.potencia),
    frequency: text(row.frecuencia),
    rpm: text(row.rpm),
    amperage: text(row.amperage ?? row.amperaje),
    capacitance: text(row.capacitancia),
    refrigerant: text(row.refrigerante),
    horsepower: text(row.potencia_hp),
    temperature: text(row.temperatura),
    dimensions: text(row.medidas),
    length: text(row.longitud),
    connectionSize: text(row.conexion_medida),
    unitOfMeasure: text(row.unidad_medida),
    status,
    taxType: text(row.impuesto),
    originalReferenceCode: text(row.codigo_referencia_original),
    barcode: text(row.codigo_barra_original),
    originalWeight: text(row.peso_original),
    requiresReview: booleanOrNull(row.requiere_revision),
    reviewReason: text(row.motivo_revision),
    possibleDuplicate: booleanOrNull(row.posible_duplicado),
    duplicateGroup: text(row.grupo_duplicado),
    normalizationConfidence: text(row.confianza_normalizacion),
    normalizationMethod: text(row.metodo_clasificacion),
    sourcePage: integerOrNull(row.pagina_fuente),
    sourceRow: integerOrNull(row.fila_pagina),
    updatedAt: new Date(),
  };
}

export function toProductUpdateValues(product: ReturnType<typeof mapSourceRow>) {
  return Object.fromEntries(
    Object.entries(product).filter(([field]) => !IMMUTABLE_PRODUCT_FIELDS.has(field)),
  ) as Omit<ReturnType<typeof mapSourceRow>, "id" | "sku" | "slug">;
}

async function importInventory(workbookPath: string, apply: boolean): Promise<ImportReport> {
  const { rows: rawRows } = readImportRows(workbookPath) as unknown as { rows: SourceRow[] };
  const rows = rawRows;
  const validation = validateImportRows(rows);
  const report: ImportReport = {
    totalRead: rows.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [...validation.errors],
    categoriesCreated: 0,
    familiesCreated: 0,
    brandsCreated: 0,
  };

  if (!validation.valid) return report;
  if (!apply) return report;

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    report.errors.push("DATABASE_URL no estÃ¡ configurado; no se puede persistir el inventario.");
    return report;
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  try {
    await db.transaction(async (tx) => {
      const categoryMap = new Map((await tx.select({ id: categories.id, slug: categories.slug }).from(categories)).map((row) => [row.slug, row.id]));
      const familyMap = new Map((await tx.select({ id: families.id, slug: families.slug }).from(families)).map((row) => [row.slug, row.id]));
      const brandMap = new Map((await tx.select({ id: brands.id, slug: brands.slug }).from(brands)).map((row) => [row.slug, row.id]));
      const existingProductRows = await tx.select({ sku: products.sku, slug: products.slug }).from(products);
      const existingSkus = new Set(existingProductRows.map((row) => row.sku));
      const plannedSlugs = planProductSlugs(rows, new Map(existingProductRows.map((row) => [row.sku, row.slug])));

      for (const row of rows) {
        const categoryName = required(row, "categoria");
        const familyName = required(row, "familia");
        const categorySlug = slugPart(categoryName);
        const familySlug = `${categorySlug}-${slugPart(familyName)}`;
        const brandName = text(row.marca);
        const sku = required(row, "sku");

        let categoryId = categoryMap.get(categorySlug);
        if (!categoryId) {
          categoryId = `category-${categorySlug}`;
          await tx.insert(categories).values({ id: categoryId, name: categoryName, slug: categorySlug }).onConflictDoNothing();
          categoryMap.set(categorySlug, categoryId);
          report.categoriesCreated += 1;
        }

        let familyId = familyMap.get(familySlug);
        if (!familyId) {
          familyId = `family-${familySlug}`;
          await tx.insert(families).values({ id: familyId, categoryId, name: familyName, slug: familySlug }).onConflictDoNothing();
          familyMap.set(familySlug, familyId);
          report.familiesCreated += 1;
        }

        let brandId: string | null = null;
        if (brandName) {
          const brandSlug = slugPart(brandName);
          brandId = brandMap.get(brandSlug) ?? `brand-${brandSlug}`;
          if (!brandMap.has(brandSlug)) {
            await tx.insert(brands).values({ id: brandId, name: brandName, slug: brandSlug }).onConflictDoNothing();
            brandMap.set(brandSlug, brandId);
            report.brandsCreated += 1;
          }
        }

        const slug = plannedSlugs.get(sku);
        if (!slug) throw new Error(`No se pudo planificar un slug estable para el SKU ${sku}.`);
        const product = mapSourceRow(row, { categoryId, familyId, brandId, slug });
        const updates = toProductUpdateValues(product);

        await tx.insert(products).values(product).onConflictDoUpdate({
          target: products.sku,
          set: updates,
        });

        if (existingSkus.has(product.sku)) report.updated += 1;
        else {
          report.inserted += 1;
          existingSkus.add(product.sku);
        }
      }
    });
  } finally {
    await pool.end();
  }

  return report;
}

export const DEFAULT_INVENTORY_WORKBOOK_PATH = "../INVENTARIO CATALOGO/ColdPower_Inventario_Final_Validado.xlsx";

export function resolveInventoryWorkbookPath(workbookPath: string | null, workingDirectory = process.cwd()) {
  return path.resolve(workingDirectory, workbookPath ?? DEFAULT_INVENTORY_WORKBOOK_PATH);
}

export function parseImportOptions(args: string[]) {
  const workbookPath = args.find((argument) => argument !== "--apply" && argument !== "--") ?? null;
  return { apply: args.includes("--apply"), workbookPath };
}

async function main() {
  const options = parseImportOptions(process.argv.slice(2));
  const workbookPath = resolveInventoryWorkbookPath(options.workbookPath);
  const report = await importInventory(workbookPath, options.apply);
  const reportPath = path.resolve(process.cwd(), "tmp/inventory-import-latest.json");
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify({ workbookPath, ...report }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ workbookPath, ...report }, null, 2));

  if (report.errors.length > 0) process.exitCode = 1;
}

function required(row: SourceRow, field: string) {
  const value = text(row[field]);
  if (!value) throw new Error(`Campo obligatorio vacÃ­o: ${field}`);
  return value;
}

function text(value: SourceRow[string]) {
  if (value === null || value === undefined || typeof value === "boolean") return null;
  const cleaned = String(value).trim();
  return cleaned.length > 0 ? cleaned : null;
}

function booleanOrNull(value: SourceRow[string]) {
  return typeof value === "boolean" ? value : null;
}

function integerOrNull(value: SourceRow[string]) {
  const parsed = Number.parseInt(text(value) ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function slugPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}


