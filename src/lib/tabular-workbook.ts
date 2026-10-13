import * as XLSX from "xlsx";

export type WorkbookValue = string | number | boolean | Date | null | undefined;

/** Keep strings as text (including identifiers and formula-looking input). */
export function tabularWorkbook(name: string, headers: string[], rows: WorkbookValue[][]): Uint8Array {
  if (!headers.length || rows.some((row) => row.length !== headers.length)) {
    throw new Error("WORKBOOK_INVALID_COLUMNS");
  }
  const values = rows.map((row) => row.map((value) => {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error("WORKBOOK_INVALID_NUMBER");
    return value ?? "";
  }));
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...values]);
  sheet["!cols"] = headers.map((header, index) => ({ wch: Math.min(44, Math.max(16, header.length + 2, ...values.slice(0, 100).map((row) => String(row[index]).length))) }));
  sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: headers.length - 1 } }) };
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, name);
  return new Uint8Array(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
}
