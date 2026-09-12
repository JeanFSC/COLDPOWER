import {
  opportunityOrigins,
  opportunityStages,
  type OpportunityOrigin,
  type OpportunityStage,
} from "@/lib/crm-validation";

export class PipelineInvalidFilterError extends Error {
  constructor() {
    super("PIPELINE_INVALID_FILTER");
    this.name = "PipelineInvalidFilterError";
  }
}

export const opportunityLaneDefinitions = [
  { key: "NEW", label: "Nuevas", stages: ["NEW"] },
  { key: "CONTACTED", label: "Contactadas", stages: ["CONTACTED"] },
  { key: "QUOTING", label: "Cotización", stages: ["QUOTING", "QUOTE_SENT"] },
  { key: "FOLLOW_UP", label: "Seguimiento", stages: ["FOLLOW_UP"] },
  { key: "NEGOTIATION", label: "Negociación", stages: ["NEGOTIATION"] },
  { key: "WON", label: "Ganadas", stages: ["ACCEPTED", "SALE"] },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  stages: readonly OpportunityStage[];
}>;

export type OpportunityLaneKey = (typeof opportunityLaneDefinitions)[number]["key"];
export type CurrencyCode = "PEN" | "USD";
export type CurrencyAmount = { currency: CurrencyCode | string; amount: number };

export const pipelineStageLabels: Record<OpportunityStage, string> = {
  NEW: "Nueva",
  CONTACTED: "Contactada",
  QUOTING: "Cotizando",
  QUOTE_SENT: "Cotización enviada",
  FOLLOW_UP: "Seguimiento",
  NEGOTIATION: "Negociación",
  ACCEPTED: "Aceptada",
  SALE: "Venta creada",
  PAYMENT_PENDING: "Pago pendiente",
  PAID: "Pagada",
  PREPARING: "Preparando",
  DELIVERED: "Entregada",
  CLOSED: "Cerrada",
  LOST: "Perdida",
  CANCELLED: "Cancelada",
  NO_RESPONSE: "Sin respuesta",
};

export const pipelineOriginLabels: Record<OpportunityOrigin, string> = {
  WEB: "Web",
  WHATSAPP: "WhatsApp",
  TELEFONO: "Teléfono",
  LOCAL: "Local",
  REFERIDO: "Referido",
  CLIENTE_RECURRENTE: "Cliente recurrente",
  OTRO: "Otro",
};

export type PipelineFilters = {
  query?: string;
  stages?: OpportunityStage[];
  lane?: OpportunityLaneKey;
  lanePage?: number;
  assignedSellerId?: string;
  customerId?: string;
  productId?: string;
  origin?: OpportunityOrigin;
  currency?: CurrencyCode;
  createdFrom?: string;
  createdTo?: string;
  followUpFrom?: string;
  followUpTo?: string;
  overdue?: boolean;
  withoutNextAction?: boolean;
  withQuote?: boolean;
  withAmount?: boolean;
  page?: number;
  pageSize?: number;
};

function text(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim();
  return value || undefined;
}

function positive(params: URLSearchParams, key: string) {
  const raw = params.get(key);
  if (raw === null || raw === "") return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new PipelineInvalidFilterError();
  return value;
}

function date(params: URLSearchParams, key: string) {
  const value = text(params, key);
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new PipelineInvalidFilterError();
  return value;
}

function booleanValue(params: URLSearchParams, key: string) {
  const value = text(params, key);
  if (!value) return undefined;
  if (value !== "true" && value !== "false") throw new PipelineInvalidFilterError();
  return value === "true";
}

