const DAY_MS = 86_400_000;

export const PROMOTION_CALENDAR_TIME_ZONE = "America/Lima";

export type PromotionCalendarScale = {
  from: string;
  to: string;
  totalDays: number;
};

function dateKeyParts(value: Date | string | number) {
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00Z`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PROMOTION_CALENDAR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year && values.month && values.day ? values : null;
}

export function promotionCalendarDateKey(value: Date | string | number) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = dateKeyParts(value);
  if (!parts) return "";
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function serialFromDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function dateKeyFromSerial(value: number) {
  return new Date(value * DAY_MS).toISOString().slice(0, 10);
}

export function addPromotionCalendarDays(dateKey: string, days: number) {
  return dateKeyFromSerial(serialFromDateKey(dateKey) + days);
}

export function promotionCalendarDaysInclusive(from: string, to: string) {
  return Math.max(1, serialFromDateKey(to) - serialFromDateKey(from) + 1);
}

export function differencePromotionCalendarDays(from: string, to: string) {
  return serialFromDateKey(to) - serialFromDateKey(from);
}

export function createPromotionCalendarScale(today: Date | string | number): PromotionCalendarScale {
  const todayKey = promotionCalendarDateKey(today);
  const from = addPromotionCalendarDays(todayKey, -7);
  const to = addPromotionCalendarDays(todayKey, 48);
  return { from, to, totalDays: promotionCalendarDaysInclusive(from, to) };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function scalePromotionDate(value: Date | string | number, scale: PromotionCalendarScale) {
  const offset = clamp(serialFromDateKey(promotionCalendarDateKey(value)) - serialFromDateKey(scale.from), 0, scale.totalDays);
  return { left: (offset / scale.totalDays) * 100 };
}

export function scalePromotionRange(
  start: Date | string | number,
  end: Date | string | number,
  scale: PromotionCalendarScale,
) {
  const windowStart = serialFromDateKey(scale.from);
  const startOffset = clamp(serialFromDateKey(promotionCalendarDateKey(start)) - windowStart, 0, scale.totalDays - 1);
  const endOffset = clamp(serialFromDateKey(promotionCalendarDateKey(end)) - windowStart + 1, startOffset + 1, scale.totalDays);
  return {
    left: (startOffset / scale.totalDays) * 100,
    width: ((endOffset - startOffset) / scale.totalDays) * 100,
  };
}

export function promotionCalendarTicks(scale: PromotionCalendarScale, intervalDays = 7) {
  const ticks: string[] = [];
  for (let offset = 0; offset < scale.totalDays; offset += intervalDays) {
    ticks.push(addPromotionCalendarDays(scale.from, offset));
  }
  return ticks;
}
