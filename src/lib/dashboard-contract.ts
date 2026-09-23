export const dashboardRanges = ["today", "yesterday", "week", "month", "current_month", "previous_month", "year", "custom"] as const;
export type DashboardRange = (typeof dashboardRanges)[number];
export const dashboardGranularities = ["hour", "day", "week", "month"] as const;
export type DashboardGranularity = (typeof dashboardGranularities)[number];

export type DashboardFilters = {
  range?: DashboardRange;
  from?: string;
  to?: string;
  locationId?: string;
  sellerId?: string;
  customerId?: string;
  productId?: string;
  categoryId?: string;
  familyId?: string;
  brandId?: string;
  channel?: string;
  orderStatus?: string;
  currency?: string;
  granularity?: DashboardGranularity;
};

export class DashboardInvalidFilterError extends Error {
  constructor(message = "DASHBOARD_INVALID_FILTER") {
    super(message);
    this.name = "DashboardInvalidFilterError";
  }
}

function readOptional(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim();
  return value || undefined;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function parseDashboardFilters(params: URLSearchParams): DashboardFilters {
  const rawRange = readOptional(params, "range") ?? "month";
  if (!dashboardRanges.includes(rawRange as DashboardRange)) throw new DashboardInvalidFilterError();
  const from = readOptional(params, "from");
  const to = readOptional(params, "to");
  if ((from && !isValidDate(from)) || (to && !isValidDate(to))) throw new DashboardInvalidFilterError();
  if (from && to && from > to) throw new DashboardInvalidFilterError();
  const granularity = readOptional(params, "granularity");
  if (granularity && !dashboardGranularities.includes(granularity as DashboardGranularity)) throw new DashboardInvalidFilterError();
  return {
    range: rawRange as DashboardRange,
    from,
    to,
    locationId: readOptional(params, "locationId"),
    sellerId: readOptional(params, "sellerId"),
    customerId: readOptional(params, "customerId"),
    productId: readOptional(params, "productId"),
    categoryId: readOptional(params, "categoryId"),
    familyId: readOptional(params, "familyId"),
    brandId: readOptional(params, "brandId"),
    channel: readOptional(params, "channel"),
    orderStatus: readOptional(params, "orderStatus"),
    currency: readOptional(params, "currency"),
    granularity: granularity as DashboardGranularity | undefined,
  };
}

export function dashboardFiltersToQuery(filters: DashboardFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== undefined) params.set(key, value);
  return params;
}
