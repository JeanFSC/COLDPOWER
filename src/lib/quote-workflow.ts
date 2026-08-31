export const quoteWorkflowStatuses = ["DRAFT", "SENT", "FOLLOW_UP", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED", "CANCELLED"] as const;
export type QuoteWorkflowStatus = (typeof quoteWorkflowStatuses)[number];

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
  if (["cerrada", "cerrado"].includes(status)) return "CANCELLED";
  return null;
}
