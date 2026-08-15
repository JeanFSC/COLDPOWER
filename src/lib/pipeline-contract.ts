import { opportunityOrigins, opportunityStages, type OpportunityOrigin, type OpportunityStage } from "@/lib/crm-validation";

export class PipelineInvalidFilterError extends Error {
  constructor() {
    super("PIPELINE_INVALID_FILTER");
    this.name = "PipelineInvalidFilterError";
  }
}

export type PipelineFilters = {
  query?: string;
  stages?: OpportunityStage[];
  assignedSellerId?: string;
  origin?: OpportunityOrigin;
  createdFrom?: string;
  createdTo?: string;
  followUpFrom?: string;
  followUpTo?: string;
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

export function parsePipelineFilters(params: URLSearchParams): PipelineFilters {
  const rawStages = text(params, "stage") ?? text(params, "stages");
  const stages = rawStages?.split(",").map((stage) => stage.trim()).filter(Boolean);
  if (stages?.some((stage) => !(opportunityStages as readonly string[]).includes(stage))) throw new PipelineInvalidFilterError();
  const origin = text(params, "origin");
  if (origin && !(opportunityOrigins as readonly string[]).includes(origin)) throw new PipelineInvalidFilterError();
  const createdFrom = date(params, "createdFrom");
  const createdTo = date(params, "createdTo");
  const followUpFrom = date(params, "followUpFrom");
  const followUpTo = date(params, "followUpTo");
  if (createdFrom && createdTo && createdFrom > createdTo) throw new PipelineInvalidFilterError();
  if (followUpFrom && followUpTo && followUpFrom > followUpTo) throw new PipelineInvalidFilterError();
  return { query: text(params, "query") ?? text(params, "q"), stages: stages as OpportunityStage[] | undefined, assignedSellerId: text(params, "assignedSellerId") ?? text(params, "sellerId"), origin: origin as OpportunityOrigin | undefined, createdFrom, createdTo, followUpFrom, followUpTo, page: positive(params, "page"), pageSize: positive(params, "pageSize") };
}

export type PipelineStageMetric = { stage: OpportunityStage; count: number; totalAmount: number; weightedAmount: number };
export type PipelineListItem = { id: string; code: string; customerId: string; customerName: string; customerPhone: string | null; title: string; origin: OpportunityOrigin; stage: OpportunityStage; totalAmount: string | null; currency: string | null; nextAction: string | null; followUpAt: Date | null; lastContactAt: Date | null; assignedSellerId: string | null; createdAt: Date; updatedAt: Date; items: Array<{ id: string; productNameSnapshot: string; quantity: number; unitPrice: string | null; lineTotal: string | null }> };
export type PipelinePageResponse = { items: PipelineListItem[]; page: number; pageSize: number; totalItems: number; totalPages: number; metrics: { total: number; open: number; overdueFollowUps: number; totalAmount: number; weightedAmount: number; conversionRate: number | null; byStage: PipelineStageMetric[] }; facets: { stages: OpportunityStage[]; origins: OpportunityOrigin[]; sellers: Array<{ id: string; name: string | null; email: string | null }> } };
