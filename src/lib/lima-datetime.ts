const LIMA_OFFSET = "-05:00";
const DAY_MS = 86_400_000;

export function startOfLimaDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(Number.NaN);
  return new Date(`${value}T00:00:00${LIMA_OFFSET}`);
}

export function startOfNextLimaDay(value: string) {
  return new Date(startOfLimaDay(value).getTime() + DAY_MS);
}

export function formatLimaDateTimeLocal(value: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function parseLimaDateTimeLocal(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return new Date(Number.NaN);
  return new Date(`${value}:00${LIMA_OFFSET}`);
}
