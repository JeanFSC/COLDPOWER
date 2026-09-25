export type PeriodKpi = { current: number; previous: number; deltaPct: number | null };

export type PeriodDelta = {
  value: number | null;
  label: string;
  direction: "up" | "down" | "flat" | "new" | "unavailable";
};

const MIN_COMPARABLE_BASE = 5;
const MAX_PERCENTAGE = 999;

/**
 * Shared period math. The numeric value is intentionally bounded so a tiny
 * base cannot leak a four-digit percentage into an admin card or chart label.
 * Callers that need the user-facing state should use formatPeriodDelta().
 */
export function deltaPct(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return current === 0 && previous === 0 ? 0 : null;
  }
  if (Math.abs(previous) < MIN_COMPARABLE_BASE) return null;
  const value = ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(value)) return null;
  return Math.max(-MAX_PERCENTAGE, Math.min(MAX_PERCENTAGE, Math.round(value * 10) / 10));
}

/**
 * Spanish presentation for all "vs. período anterior" comparisons.
 * A zero base with new records is meaningful, while a small non-zero base is
 * deliberately not comparable. Extreme ratios use a multiplier rather than
 * inventing a long percentage.
 */
export function formatPeriodDelta(current: number, previous: number): PeriodDelta {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return { value: null, label: "Sin base comparable", direction: "unavailable" };
  }
  if (previous === 0) {
    return current === 0
      ? { value: 0, label: "Sin base comparable", direction: "unavailable" }
      : { value: null, label: "Nuevo", direction: "new" };
  }
  if (Math.abs(previous) < MIN_COMPARABLE_BASE) {
    return { value: null, label: "Sin base comparable", direction: "unavailable" };
  }
  const rawValue = ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(rawValue)) {
    return { value: null, label: "Sin base comparable", direction: "unavailable" };
  }
  const direction = rawValue > 0 ? "up" : rawValue < 0 ? "down" : "flat";
  const arrow = direction === "up" ? "↗" : direction === "down" ? "↘" : "→";
  const absValue = Math.abs(rawValue);
  const label = absValue > MAX_PERCENTAGE
    ? `${arrow} ×${(current / Math.abs(previous)).toFixed(1)} vs. período anterior`
    : `${arrow} ${absValue.toFixed(1)}% vs. período anterior`;
  return { value: Math.max(-MAX_PERCENTAGE, Math.min(MAX_PERCENTAGE, Math.round(rawValue * 10) / 10)), label, direction };
}
