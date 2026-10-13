export type StockCatalogRow = { sku: string; productId: string };
export type StockSourceRow = { sku?: unknown; locationCode?: unknown; quantity?: unknown; [key: string]: unknown };
export type StockImportRow = { sku: string; productId: string; locationCode: string; quantity: number };
export type StockImportReport = { canApply: boolean; matched: number; unmatched: number; ambiguous: number; rows: StockImportRow[]; errors: string[] };

function stringValue(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

export function planStockImport(sourceRows: StockSourceRow[], catalog: StockCatalogRow[]): StockImportReport {
  const errors: string[] = [];
  const rows: StockImportRow[] = [];
  const bySku = new Map(catalog.map((row) => [row.sku, row]));
  const seen = new Set<string>();
  let unmatched = 0;
  let ambiguous = 0;
  for (const [index, source] of sourceRows.entries()) {
    const sku = stringValue(source.sku);
    const locationCode = stringValue(source.locationCode);
    const quantity = typeof source.quantity === "number" || typeof source.quantity === "string"
      ? Number(source.quantity)
      : Number.NaN;
    if (!sku || !locationCode || !Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 2_147_483_647) {
      errors.push(`Fila ${index + 1}: SKU exacto, ubicación y cantidad positiva son obligatorios.`);
      continue;
    }
    const matches = catalog.filter((row) => row.sku === sku);
    if (matches.length > 1) {
      ambiguous += 1;
      errors.push(`Fila ${index + 1}: SKU ambiguo ${sku}.`);
      continue;
    }
    const product = bySku.get(sku);
    if (!product) {
      unmatched += 1;
      errors.push(`Fila ${index + 1}: SKU no encontrado ${sku}.`);
      continue;
    }
    const key = `${sku}|${locationCode}`;
    if (seen.has(key)) {
      ambiguous += 1;
      errors.push(`Fila ${index + 1}: SKU y ubicación repetidos ${key}.`);
      continue;
    }
    seen.add(key);
    rows.push({ sku, productId: product.productId, locationCode, quantity });
  }
  if (sourceRows.length === 0) errors.push("El archivo no contiene filas.");
  const hasRequiredColumns = sourceRows.some((row) => "quantity" in row && "locationCode" in row);
  if (!hasRequiredColumns) errors.push("El archivo no contiene columnas verificables de cantidad y ubicación.");
  return { canApply: errors.length === 0 && rows.length === sourceRows.length, matched: rows.length, unmatched, ambiguous, rows, errors };
}
