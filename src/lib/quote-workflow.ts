export const quoteWorkflowStatuses = ["DRAFT", "SENT", "FOLLOW_UP", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED", "CANCELLED"] as const;
export type QuoteWorkflowStatus = (typeof quoteWorkflowStatuses)[number];
export type QuoteDisplayStatus = QuoteWorkflowStatus | "LEGACY_CLOSED";

const transitions: Record<QuoteWorkflowStatus, readonly QuoteWorkflowStatus[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["FOLLOW_UP", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"],
  FOLLOW_UP: ["SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"],
  ACCEPTED: ["CONVERTED", "CANCELLED"],
  REJECTED: [],
  EXPIRED: [],
  CONVERTED: [],
  CANCELLED: [],
};

export function canTransitionQuote(from: string, to: string) {
  return quoteWorkflowStatuses.includes(from as QuoteWorkflowStatus) && (transitions[from as QuoteWorkflowStatus] as readonly string[]).includes(to);
}

export function legacyQuoteStatus(status: string): QuoteWorkflowStatus | null {
  if (["enviada", "nuevo", "contactado"].includes(status)) return "SENT";
  if (["evaluacion", "requiere_info", "cotizada"].includes(status)) return "FOLLOW_UP";
  if (status === "aprobada") return "ACCEPTED";
  if (status === "convertida") return "CONVERTED";
  // Historical closed records are intentionally not reclassified without evidence.
  // They remain read-only until an audit determines whether they were rejected,
  // expired, or administratively cancelled.
  return null;
}

export const quoteStatusLabels: Record<QuoteDisplayStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  FOLLOW_UP: "Seguimiento",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  EXPIRED: "Vencida",
  CONVERTED: "Convertida",
  CANCELLED: "Cancelada",
  LEGACY_CLOSED: "Cierre histórico",
};

export function normalizeQuoteStatus(status: string, workflowStatus: string | null | undefined): QuoteDisplayStatus {
  if (workflowStatus && (quoteWorkflowStatuses as readonly string[]).includes(workflowStatus)) return workflowStatus as QuoteWorkflowStatus;
  return legacyQuoteStatus(status) ?? (["cerrada", "cerrado"].includes(status) ? "LEGACY_CLOSED" : "DRAFT");
}

export function effectiveQuoteStatus(status: string, workflowStatus: string | null | undefined, validUntil: Date | null | undefined, now = new Date()): QuoteDisplayStatus {
  const normalized = normalizeQuoteStatus(status, workflowStatus);
  if ((normalized === "SENT" || normalized === "FOLLOW_UP") && validUntil && validUntil < now) return "EXPIRED";
  return normalized;
}

export function canQuoteStatusTransition(from: QuoteDisplayStatus, to: QuoteWorkflowStatus) {
  return from !== "LEGACY_CLOSED" && canTransitionQuote(from, to);
}

export function quoteActionsForStatus(status: QuoteDisplayStatus) {
  if (status === "DRAFT") return ["edit", "send", "cancel"] as const;
  if (status === "SENT") return ["follow_up", "accept", "reject", "expire", "cancel", "new_version"] as const;
  if (status === "FOLLOW_UP") return ["resend", "accept", "reject", "expire", "cancel", "new_version"] as const;
  if (status === "ACCEPTED") return ["convert", "cancel"] as const;
  return [] as const;
}
