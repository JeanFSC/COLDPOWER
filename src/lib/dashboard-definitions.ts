import type { DashboardGranularity } from "@/lib/dashboard-contract";
import { deltaPct } from "@/lib/period-metrics";

export const OPEN_QUOTE_EXCLUDED_STATUSES = ["REJECTED", "EXPIRED", "CONVERTED", "CANCELLED"] as const;

export function isOpenQuoteStatus(workflowStatus: string | null | undefined): boolean {
  if (!workflowStatus) return true;
  return !(OPEN_QUOTE_EXCLUDED_STATUSES as readonly string[]).includes(workflowStatus);
}

export const ACTIVE_ORDER_STATUSES = [
  "NEW", "RECEIVED", "PAYMENT_PENDING", "PAID", "PREPARING", "READY", "READY_FOR_PICKUP", "IN_TRANSIT", "SHIPPED",
] as const;

export function isActiveOrderStatus(status: string): boolean {
  return (ACTIVE_ORDER_STATUSES as readonly string[]).includes(status);
}

export type PipelineMacroStage = "PROSPECCION" | "COTIZACION" | "SEGUIMIENTO" | "NEGOCIACION" | "CIERRE" | "PERDIDA";

const PIPELINE_MACRO_STAGE_MAP: Record<string, PipelineMacroStage> = {
  NEW: "PROSPECCION", CONTACTED: "PROSPECCION",
  QUOTING: "COTIZACION", QUOTE_SENT: "COTIZACION",
  FOLLOW_UP: "SEGUIMIENTO",
  NEGOTIATION: "NEGOCIACION", ACCEPTED: "NEGOCIACION",
  SALE: "CIERRE", PAYMENT_PENDING: "CIERRE", PAID: "CIERRE", PREPARING: "CIERRE", DELIVERED: "CIERRE", CLOSED: "CIERRE",
  LOST: "PERDIDA", CANCELLED: "PERDIDA", NO_RESPONSE: "PERDIDA",
};

export const PIPELINE_MACRO_STAGE_ORDER: PipelineMacroStage[] = ["PROSPECCION", "COTIZACION", "SEGUIMIENTO", "NEGOCIACION", "CIERRE"];

export const PIPELINE_MACRO_STAGE_LABELS: Record<PipelineMacroStage, string> = {
  PROSPECCION: "Prospección",
  COTIZACION: "Cotización",
  SEGUIMIENTO: "Seguimiento",
  NEGOCIACION: "Negociación",
  CIERRE: "Cierre ganado",
  PERDIDA: "Perdidas/canceladas",
};

export function getPipelineMacroStage(stage: string): PipelineMacroStage {
  return PIPELINE_MACRO_STAGE_MAP[stage] ?? "PERDIDA";
}

export type StockState = "CRITICAL" | "NO_STOCK" | "UNKNOWN" | "OK";

export function stockState(balance: { onHand: number; reserved: number; minimumStock: number | null } | null): StockState {
  if (!balance) return "UNKNOWN";
  const available = balance.onHand - balance.reserved;
  if (available <= 0) return "NO_STOCK";
  if (balance.minimumStock !== null && available <= balance.minimumStock) return "CRITICAL";
  return "OK";
}

export function resolveGranularity(window: { from: Date; to: Date }, requested?: DashboardGranularity): DashboardGranularity {
  const durationDays = Math.max(1, Math.ceil((window.to.getTime() - window.from.getTime()) / 86_400_000));
  const automatic: DashboardGranularity = durationDays <= 1 ? "hour" : durationDays <= 60 ? "day" : durationDays <= 365 ? "week" : "month";
  if (!requested) return automatic;
  if (durationDays <= 1) return requested === "hour" || requested === "day" ? requested : automatic;
  if (durationDays <= 60) return requested === "day" || requested === "week" ? requested : automatic;
  if (durationDays <= 365) return requested === "week" || requested === "month" ? requested : automatic;
  return requested === "month" ? requested : automatic;
}

export type KpiComparison = { previous: number; absoluteDelta: number; relativeDelta: number | null; comparisonAvailable: boolean };
export type KpiView = { value: number; isSnapshot: boolean; comparison: KpiComparison | null };

function periodKpi(current: number, previous: number): KpiView {
  const comparisonAvailable = previous > 0 || current > 0;
  return {
    value: current,
    isSnapshot: false,
    comparison: {
      previous,
      absoluteDelta: current - previous,
      relativeDelta: deltaPct(current, previous),
      comparisonAvailable,
    },
  };
}

function snapshotKpi(value: number): KpiView {
  return { value, isSnapshot: true, comparison: null };
}

export function buildKpiView(input: { sales: { current: number; previous: number }; openQuotes: number; activeOrders: number; criticalStock: number }) {
  return {
    sales: periodKpi(input.sales.current, input.sales.previous),
    openQuotes: snapshotKpi(input.openQuotes),
    activeOrders: snapshotKpi(input.activeOrders),
    criticalStock: snapshotKpi(input.criticalStock),
  };
}
