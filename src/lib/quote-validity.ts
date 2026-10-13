/** A date-only quote validity covers the complete business day in Peru. */
export function parseQuoteValidity(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error("La fecha de vigencia no es válida.");
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const day = new Date(`${raw}T12:00:00Z`);
    if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== raw) throw new Error("La fecha de vigencia no es válida.");
    return new Date(`${raw}T23:59:59.999-05:00`);
  }
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(raw)) throw new Error("La vigencia debe incluir una fecha o una zona horaria explícita.");
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) throw new Error("La fecha de vigencia no es válida.");
  return date;
}

export function quoteValidityDateInput(value: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
