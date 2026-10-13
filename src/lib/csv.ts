/** Neutralize spreadsheet expressions while preserving finite decimal values. */
export function csvText(value: unknown) {
  const raw = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
  if (decimal.test(raw) && Number.isFinite(Number(raw))) return raw;
  // Spreadsheet importers may discard whitespace before interpreting a formula.
  return /^[\s\uFEFF]*[=+\-@]/u.test(raw) || /^[\t\r\n]/.test(raw) ? `'${raw}` : raw;
}

export function csvCell(value: unknown) {
  return `"${csvText(value).replaceAll('"', '""')}"`;
}