export function parsePipelineFilters(params: URLSearchParams): PipelineFilters {
  const rawStages = text(params, "stage") ?? text(params, "stages");
  const stages = rawStages
    ?.split(",")
    .map((stage) => stage.trim())
    .filter(Boolean);
  if (stages?.some((stage) => !(opportunityStages as readonly string[]).includes(stage))) {
    throw new PipelineInvalidFilterError();
  }
  const rawLane = text(params, "lane");
  if (rawLane && !opportunityLaneDefinitions.some((lane) => lane.key === rawLane)) {
    throw new PipelineInvalidFilterError();
  }
  const origin = text(params, "origin");
  if (origin && !(opportunityOrigins as readonly string[]).includes(origin)) {
    throw new PipelineInvalidFilterError();
  }
  const currency = text(params, "currency");
  if (currency && currency !== "PEN" && currency !== "USD") {
    throw new PipelineInvalidFilterError();
  }
  const createdFrom = date(params, "createdFrom");
  const createdTo = date(params, "createdTo");
  const followUpFrom = date(params, "followUpFrom");
  const followUpTo = date(params, "followUpTo");
  if (createdFrom && createdTo && createdFrom > createdTo) {
    throw new PipelineInvalidFilterError();
  }
  if (followUpFrom && followUpTo && followUpFrom > followUpTo) {
    throw new PipelineInvalidFilterError();
  }
  return {
    query: text(params, "query") ?? text(params, "q"),
    stages: stages as OpportunityStage[] | undefined,
    lane: rawLane as OpportunityLaneKey | undefined,
    lanePage: positive(params, "lanePage"),
    assignedSellerId: text(params, "assignedSellerId") ?? text(params, "sellerId"),
    customerId: text(params, "customerId"),
    productId: text(params, "productId"),
    origin: origin as OpportunityOrigin | undefined,
    currency: currency as CurrencyCode | undefined,
    createdFrom,
    createdTo,
    followUpFrom,
    followUpTo,
    overdue: booleanValue(params, "overdue"),
    withoutNextAction: booleanValue(params, "withoutNextAction"),
    withQuote: booleanValue(params, "withQuote"),
    withAmount: booleanValue(params, "withAmount"),
    page: positive(params, "page"),
    pageSize: positive(params, "pageSize"),
  };
}

export type PipelineStageMetric = {
  stage: OpportunityStage;
  count: number;
  amountByCurrency: CurrencyAmount[];
  totalAmount: number;
  weightedAmount: number;
};

export type PipelineCard = {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  title: string;
  origin: OpportunityOrigin;
  stage: OpportunityStage;
  totalAmount: string | null;
  currency: string | null;
  nextAction: string | null;
  followUpAt: Date | null;
  lastContactAt: Date | null;
  agingDays: number | null;
  overdue: boolean;
  assignedSellerId: string | null;
  assignedSellerName: string | null;
  createdAt: Date;
  updatedAt: Date;
  quoteId: string | null;
  items: Array<{
    id: string;
    productNameSnapshot: string;
    skuSnapshot: string;
    quantity: number;
    unitPrice: string | null;
    lineTotal: string | null;
  }>;
};

export type PipelineListItem = PipelineCard;

export type PipelineLane = {
  key: OpportunityLaneKey;
  label: string;
  stages: OpportunityStage[];
  total: number;
  amountByCurrency: CurrencyAmount[];
  cards: PipelineCard[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type PipelineFollowUpItem = {
  id: string;
  opportunityId: string;
  opportunityCode: string;
  customerName: string;
  title: string;
  dueAt: Date;
  status: string;
  assignedTo: string | null;
  assignedToName: string | null;
  overdue: boolean;
};

export type PipelineBoardResponse = {
  scope: { timezone: "America/Lima"; canManage: boolean; canExport: boolean };
  metrics: {
    activeOpportunities: number;
    amountByCurrency: CurrencyAmount[];
    weightedByCurrency: CurrencyAmount[];
    weightedConfigured: boolean;
    closeRate: number | null;
    overdueFollowUps: number;
    withoutNextAction: number;
    unassigned: number;
    stale: number;
  };
  lanes: PipelineLane[];
  followUps: PipelineFollowUpItem[];
  closed: PipelineCard[];
  facets: {
    stages: OpportunityStage[];
    origins: OpportunityOrigin[];
    currencies: CurrencyCode[];
    sellers: Array<{ id: string; name: string | null; email: string | null }>;
  };
};

/** Backwards-compatible page contract for existing API consumers and tests. */
export type PipelinePageResponse = {
  items: PipelineListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  metrics: {
    total: number;
    open: number;
    overdueFollowUps: number;
    totalAmount: number;
    weightedAmount: number;
    conversionRate: number | null;
    byStage: PipelineStageMetric[];
  };
  facets: {
    stages: OpportunityStage[];
    origins: OpportunityOrigin[];
    sellers: Array<{ id: string; name: string | null; email: string | null }>;
  };
};
