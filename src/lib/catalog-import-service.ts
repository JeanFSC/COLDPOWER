import * as XLSX from "xlsx";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, brands, categories, families, products } from "@/db/schema";
import type { CatalogActor } from "@/lib/catalog-product-service";

type SourceRow = Record<string, unknown>;
type ImportResult = "new" | "existing" | "warning" | "error";

export type CatalogImportPreviewRow = {
  rowNumber: number;
  sku: string;
  name: string;
  category: string;
  family: string;
  brand: string;
  result: ImportResult;
  message: string;
  unmappedColumns: string[];
};

export type CatalogImportPreview = {
  filename: string;
  totalRows: number;
  newRows: number;
  existingRows: number;
  warningRows: number;
  errorRows: number;
  columns: string[];
  unmappedColumns: string[];
  rows: CatalogImportPreviewRow[];
};

const aliases = {
  sku: ["sku", "codigo", "codigo sku", "codigo de producto", "código", "código sku"],
  name: ["nombre", "nombre comercial", "nombre normalizado", "nombre original", "commercial name", "commercial_name", "normalized_name", "original_name"],
  category: ["categoria", "categoría", "category"],
  family: ["familia", "family"],
  brand: ["marca", "brand"],
  productType: ["tipo", "tipo de producto", "tipo producto", "product type", "product_type"],
  description: ["descripcion", "descripción", "descripcion editorial", "editorial_description"],
  sourceStatus: ["estado fuente", "estado origen", "source status", "source_status", "status"],
  originalReferenceCode: ["referencia original", "codigo referencia original", "original reference code", "original_reference_code"],
  modelCode: ["modelo", "codigo modelo", "model code", "model_code"],
  application: ["aplicacion", "aplicación", "application"],
  compatibilityBrands: ["marcas compatibles", "compatibility brands", "compatibility_brands"],
  voltage: ["voltaje", "voltage"],
  power: ["potencia", "power"],
  frequency: ["frecuencia", "frequency"],
  rpm: ["rpm"],
  amperage: ["amperaje", "amperage"],
  capacitance: ["capacitancia", "capacitance"],
  refrigerant: ["refrigerante", "refrigerant"],
  horsepower: ["caballos de fuerza", "horsepower"],
  temperature: ["temperatura", "temperature"],
  dimensions: ["dimensiones", "dimensions"],
  length: ["largo", "longitud", "length"],
  connectionSize: ["tamano conexion", "tamaño conexión", "connection size", "connection_size"],
  unitOfMeasure: ["unidad", "unidad de medida", "unit", "unit_of_measure"],
  normalizationConfidence: ["confianza", "normalization confidence", "normalization_confidence"],
  sourcePage: ["pagina fuente", "página fuente", "source page", "source_page"],
} as const;

const normalizedAliases = Object.fromEntries(Object.entries(aliases).flatMap(([field, values]) => values.map((value) => [normalizeHeader(value), field])));
const supportedHeaders = new Set(Object.values(normalizedAliases));

function normalizeHeader(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[\s./-]+/g, "_");
}

function text(value: unknown) { return value == null ? "" : String(value).trim(); }
function rowValue(row: SourceRow, field: keyof typeof aliases) {
  for (const [header, value] of Object.entries(row)) if (normalizedAliases[normalizeHeader(header)] === field && text(value)) return text(value);
  return "";
}
function splitArray(value: string) { return value.split(/[,;|]/).map((item) => item.trim()).filter(Boolean); }
function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180); }

