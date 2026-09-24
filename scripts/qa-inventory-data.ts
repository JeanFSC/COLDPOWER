import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { createDbClient } from "../src/db";
import { brands, categories, families, products } from "../src/db/schema";
import { planProductSlugs, readImportRows, validateImportRows } from "./inventory-import.mjs";
import { resolveInventoryWorkbookPath } from "./import-inventory";

export const EXPECTED_SOURCE_PRODUCT_COUNT = 1348;
const MISMATCH_SAMPLE_LIMIT = 50;

type SourceFieldValue = string | boolean | null;
export type InventorySourceRow = Record<string, SourceFieldValue>;

export type StoredInventoryRow = {
  id: string;
  sku: string;
  slug: string;
  originalName: string;
  normalizedName: string;
  productType: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  familyId: string;
  familyCategoryId: string;
  familyName: string;
  familySlug: string;
  brandId: string | null;
  brandName: string | null;
  brandSlug: string | null;
  compatibilityBrands: string[] | null;
  modelCode: string | null;
  application: string | null;
  voltage: string | null;
  power: string | null;
  frequency: string | null;
  rpm: string | null;
  amperage: string | null;
  capacitance: string | null;
  refrigerant: string | null;
  horsepower: string | null;
  temperature: string | null;
  dimensions: string | null;
  length: string | null;
  connectionSize: string | null;
  unitOfMeasure: string | null;
  status: string;
  taxType: string | null;
  originalReferenceCode: string | null;
  barcode: string | null;
  originalWeight: string | null;
  requiresReview: boolean | null;
  reviewReason: string | null;
  possibleDuplicate: boolean | null;
  duplicateGroup: string | null;
  normalizationConfidence: string | null;
  normalizationMethod: string | null;
  sourcePage: number | null;
  sourceRow: number | null;
};

export type InventoryFieldMismatch = {
  sku: string;
  field: keyof StoredInventoryRow;
  expected: unknown;
  actual: unknown;
};

export type InventoryDataIntegrityReport = {
  expectedProductCount: number;
  sourceProducts: number;
  storedProducts: number;
  missingSkus: string[];
  unexpectedSkus: string[];
  duplicateStoredSkus: string[];
  mismatchCount: number;
  mismatchSamples: InventoryFieldMismatch[];
  passed: boolean;
  errors: string[];
};

const COMPARISON_FIELDS = [
  "id",
  "sku",
  "slug",
  "originalName",
  "normalizedName",
  "productType",
  "categoryId",
  "categoryName",
  "categorySlug",
  "familyId",
  "familyCategoryId",
  "familyName",
  "familySlug",
  "brandId",
  "brandName",
  "brandSlug",
  "compatibilityBrands",
  "modelCode",
  "application",
  "voltage",
  "power",
  "frequency",
  "rpm",
  "amperage",
  "capacitance",
  "refrigerant",
  "horsepower",
  "temperature",
  "dimensions",
  "length",
  "connectionSize",
  "unitOfMeasure",
  "status",
  "taxType",
  "originalReferenceCode",
  "barcode",
  "originalWeight",
  "requiresReview",
  "reviewReason",
  "possibleDuplicate",
  "duplicateGroup",
  "normalizationConfidence",
  "normalizationMethod",
  "sourcePage",
  "sourceRow",
] as const satisfies readonly (keyof StoredInventoryRow)[];

