import {
  customerStatuses,
  customerTypes,
  type CustomerStatus,
  type CustomerType,
} from "@/lib/crm-validation";

export class CustomerInvalidFilterError extends Error {
  constructor() {
    super("CUSTOMER_INVALID_FILTER");
    this.name = "CustomerInvalidFilterError";
  }
}

export const customerAttentionKeys = [
  "overdueFollowUp",
  "unassigned",
  "stalledOpportunity",
  "quoteResponse",
] as const;
export type CustomerAttentionKey = (typeof customerAttentionKeys)[number];

export type CustomerFilters = {
  query?: string;
  customerType?: CustomerType;
  status?: CustomerStatus;
  assignedSellerId?: string;
  location?: string;
  department?: string;
  opportunity?: "OPEN" | "NONE";
  attention?: CustomerAttentionKey;
  needsAttention?: boolean;
  overdueFollowUp?: boolean;
  noActivity?: boolean;
  hasQuotes?: boolean;
  hasSales?: boolean;
  createdFrom?: string;
  createdTo?: string;
  lastActivityFrom?: string;
  lastActivityTo?: string;
  sort?: "name" | "type" | "status" | "createdAt" | "lastActivityAt";
  direction?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type CustomerRelationFilters = {
  quotesPage?: number;
  opportunitiesPage?: number;
  salesPage?: number;
  ordersPage?: number;
  paymentsPage?: number;
  activitiesPage?: number;
  tasksPage?: number;
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
  if (!Number.isInteger(value) || value < 1) throw new CustomerInvalidFilterError();
  return value;
}

function date(params: URLSearchParams, key: string) {
  const value = text(params, key);
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new CustomerInvalidFilterError();
  return value;
}

function booleanValue(params: URLSearchParams, key: string) {
  const value = text(params, key);
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new CustomerInvalidFilterError();
}

export function parseCustomerFilters(params: URLSearchParams): CustomerFilters {
  const customerType = text(params, "customerType");
  const status = text(params, "status");
  const createdFrom = date(params, "createdFrom");
  const createdTo = date(params, "createdTo");
  const lastActivityFrom = date(params, "lastActivityFrom");
  const lastActivityTo = date(params, "lastActivityTo");
  const opportunity = text(params, "opportunity");
  const attention = text(params, "attention");
  if (opportunity && opportunity !== "OPEN" && opportunity !== "NONE")
    throw new CustomerInvalidFilterError();
  if (attention && !customerAttentionKeys.includes(attention as CustomerAttentionKey))
    throw new CustomerInvalidFilterError();
  if (customerType && !customerTypes.includes(customerType as CustomerType))
    throw new CustomerInvalidFilterError();
  if (status && !customerStatuses.includes(status as CustomerStatus))
    throw new CustomerInvalidFilterError();
  if (createdFrom && createdTo && createdFrom > createdTo) throw new CustomerInvalidFilterError();
  if (lastActivityFrom && lastActivityTo && lastActivityFrom > lastActivityTo)
    throw new CustomerInvalidFilterError();
  return {
    query: text(params, "query") ?? text(params, "q"),
    customerType: customerType as CustomerType | undefined,
    status: status as CustomerStatus | undefined,
    assignedSellerId: text(params, "assignedSellerId"),
    location: text(params, "location"),
    department: text(params, "department"),
    opportunity: opportunity as CustomerFilters["opportunity"],
    attention: attention as CustomerAttentionKey | undefined,
    needsAttention: booleanValue(params, "needsAttention"),
    overdueFollowUp: booleanValue(params, "overdueFollowUp"),
    noActivity: booleanValue(params, "noActivity"),
    hasQuotes: booleanValue(params, "hasQuotes"),
    hasSales: booleanValue(params, "hasSales"),
    createdFrom,
    createdTo,
    lastActivityFrom,
    lastActivityTo,
    sort: (["name", "type", "status", "createdAt", "lastActivityAt"] as const).includes(
      text(params, "sort") as never,
    )
      ? (text(params, "sort") as CustomerFilters["sort"])
      : undefined,
    direction:
      text(params, "direction") === "asc"
        ? "asc"
        : text(params, "direction") === "desc"
          ? "desc"
          : undefined,
    page: positive(params, "page"),
    pageSize: positive(params, "pageSize"),
  };
}

export function parseCustomerRelationFilters(params: URLSearchParams): CustomerRelationFilters {
  return {
    quotesPage: positive(params, "quotesPage"),
    opportunitiesPage: positive(params, "opportunitiesPage"),
    salesPage: positive(params, "salesPage"),
    ordersPage: positive(params, "ordersPage"),
    paymentsPage: positive(params, "paymentsPage"),
    activitiesPage: positive(params, "activitiesPage"),
    tasksPage: positive(params, "tasksPage"),
    pageSize: positive(params, "pageSize"),
  };
}

export type CustomerListItem = {
  id: string;
  userId: string | null;
  name: string;
  legalName: string | null;
  documentNumber: string | null;
  ruc: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  location: string | null;
  customerType: CustomerType;
  status: CustomerStatus;
  assignedSeller: { id: string; name: string | null; email: string | null } | null;
  quoteCount: number;
  openOpportunityCount: number;
  orderCount: number;
  lastActivity: {
    type: string;
    subject: string;
    createdAt: Date;
    occurredAt?: Date | null;
    performedBy: string | null;
  } | null;
  lastActivityAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomerListResponse = {
  items: CustomerListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  metrics: {
    total: number;
    active: number;
    inactive: number;
    newThisMonth: number;
    withOpenOpportunity: number;
    withoutActivity: number;
    requiringAttention: number;
    attentionCategories: Array<{
      key: CustomerAttentionKey;
      label: string;
      count: number;
    }>;
    distributionByType: Array<{ label: string; count: number }>;
    distributionByLocation: Array<{ label: string; count: number }>;
  };
  facets: {
    customerTypes: string[];
    statuses: string[];
    sellers: Array<{ id: string; name: string | null; email: string | null }>;
    locations: string[];
    departments: string[];
  };
};