function parseFile(data: ArrayBuffer) {
  const workbook = XLSX.read(Buffer.from(data), { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("CATALOG_IMPORT_EMPTY");
  return XLSX.utils.sheet_to_json<SourceRow>(sheet, { defval: null, raw: false });
}

async function lookup() {
  const db = getDb();
  const [existing, categoryRows, familyRows, brandRows] = await Promise.all([
    db.select({ id: products.id, sku: products.sku, normalizedName: products.normalizedName }).from(products),
    db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.active, true)),
    db.select({ id: families.id, categoryId: families.categoryId, name: families.name }).from(families).where(eq(families.active, true)),
    db.select({ id: brands.id, name: brands.name }).from(brands).where(eq(brands.active, true)),
  ]);
  return {
    existingBySku: new Map(existing.map((row) => [row.sku.toLowerCase(), row])),
    categories: new Map(categoryRows.map((row) => [row.name.toLowerCase(), row])),
    families: new Map(familyRows.map((row) => [`${row.categoryId}:${row.name.toLowerCase()}`, row])),
    brands: new Map(brandRows.map((row) => [row.name.toLowerCase(), row])),
  };
}

function inspectRow(row: SourceRow, rowNumber: number, data: Awaited<ReturnType<typeof lookup>>, knownColumns: Set<string>): CatalogImportPreviewRow {
  const sku = rowValue(row, "sku");
  const name = rowValue(row, "name");
  const category = rowValue(row, "category");
  const family = rowValue(row, "family");
  const brand = rowValue(row, "brand");
  const unmappedColumns = Object.keys(row).filter((key) => !knownColumns.has(normalizeHeader(key)));
  if (!sku || !name || !category || !family) return { rowNumber, sku, name, category, family, brand, result: "error", message: "Faltan SKU, nombre, categoría o familia.", unmappedColumns };
  if (data.existingBySku.has(sku.toLowerCase())) return { rowNumber, sku, name, category, family, brand, result: "existing", message: "El SKU ya existe; no se sobrescribirá.", unmappedColumns };
  const categoryRow = data.categories.get(category.toLowerCase());
  if (!categoryRow) return { rowNumber, sku, name, category, family, brand, result: "error", message: "La categoría no existe o está inactiva.", unmappedColumns };
  if (!data.families.has(`${categoryRow.id}:${family.toLowerCase()}`)) return { rowNumber, sku, name, category, family, brand, result: "error", message: "La familia no existe para la categoría elegida.", unmappedColumns };
  if (brand && !data.brands.has(brand.toLowerCase())) return { rowNumber, sku, name, category, family, brand, result: "error", message: "La marca no existe o está inactiva.", unmappedColumns };
  if (unmappedColumns.length) return { rowNumber, sku, name, category, family, brand, result: "warning", message: `Columnas no mapeadas: ${unmappedColumns.join(", ")}.`, unmappedColumns };
  return { rowNumber, sku, name, category, family, brand, result: "new", message: "Lista para crear como producto en revisión.", unmappedColumns };
}

export async function previewCatalogImport(data: ArrayBuffer, filename: string): Promise<CatalogImportPreview> {
  const sourceRows = parseFile(data);
  if (!sourceRows.length) throw new Error("CATALOG_IMPORT_EMPTY");
  const columns = [...new Set(sourceRows.flatMap((row) => Object.keys(row)))];
  const knownColumns = new Set(columns.map(normalizeHeader).filter((column) => supportedHeaders.has(normalizedAliases[column] ?? "")));
  const dataLookup = await lookup();
  const rows = sourceRows.map((row, index) => inspectRow(row, index + 2, dataLookup, knownColumns));
  return { filename, totalRows: rows.length, newRows: rows.filter((row) => row.result === "new").length, existingRows: rows.filter((row) => row.result === "existing").length, warningRows: rows.filter((row) => row.result === "warning").length, errorRows: rows.filter((row) => row.result === "error").length, columns, unmappedColumns: [...new Set(rows.flatMap((row) => row.unmappedColumns))], rows: rows.slice(0, 100) };
}