export function evaluateInventoryDataIntegrity(
  sourceRows: InventorySourceRow[],
  storedRows: StoredInventoryRow[],
  expectedProductCount = EXPECTED_SOURCE_PRODUCT_COUNT,
): InventoryDataIntegrityReport {
  const errors = [...validateImportRows(sourceRows, expectedProductCount).errors];
  const plannedSlugs = planProductSlugs(sourceRows) as Map<string, string>;
  const expectedBySku = new Map<string, StoredInventoryRow>();

  for (const row of sourceRows) {
    const sku = text(row.sku);
    if (!sku) continue;

    try {
      expectedBySku.set(sku, expectedStoredRow(row, plannedSlugs));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`SKU ${sku}: ${message}`);
    }
  }

  const storedBySku = new Map<string, StoredInventoryRow>();
  const duplicateStoredSkus: string[] = [];
  for (const row of storedRows) {
    if (storedBySku.has(row.sku)) duplicateStoredSkus.push(row.sku);
    else storedBySku.set(row.sku, row);
  }

  const missingSkus = [...expectedBySku.keys()].filter((sku) => !storedBySku.has(sku)).sort(compareText);
  const unexpectedSkus = [...storedBySku.keys()].filter((sku) => !expectedBySku.has(sku)).sort(compareText);
  let mismatchCount = 0;
  const mismatchSamples: InventoryFieldMismatch[] = [];

  for (const [sku, expected] of expectedBySku) {
    const actual = storedBySku.get(sku);
    if (!actual) continue;

    for (const field of COMPARISON_FIELDS) {
      if (sameValue(expected[field], actual[field])) continue;
      mismatchCount += 1;
      if (mismatchSamples.length < MISMATCH_SAMPLE_LIMIT) {
        mismatchSamples.push({ sku, field, expected: expected[field], actual: actual[field] });
      }
    }
  }

  if (storedRows.length !== expectedProductCount) {
    errors.push(`Se esperaban ${expectedProductCount} productos persistidos y se encontraron ${storedRows.length}.`);
  }
  if (duplicateStoredSkus.length > 0) {
    errors.push(`Hay SKU duplicados en PostgreSQL: ${[...new Set(duplicateStoredSkus)].sort(compareText).join(", ")}.`);
  }
  if (missingSkus.length > 0) {
    errors.push(`Faltan ${missingSkus.length} SKU del Excel en PostgreSQL.`);
  }
  if (unexpectedSkus.length > 0) {
    errors.push(`Hay ${unexpectedSkus.length} SKU en PostgreSQL que no existen en el Excel.`);
  }
  if (mismatchCount > 0) {
    errors.push(`Se detectaron ${mismatchCount} diferencias de campo entre Excel y PostgreSQL.`);
  }

  return {
    expectedProductCount,
    sourceProducts: sourceRows.length,
    storedProducts: storedRows.length,
    missingSkus,
    unexpectedSkus,
    duplicateStoredSkus: [...new Set(duplicateStoredSkus)].sort(compareText),
    mismatchCount,
    mismatchSamples,
    passed: errors.length === 0,
    errors,
  };
}

