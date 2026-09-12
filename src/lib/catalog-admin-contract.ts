export const publicationStatuses = ["draft", "review", "published", "hidden", "archived"] as const;
export type PublicationStatus = (typeof publicationStatuses)[number];
export type DuplicateDecision = "pending" | "different" | "confirmed" | "keep_both";

const publicationTransitions: Record<PublicationStatus, readonly PublicationStatus[]> = {
  draft: ["review", "archived"],
  review: ["published", "draft", "archived"],
  published: ["hidden", "archived"],
  hidden: ["published", "archived"],
  archived: [],
};

export function canTransitionPublication(from: string, to: string) {
  if (!publicationStatuses.includes(from as PublicationStatus) || !publicationStatuses.includes(to as PublicationStatus)) return false;
  return publicationTransitions[from as PublicationStatus].includes(to as PublicationStatus);
}

export function validateDuplicateDecision(input: { productId: string; decision: DuplicateDecision; canonicalProductId?: string | null }) {
  if (input.decision === "confirmed" && !input.canonicalProductId) throw new Error("CATALOG_DUPLICATE_INVALID");
  if (input.decision !== "confirmed" && input.canonicalProductId) throw new Error("CATALOG_DUPLICATE_INVALID");
  if (input.canonicalProductId === input.productId) throw new Error("CATALOG_DUPLICATE_INVALID");
  return true;
}

export const publicationStatusLabels: Record<PublicationStatus, string> = {
  draft: "Borrador",
  review: "En revisión",
  published: "Publicado",
  hidden: "Oculto",
  archived: "Archivado",
};

export const stockStateLabels = {
  AVAILABLE: "Disponible",
  LOW: "Stock bajo",
  ZERO: "Sin stock",
  UNKNOWN: "Stock desconocido",
} as const;

export const catalogQualityLevels = ["good", "acceptable", "poor"] as const;
export type CatalogQualityLevel = (typeof catalogQualityLevels)[number];
export const catalogSortFields = ["name", "sku", "category", "brand", "status", "updatedAt"] as const;
export type CatalogSortField = (typeof catalogSortFields)[number];

export type CatalogApiFilters = {
  query?: string; sku?: string; name?: string; category?: string; categoryId?: string;
  family?: string; familyId?: string; brand?: string; brandId?: string; publicationStatus?: PublicationStatus;
  requiresReview?: boolean; possibleDuplicate?: boolean; duplicateDecision?: "pending" | "different" | "confirmed" | "keep_both";
  confidence?: string; sourceStatus?: string; quality?: CatalogQualityLevel; page?: number; pageSize?: number;
  hasBrand?: boolean; hasMedia?: boolean; hasPrice?: boolean;
  sort?: CatalogSortField; direction?: "asc" | "desc";
};

export function stockState(input: { onHand: number | null; reserved: number | null; minimum: number | null }) {
  if (input.onHand === null || input.reserved === null) return "UNKNOWN" as const;
  const available = input.onHand - input.reserved;
  if (available <= 0) return "ZERO" as const;
  if (input.minimum !== null && available <= input.minimum) return "LOW" as const;
  return "AVAILABLE" as const;
}

export function parseCatalogFilters(params: URLSearchParams): CatalogApiFilters {
  const publicationStatus = params.get("publicationStatus") || undefined;
  if (publicationStatus && !publicationStatuses.includes(publicationStatus as PublicationStatus)) throw new Error("CATALOG_INVALID_FILTER");
  const booleanValue = (key: string) => {
    const value = params.get(key);
    if (value === null || value === "") return undefined;
    if (value !== "true" && value !== "false") throw new Error("CATALOG_INVALID_FILTER");
    return value === "true";
  };
  const positiveInteger = (key: string) => {
    const value = params.get(key);
    if (!value) return undefined;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) throw new Error("CATALOG_INVALID_FILTER");
    return parsed;
  };
  const quality = params.get("quality") || undefined;
  if (quality && !catalogQualityLevels.includes(quality as CatalogQualityLevel)) throw new Error("CATALOG_INVALID_FILTER");
  const duplicateDecision = params.get("duplicateDecision") || undefined;
  if (duplicateDecision && !["pending", "different", "confirmed", "keep_both"].includes(duplicateDecision)) throw new Error("CATALOG_INVALID_FILTER");
  const sort = params.get("sort") || undefined;
  if (sort && !catalogSortFields.includes(sort as CatalogSortField)) throw new Error("CATALOG_INVALID_FILTER");
  const direction = params.get("direction") || undefined;
  if (direction && direction !== "asc" && direction !== "desc") throw new Error("CATALOG_INVALID_FILTER");
  return {
    query: params.get("query") || undefined, sku: params.get("sku") || undefined, name: params.get("name") || undefined,
    category: params.get("category") || undefined, categoryId: params.get("categoryId") || undefined,
    family: params.get("family") || undefined, familyId: params.get("familyId") || undefined,
    brand: params.get("brand") || undefined, brandId: params.get("brandId") || undefined,
    publicationStatus: publicationStatus as CatalogApiFilters["publicationStatus"], requiresReview: booleanValue("requiresReview"),
    possibleDuplicate: booleanValue("possibleDuplicate"), duplicateDecision: duplicateDecision as CatalogApiFilters["duplicateDecision"],
    confidence: params.get("confidence") || undefined, sourceStatus: params.get("sourceStatus") || undefined,
    quality: quality as CatalogQualityLevel | undefined, sort: sort as CatalogSortField | undefined,
    hasBrand: booleanValue("hasBrand"), hasMedia: booleanValue("hasMedia"), hasPrice: booleanValue("hasPrice"),
    direction: direction as CatalogApiFilters["direction"], page: positiveInteger("page"), pageSize: positiveInteger("pageSize"),
  };
}