export async function commitCatalogImport(data: ArrayBuffer, filename: string, actor: CatalogActor) {
  const sourceRows = parseFile(data);
  const dataLookup = await lookup();
  const knownColumns = new Set(sourceRows.flatMap((row) => Object.keys(row)).map(normalizeHeader).filter((column) => supportedHeaders.has(normalizedAliases[column] ?? "")));
  const inspected = sourceRows.map((row, index) => inspectRow(row, index + 2, dataLookup, knownColumns));
  const invalid = inspected.filter((row) => row.result === "error" || row.result === "warning");
  if (invalid.length) throw new Error(`CATALOG_IMPORT_INVALID:${invalid.length}`);
  const db = getDb();
  return db.transaction(async (tx) => {
    let created = 0;
    for (const [index, row] of sourceRows.entries()) {
      const inspectedRow = inspected[index];
      if (inspectedRow.result !== "new") continue;
      const category = dataLookup.categories.get(inspectedRow.category.toLowerCase());
      const family = category && dataLookup.families.get(`${category.id}:${inspectedRow.family.toLowerCase()}`);
      const brand = inspectedRow.brand ? dataLookup.brands.get(inspectedRow.brand.toLowerCase()) : undefined;
      if (!category || !family) throw new Error("CATALOG_IMPORT_TAXONOMY_CHANGED");
      const productId = `product-${crypto.randomUUID()}`;
      const now = new Date();
      const sourceStatus = rowValue(row, "sourceStatus") || "IMPORTED";
      const createdProduct = await tx.insert(products).values({
        id: productId,
        sku: inspectedRow.sku,
        slug: `${slugify(inspectedRow.name)}-${slugify(inspectedRow.sku)}`,
        originalName: rowValue(row, "name"),
        normalizedName: rowValue(row, "name"),
        commercialName: rowValue(row, "name") || null,
        featured: false,
        productType: rowValue(row, "productType") || "Producto importado",
        categoryId: category.id,
        familyId: family.id,
        brandId: brand?.id ?? null,
        compatibilityBrands: rowValue(row, "compatibilityBrands") ? splitArray(rowValue(row, "compatibilityBrands")) : null,
        modelCode: rowValue(row, "modelCode") || null,
        application: rowValue(row, "application") || null,
        voltage: rowValue(row, "voltage") || null,
        power: rowValue(row, "power") || null,
        frequency: rowValue(row, "frequency") || null,
        rpm: rowValue(row, "rpm") || null,
        amperage: rowValue(row, "amperage") || null,
        capacitance: rowValue(row, "capacitance") || null,
        refrigerant: rowValue(row, "refrigerant") || null,
        horsepower: rowValue(row, "horsepower") || null,
        temperature: rowValue(row, "temperature") || null,
        dimensions: rowValue(row, "dimensions") || null,
        length: rowValue(row, "length") || null,
        connectionSize: rowValue(row, "connectionSize") || null,
        unitOfMeasure: rowValue(row, "unitOfMeasure") || null,
        editorialDescription: rowValue(row, "description") || null,
        status: sourceStatus,
        publicationStatus: "review",
        availabilityStatus: "unknown",
        requiresReview: true,
        reviewReason: "Importación pendiente de revisión editorial",
        possibleDuplicate: false,
        duplicateDecision: "pending",
        canonicalProductId: null,
        normalizationConfidence: rowValue(row, "normalizationConfidence") || null,
        sourcePage: Number(rowValue(row, "sourcePage")) || null,
        sourceRow: inspectedRow.rowNumber,
        createdAt: now,
        updatedAt: now,
        publicationChangedBy: null,
        publicationChangedAt: null,
        publicationNote: `Importado desde ${filename} por ${actor.userId}`,
      }).returning({ id: products.id, sku: products.sku });
      await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "PRODUCT_IMPORTED", entityType: "product", entityId: createdProduct[0].id, before: null, after: { sku: createdProduct[0].sku, publicationStatus: "review", sourceRow: inspectedRow.rowNumber }, metadata: { filename, rowNumber: inspectedRow.rowNumber } });
      created += 1;
    }
    await tx.insert(auditLogs).values({ id: `audit-${crypto.randomUUID()}`, actorId: actor.userId, actorRole: actor.role, action: "CATALOG_IMPORT_COMMITTED", entityType: "catalog", entityId: "catalog", before: null, after: { filename, totalRows: sourceRows.length, created }, metadata: { created } });
    return { filename, created, skipped: inspected.filter((row) => row.result === "existing").length };
  });
}
