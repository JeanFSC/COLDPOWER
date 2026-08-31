import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { getDb } from "../src/db";
import { inventoryImportBatches, products } from "../src/db/schema";
import { planStockImport, type StockSourceRow } from "../src/lib/stock-import";

function option(name: string) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
function readRows(filename: string): StockSourceRow[] {
  const workbook = XLSX.readFile(filename, { raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("El archivo no contiene hojas.");
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }) as unknown[][];
  const headers = (matrix[0] ?? []).map((header) => String(header ?? "").trim().toLowerCase());
  const aliases = { sku: ["sku", "codigo", "codigo_sku", "codigo producto"], locationCode: ["locationcode", "ubicacion", "almacen", "codigo_ubicacion", "location"], quantity: ["quantity", "cantidad", "stock", "existencias", "on_hand"] };
  const key = (names: string[]) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
  const indexes = { sku: key(aliases.sku), locationCode: key(aliases.locationCode), quantity: key(aliases.quantity) };
  return matrix.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim())).map((row) => ({ sku: indexes.sku >= 0 ? row[indexes.sku] : undefined, locationCode: indexes.locationCode >= 0 ? row[indexes.locationCode] : undefined, quantity: indexes.quantity >= 0 ? row[indexes.quantity] : undefined }));
}

async function main() {
  const filename = option("--file"); const apply = process.argv.includes("--apply");
  if (!filename) throw new Error("Uso: pnpm import:stock -- --file archivo.xlsx --dry-run|--apply");
  if (!fs.existsSync(path.resolve(filename))) throw new Error(`No existe el archivo: ${filename}`);
  const rows = readRows(path.resolve(filename)); const db = getDb(); const catalog = await db.select({ sku: products.sku, productId: products.id }).from(products); const report = planStockImport(rows, catalog);
  const batch = { id: `stock-import-${crypto.randomUUID()}`, source: "ACSOFT_INITIAL_IMPORT", status: apply && report.canApply ? "READY_FOR_TRANSACTION" : "DRY_RUN", filename: path.basename(filename), rowsRead: rows.length, matched: report.matched, unmatched: report.unmatched, ambiguous: report.ambiguous, quantities: report.rows.length, locations: new Set(report.rows.map((row) => row.locationCode)).size, errors: report.errors };
  if (apply && !report.canApply) batch.status = "REJECTED_NO_APPLY";
  await db.insert(inventoryImportBatches).values(batch);
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...report, batchId: batch.id, applied: false, note: apply && report.canApply ? "La aplicación transaccional requiere validar ubicaciones y permisos; no se modificó stock en este paso." : undefined }, null, 2));
}
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
