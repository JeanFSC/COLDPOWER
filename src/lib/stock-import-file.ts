import * as XLSX from "xlsx";
import type { StockSourceRow } from "@/lib/stock-import";

export function readStockImportRows(data: ArrayBuffer): StockSourceRow[] {
  if (!data.byteLength || data.byteLength > 5 * 1024 * 1024) throw new Error("El archivo debe tener contenido y no superar 5 MB.");
  const bytes = Buffer.from(data);
  const binary = (bytes[0] === 0x50 && bytes[1] === 0x4b) || (bytes[0] === 0xd0 && bytes[1] === 0xcf);
  const workbook = binary ? XLSX.read(bytes, { type: "buffer" }) : XLSX.read(new TextDecoder("utf-8", { fatal: true }).decode(bytes), { type: "string", raw: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("El archivo no contiene hojas.");
  if (sheet["!ref"]) {
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    if (range.e.r > 1000 || range.e.c > 100) throw new Error("La hoja supera 1000 filas de datos o 101 columnas.");
  }
  if (Object.values(sheet).some(cell => typeof cell === "object" && cell && "f" in cell)) throw new Error("No se admiten fórmulas; utiliza valores de SKU, local y cantidad.");
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true });
  const headers = (matrix[0] ?? []).map(value => String(value ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  const aliases = { sku: ["sku", "codigo", "codigo_sku", "codigo producto"], locationCode: ["locationcode", "ubicacion", "almacen", "codigo_ubicacion", "location", "local"], quantity: ["quantity", "cantidad", "stock", "existencias", "on_hand"] };
  const indexes = Object.fromEntries(Object.entries(aliases).map(([field, names]) => {
    const matches = headers.flatMap((header, index) => names.includes(header) ? [index] : []);
    if (matches.length !== 1) throw new Error(`Debe existir una sola columna ${field}.`);
    return [field, matches[0]];
  })) as Record<keyof typeof aliases, number>;
  const rows = matrix.slice(1).filter(row => row.some(value => String(value ?? "").trim()));
  if (!rows.length || rows.length > 1000) throw new Error("El archivo debe contener entre 1 y 1000 filas.");
  return rows.map(row => ({ sku: String(row[indexes.sku] ?? "").trim(), locationCode: String(row[indexes.locationCode] ?? "").trim(), quantity: row[indexes.quantity] }));
}
