import * as XLSX from "xlsx";

/** Preserve CSV text and Excel date values instead of locale formatted strings. */
export function readPricingImportRows(data: ArrayBuffer): Record<string, unknown>[] {
  const bytes = Buffer.from(data);
  const binaryWorkbook = (bytes[0] === 0x50 && bytes[1] === 0x4b) || (bytes[0] === 0xd0 && bytes[1] === 0xcf);
  const workbook = binaryWorkbook
    ? XLSX.read(bytes, { type: "buffer", cellDates: false, cellNF: true })
    : XLSX.read(new TextDecoder("utf-8", { fatal: true }).decode(bytes), { type: "string", raw: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("PRICING_IMPORT_EMPTY");
  for (const [address, cell] of Object.entries(sheet)) {
    if (address.startsWith("!") || cell.t !== "n" || !cell.z || !XLSX.SSF.is_date(cell.z)) continue;
    const date = XLSX.SSF.parse_date_code(cell.v, { date1904: workbook.Workbook?.WBProps?.date1904 });
    if (!date) throw new Error("La fecha de vigencia no es válida.");
    const pad = (value: number) => String(value).padStart(2, "0");
    cell.t = "s";
    cell.v = `${String(date.y).padStart(4, "0")}-${pad(date.m)}-${pad(date.d)}T${pad(date.H)}:${pad(date.M)}:${pad(date.S)}`;
  }
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true }).map(row =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value instanceof Date ? value.toISOString().slice(0, 19) : value])));
}
