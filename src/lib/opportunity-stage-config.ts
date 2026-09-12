import type { OpportunityStage } from "@/lib/crm-validation";

/**
 * Probabilities are deliberately disabled until the commercial team approves
 * them. Keeping the configuration in the domain prevents a technical
 * heuristic from being presented as a financial forecast.
 */
export const opportunityStageProbability = {
  configured: false,
  values: {
    NEW: 0.05,
    CONTACTED: 0.1,
    QUOTING: 0.25,
    QUOTE_SENT: 0.35,
    FOLLOW_UP: 0.4,
    NEGOTIATION: 0.55,
    ACCEPTED: 0.7,
    SALE: 0.85,
    PAYMENT_PENDING: 0.9,
    PAID: 0.95,
    PREPARING: 0.98,
    DELIVERED: 1,
    CLOSED: 1,
    LOST: 0,
    CANCELLED: 0,
    NO_RESPONSE: 0,
  } satisfies Record<OpportunityStage, number>,
} as const;

export const pipelineAgingThresholds = {
  neutralMaxDays: 2,
  attentionMaxDays: 5,
  staleAfterDays: 7,
} as const;

export const activeCommercialStages = [
  "NEW",
  "CONTACTED",
  "QUOTING",
  "QUOTE_SENT",
  "FOLLOW_UP",
  "NEGOTIATION",
  "ACCEPTED",
] as const satisfies readonly OpportunityStage[];

export const primaryPipelineStages = [
  "NEW",
  "CONTACTED",
  "QUOTING",
  "QUOTE_SENT",
  "FOLLOW_UP",
  "NEGOTIATION",
  "ACCEPTED",
] as const satisfies readonly OpportunityStage[];

export const closedOpportunityStages = ["CLOSED", "LOST", "CANCELLED"] as const;
export const postSaleOpportunityStages = [
  "PAYMENT_PENDING",
  "PAID",
  "PREPARING",
  "DELIVERED",
] as const;
export const sellerRoleCodes = [
  "SUPERADMIN",
  "GERENCIA",
  "OPERACIONES_VENTAS",
  "JEFATURA",
  "ADMIN",
  "VENTAS",
] as const;