export async function runInventoryDataIntegrity(
  workbookPath = resolveInventoryWorkbookPath(null),
  databaseUrl = process.env.DATABASE_URL?.trim(),
): Promise<InventoryDataIntegrityReport> {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL no estÃƒÂ¡ configurado; no se puede ejecutar el QA de integridad.");
  }

  const { rows } = readImportRows(workbookPath) as unknown as { rows: InventorySourceRow[] };
  const client = createDbClient({ databaseUrl });
  const db = client.db;

  try {
    const storedRows = await db
      .select({
        id: products.id,
        sku: products.sku,
        slug: products.slug,
        originalName: products.originalName,
        normalizedName: products.normalizedName,
        productType: products.productType,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        familyId: products.familyId,
        familyCategoryId: families.categoryId,
        familyName: families.name,
        familySlug: families.slug,
        brandId: products.brandId,
        brandName: brands.name,
        brandSlug: brands.slug,
        compatibilityBrands: products.compatibilityBrands,
        modelCode: products.modelCode,
        application: products.application,
        voltage: products.voltage,
        power: products.power,
        frequency: products.frequency,
        rpm: products.rpm,
        amperage: products.amperage,
        capacitance: products.capacitance,
        refrigerant: products.refrigerant,
        horsepower: products.horsepower,
        temperature: products.temperature,
        dimensions: products.dimensions,
        length: products.length,
        connectionSize: products.connectionSize,
        unitOfMeasure: products.unitOfMeasure,
        status: products.status,
        taxType: products.taxType,
        originalReferenceCode: products.originalReferenceCode,
        barcode: products.barcode,
        originalWeight: products.originalWeight,
        requiresReview: products.requiresReview,
        reviewReason: products.reviewReason,
        possibleDuplicate: products.possibleDuplicate,
        duplicateGroup: products.duplicateGroup,
        normalizationConfidence: products.normalizationConfidence,
        normalizationMethod: products.normalizationMethod,
        sourcePage: products.sourcePage,
        sourceRow: products.sourceRow,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .innerJoin(families, eq(products.familyId, families.id))
      .leftJoin(brands, eq(products.brandId, brands.id));

    return evaluateInventoryDataIntegrity(rows, storedRows, EXPECTED_SOURCE_PRODUCT_COUNT);
  } finally {
    await client.close();
  }
}

function expectedStoredRow(row: InventorySourceRow, plannedSlugs: Map<string, string>): StoredInventoryRow {
  const sku = required(row, "sku");
  const categoryName = required(row, "categoria");
  const familyName = required(row, "familia");
  const brandName = text(row.marca);
  const categorySlug = slugPart(categoryName);
  const familySlug = `${categorySlug}-${slugPart(familyName)}`;
  const brandSlug = brandName ? slugPart(brandName) : null;
  const slug = plannedSlugs.get(sku);

  if (!slug) throw new Error("No se pudo derivar el slug canÃƒÂ³nico.");

  return {
    id: `product-${slugPart(sku)}`,
    sku,
    slug,
    originalName: required(row, "nombre_original"),
    normalizedName: required(row, "nombre_normalizado"),
    productType: required(row, "producto"),
    categoryId: `category-${categorySlug}`,
    categoryName,
    categorySlug,
    familyId: `family-${familySlug}`,
    familyCategoryId: `category-${categorySlug}`,
    familyName,
    familySlug,
    brandId: brandSlug ? `brand-${brandSlug}` : null,
    brandName,
    brandSlug,
    compatibilityBrands: compatibilityBrands(text(row.compatibilidad_marcas)),
    modelCode: text(row.modelo_codigo),
    application: text(row.aplicacion),
    voltage: text(row.voltaje),
    power: text(row.potencia),
    frequency: text(row.frecuencia),
    rpm: text(row.rpm),
    amperage: text(row.amperaje),
    capacitance: text(row.capacitancia),
    refrigerant: text(row.refrigerante),
    horsepower: text(row.potencia_hp),
    temperature: text(row.temperatura),
    dimensions: text(row.medidas),
    length: text(row.longitud),
    connectionSize: text(row.conexion_medida),
    unitOfMeasure: text(row.unidad_medida),
    status: required(row, "estado"),
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
  };
}

function required(row: InventorySourceRow, field: string) {
  const value = text(row[field]);
  if (!value) throw new Error(`Campo obligatorio vacÃƒÂ­o: ${field}.`);
  return value;
}

function text(value: SourceFieldValue | undefined) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function booleanOrNull(value: SourceFieldValue | undefined) {
  return typeof value === "boolean" ? value : null;
}

function integerOrNull(value: SourceFieldValue | undefined) {
  const parsed = Number.parseInt(text(value) ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function compatibilityBrands(value: string | null) {
  if (!value) return null;
  const values = [...new Set(value.split(/[;,|]/).map((item) => item.trim()).filter(Boolean))];
  return values.length > 0 ? values : null;
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

function sameValue(expected: unknown, actual: unknown) {
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual) || expected.length !== actual.length) return false;
    return expected.every((value, index) => value === actual[index]);
  }
  return expected === actual;
}

function compareText(left: string, right: string) {
  return left.localeCompare(right);
}

async function main() {
  const workbookArgument = process.argv.slice(2).find((argument) => argument !== "--") ?? null;
  const workbookPath = resolveInventoryWorkbookPath(workbookArgument);
  const report = await runInventoryDataIntegrity(workbookPath);
  const reportPath = path.resolve(process.cwd(), "tmp/inventory-data-integrity-latest.json");
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




