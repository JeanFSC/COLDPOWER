export const pricingPriceTypes = ["COST", "RETAIL", "WHOLESALE", "MINIMUM", "SPECIAL"] as const;
export type PricingPriceType = (typeof pricingPriceTypes)[number];
export const pricingStatuses = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export type PricingStatus = (typeof pricingStatuses)[number];
export const pricingEffectiveStatuses = ["CURRENT", "SCHEDULED", "EXPIRED", "INACTIVE", "ARCHIVED", "MISSING"] as const;
export type PricingEffectiveStatus = (typeof pricingEffectiveStatuses)[number];
export const pricingCoverages = ["PRICED", "MISSING"] as const;
export type PricingCoverage = (typeof pricingCoverages)[number];

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
  effectiveStatus?: PricingEffectiveStatus;
  pricingCoverage?: PricingCoverage;
  currency?: "PEN" | "USD";
  hasWholesale?: boolean;
  hasPromotion?: boolean;
  hasMinimum?: boolean;
  validFrom?: string;
  validUntil?: string;
  updatedFrom?: string;
  updatedUntil?: string;
  sort?: "sku" | "updatedAt" | "retail";
  order?: "asc" | "desc";
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
  const effectiveStatus = optionalText(params, "effectiveStatus");
  const pricingCoverage = optionalText(params, "pricingCoverage");
  const activeRaw = optionalText(params, "active");
  const hasWholesaleRaw = optionalText(params, "hasWholesale");
  const hasPromotionRaw = optionalText(params, "hasPromotion");
  const hasMinimumRaw = optionalText(params, "hasMinimum");
  const currency = optionalText(params, "currency");
  const validFrom = optionalDate(params, "validFrom");
  const validUntil = optionalDate(params, "validUntil");
  const updatedFrom = optionalDate(params, "updatedFrom");
  const updatedUntil = optionalDate(params, "updatedUntil");
  const sort = optionalText(params, "sort");
  const order = optionalText(params, "order");
  if (priceType && !pricingPriceTypes.includes(priceType as PricingPriceType)) throw new PricingInvalidFilterError();
  if (status && !pricingStatuses.includes(status as PricingStatus)) throw new PricingInvalidFilterError();
  if (effectiveStatus && !pricingEffectiveStatuses.includes(effectiveStatus as PricingEffectiveStatus)) throw new PricingInvalidFilterError();
  if (pricingCoverage && !pricingCoverages.includes(pricingCoverage as PricingCoverage)) throw new PricingInvalidFilterError();
  if (activeRaw && activeRaw !== "true" && activeRaw !== "false") throw new PricingInvalidFilterError();
  if (hasWholesaleRaw && hasWholesaleRaw !== "true" && hasWholesaleRaw !== "false") throw new PricingInvalidFilterError();
  if (hasPromotionRaw && hasPromotionRaw !== "true" && hasPromotionRaw !== "false") throw new PricingInvalidFilterError();
  if (hasMinimumRaw && hasMinimumRaw !== "true" && hasMinimumRaw !== "false") throw new PricingInvalidFilterError();
  if (currency && currency !== "PEN" && currency !== "USD") throw new PricingInvalidFilterError();
  if (validFrom && validUntil && validFrom > validUntil) throw new PricingInvalidFilterError();
  if (updatedFrom && updatedUntil && updatedFrom > updatedUntil) throw new PricingInvalidFilterError();
  if (sort && !["sku", "updatedAt", "retail"].includes(sort)) throw new PricingInvalidFilterError();
  if (order && order !== "asc" && order !== "desc") throw new PricingInvalidFilterError();
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
    ...(effectiveStatus ? { effectiveStatus: effectiveStatus as PricingEffectiveStatus } : {}),
    ...(pricingCoverage ? { pricingCoverage: pricingCoverage as PricingCoverage } : {}),
    ...(currency ? { currency: currency as "PEN" | "USD" } : {}),
    ...(hasWholesaleRaw === undefined ? {} : { hasWholesale: hasWholesaleRaw === "true" }),
    ...(hasPromotionRaw === undefined ? {} : { hasPromotion: hasPromotionRaw === "true" }),
    ...(hasMinimumRaw === undefined ? {} : { hasMinimum: hasMinimumRaw === "true" }),
    ...(validFrom ? { validFrom } : {}),
    ...(validUntil ? { validUntil } : {}),
    ...(updatedFrom ? { updatedFrom } : {}),
    ...(updatedUntil ? { updatedUntil } : {}),
    ...(sort ? { sort: sort as PricingFilters["sort"] } : {}),
    ...(order ? { order: order as PricingFilters["order"] } : {}),
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
  updatedAt?: Date | string | null;
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
  pricing?: {
    retail: PricingPriceRecord | null;
    wholesale: PricingPriceRecord | null;
    minimum: PricingPriceRecord | null;
    special: PricingPriceRecord | null;
    cost?: PricingPriceRecord | null;
  };
  effectiveStatus?: PricingEffectiveStatus;
  hasRetail?: boolean;
  updatedAt?: Date | string | null;
  media?: { primaryUrl: string; altText: string | null; assetId: string } | null;
};

export type PricingListResponse = {
  items: PricingItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  metrics: {
    totalWithPrice: number;
    totalWithoutPrice: number;
    activePrices: number;
    promotions: number;
    expiredPrices: number;
    totalProducts?: number;
    retailPricedProducts?: number;
    retailMissingProducts?: number;
    wholesaleConfiguredProducts?: number;
    activeSpecialPrices?: number;
    scheduledPriceChanges?: number;
    expiringSoon?: number;
  };
  facets: {
    categories: Array<{ id: string; name: string }>;
    families: Array<{ id: string; name: string }>;
    brands: Array<{ id: string; name: string }>;
    statuses: string[];
    currencies?: string[];
  };
};
