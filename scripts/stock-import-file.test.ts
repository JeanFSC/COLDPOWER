import { strict as assert } from "node:assert";
import test from "node:test";
import * as XLSX from "xlsx";
import { readStockImportRows } from "../src/lib/stock-import-file";
import { planStockImport } from "../src/lib/stock-import";
const bytes = (text: string) => new TextEncoder().encode(text).buffer;
const workbookBytes = (sheet: XLSX.WorkSheet, bookType: "xlsx" | "xls" = "xlsx") => {
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Stock");
  const result = XLSX.write(book,{type:"buffer",bookType}) as Buffer;
  return result.buffer.slice(result.byteOffset,result.byteOffset+result.byteLength) as ArrayBuffer;
};
test("binary XLS preserves textual SKU and numeric quantity", () => {
  const sheet = XLSX.utils.aoa_to_sheet([["sku", "local", "cantidad"], ["001", "CP-CHI-DEV", 2]]);
  assert.deepEqual(readStockImportRows(workbookBytes(sheet, "xls")), [{ sku: "001", locationCode: "CP-CHI-DEV", quantity: 2 }]);
});

test("multiple-sheet workbooks import only the announced first sheet", () => {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["sku", "local", "cantidad"], ["FIRST", "CP", 1]]), "Primera");
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["sku", "local", "cantidad"], ["SECOND", "CP", 99]]), "Segunda");
  for (const bookType of ["xlsx", "xls"] as const) {
    const buffer = XLSX.write(book, { type: "buffer", bookType }) as Buffer;
    assert.deepEqual(readStockImportRows(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer), [{ sku: "FIRST", locationCode: "CP", quantity: 1 }]);
  }
});
test("binary XLSX preserves textual SKU and rejects formulas",()=>{
  const sheet = XLSX.utils.aoa_to_sheet([["sku","local","cantidad"],["001","CP",2]]);
  assert.deepEqual(readStockImportRows(workbookBytes(sheet)),[{sku:"001",locationCode:"CP",quantity:2}]);
  sheet.C2 = { t:"n",v:2,f:"1+1" };
  assert.throws(()=>readStockImportRows(workbookBytes(sheet)),/fórmulas/);
});

test("an Excel boolean quantity cannot create one stock unit", () => {
  const sheet = XLSX.utils.aoa_to_sheet([["sku", "local", "cantidad"], ["QA-BOOL", "CP", true]]);
  const rows = readStockImportRows(workbookBytes(sheet));
  assert.equal(rows[0].quantity, true);
  assert.equal(planStockImport(rows, [{ sku: "QA-BOOL", productId: "qa-bool" }]).canApply, false);
});
test("stock import preserves exact SKUs and accented local headers",()=>{
  assert.deepEqual(readStockImportRows(bytes("SKU,Ubicación,Cantidad\nQA-001,CP-CUS-DEV,2\n")),[{sku:"QA-001",locationCode:"CP-CUS-DEV",quantity:"2"}]);
});
test("stock import rejects missing or duplicate mapped columns",()=>{
  assert.throws(()=>readStockImportRows(bytes("sku,cantidad\nQA,2")));
  assert.throws(()=>readStockImportRows(bytes("sku,local,ubicacion,cantidad\nQA,CP,CP,2")));
});
test("stock import rejects empty input and excessive rows",()=>{
  assert.throws(()=>readStockImportRows(bytes("sku,local,cantidad\n")));
  assert.throws(()=>readStockImportRows(bytes("sku,local,cantidad\n"+Array.from({length:1001},(_,i)=>`QA-${i},CP,1`).join("\n"))));
});
