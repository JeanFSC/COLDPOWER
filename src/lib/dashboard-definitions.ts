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
