export type PeriodKpi = { current: number; previous: number; deltaPct: number | null };

// Shared "vs. período anterior" math (originally written for auditoría, reused here
// for notificaciones) — previous=0 with current>0 has no defined percentage change,
// so it reports null ("sin datos del período anterior") instead of a fabricated ∞/100%.
export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
