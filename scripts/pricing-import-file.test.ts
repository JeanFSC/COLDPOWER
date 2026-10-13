import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { readPricingImportRows } from "../src/lib/pricing-import-file";

test("CSV UTF-8 con y sin BOM conserva tildes, SKU y fechas ISO", () => {
  for (const bom of ["", "\uFEFF"]) {
    const rows = readPricingImportRows(new TextEncoder().encode(`${bom}SKU,Especial,Válido desde,Válido hasta\n00123,24.00,2029-01-01,2030-01-01\n`).buffer);
    assert.deepEqual(rows, [{ SKU: "00123", Especial: "24.00", "Válido desde": "2029-01-01", "Válido hasta": "2030-01-01" }]);
  }
});

test("Excel 1904 conserva fecha y hora; CSV conserva importes decimales entre comillas", () => {
  const sheet = XLSX.utils.aoa_to_sheet([["SKU", "Válido desde"], ["QA", 45657.5]]);
  sheet.B2.z = "yyyy-mm-dd hh:mm:ss";
  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { WBProps: { date1904: true } };
  XLSX.utils.book_append_sheet(workbook, sheet, "Precios");
  const bytes: Buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  assert.deepEqual(readPricingImportRows(Uint8Array.from(bytes).buffer), [{ SKU: "QA", "Válido desde": "2029-01-01T12:00:00" }]);
  assert.deepEqual(readPricingImportRows(new TextEncoder().encode('SKU,Especial\nQA,"24,50"\n').buffer), [{ SKU: "QA", Especial: "24,50" }]);
});

test("XLSX y XLS conservan fechas nativas sin abreviar año ni desplazar el día", () => {
  for (const bookType of ["xlsx", "xls"] as const) {
    const sheet = XLSX.utils.aoa_to_sheet([["SKU", "Especial", "Válido desde"], ["00123", 24, 47119]]);
    sheet.C2.z = "yyyy-mm-dd";
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Precios");
    const bytes: Buffer = XLSX.write(workbook, { type: "buffer", bookType });
    const rows = readPricingImportRows(Uint8Array.from(bytes).buffer);
    assert.deepEqual(rows, [{ SKU: "00123", Especial: 24, "Válido desde": "2029-01-01T00:00:00" }]);
  }
});
