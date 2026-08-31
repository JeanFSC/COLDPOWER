export const pricingPriceTypes = ["COST", "RETAIL", "WHOLESALE", "MINIMUM", "SPECIAL"] as const;
export type PricingPriceType = (typeof pricingPriceTypes)[number];
export const pricingStatuses = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export type PricingStatus = (typeof pricingStatuses)[number];

export class PricingInvalidFilterError extends Error {
  constructor() {
    super("PRICING_INVALID_FILTER");
    this.name = "PricingInvalidFilterError";
  }
}

export type PricingFilters = {
  query?: string;
  sku?: string;
  productId?: string;
  categoryId?: string;
  familyId?: string;
  brandId?: string;
  priceType?: PricingPriceType;
  status?: PricingStatus;
  active?: boolean;
  page?: number;
  pageSize?: number;
};

export type PricingHistoryFilters = {
  productId?: string;
  sku?: string;
  priceType?: PricingPriceType;
  actorId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

function optionalText(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim();
  return value || undefined;
}

function positiveInteger(params: URLSearchParams, key: string) {
  const raw = params.get(key);
  if (raw === null || raw === "") return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new PricingInvalidFilterError();
  return value;
}

function optionalDate(params: URLSearchParams, key: string) {
  const value = optionalText(params, key);
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new PricingInvalidFilterError();
  return value;
}

export function parsePricingFilters(params: URLSearchParams): PricingFilters {
  const priceType = optionalText(params, "priceType");
  const status = optionalText(params, "status");
  const activeRaw = optionalText(params, "active");
  if (priceType && !pricingPriceTypes.includes(priceType as PricingPriceType)) throw new PricingInvalidFilterError();
  if (status && !pricingStatuses.includes(status as PricingStatus)) throw new PricingInvalidFilterError();
  if (activeRaw && activeRaw !== "true" && activeRaw !== "false") throw new PricingInvalidFilterError();
  return {
    query: optionalText(params, "query"),
    sku: optionalText(params, "sku"),
    productId: optionalText(params, "productId"),
    categoryId: optionalText(params, "categoryId"),
    familyId: optionalText(params, "familyId"),
    brandId: optionalText(params, "brandId"),
    priceType: priceType as PricingPriceType | undefined,
    status: status as PricingStatus | undefined,
    active: activeRaw === undefined ? undefined : activeRaw === "true",
    page: positiveInteger(params, "page"),
    pageSize: positiveInteger(params, "pageSize"),
  };
}

export function parsePricingHistoryFilters(params: URLSearchParams): PricingHistoryFilters {
  const priceType = optionalText(params, "priceType");
  const from = optionalDate(params, "from");
  const to = optionalDate(params, "to");
  if (priceType && !pricingPriceTypes.includes(priceType as PricingPriceType)) throw new PricingInvalidFilterError();
  if (from && to && from > to) throw new PricingInvalidFilterError();
  return {
    productId: optionalText(params, "productId"),
    sku: optionalText(params, "sku"),
    priceType: priceType as PricingPriceType | undefined,
    actorId: optionalText(params, "actorId") ?? optionalText(params, "actor"),
    from,
    to,
    page: positiveInteger(params, "page"),
    pageSize: positiveInteger(params, "pageSize"),
  };
}

export function pricingFiltersToQuery(filters: PricingFilters | PricingHistoryFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== undefined) params.set(key, String(value));
  return params;
}

export type PricingPriceRecord = {
  id: string;
  priceType: PricingPriceType;
  amount: string;
  currency: string;
  wholesaleMinQty: number | null;
  minimumAllowed: string | null;
  status: string;
  active: boolean;
  validFrom: Date;
  validUntil: Date | null;
};

export type PricingItem = {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  categoryId: string | null;
  categoryName: string | null;
  familyId: string | null;
  familyName: string | null;
  brandId: string | null;
  brandName: string | null;
  price: PricingPriceRecord | null;
  prices?: PricingPriceRecord[];
  priceType?: PricingPriceType;
  amount?: string;
  currency?: string;
  status?: string;
};

export type PricingListResponse = {
  items: PricingItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  metrics: { totalWithPrice: number; totalWithoutPrice: number; activePrices: number; promotions: number; expiredPrices: number };
  facets: { categories: Array<{ id: string; name: string }>; families: Array<{ id: string; name: string }>; brands: Array<{ id: string; name: string }>; statuses: string[] };
};
