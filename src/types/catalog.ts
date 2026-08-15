import type { Product } from "@/types/product";

export const publicationStatuses = [
  "imported",
  "enrichment",
  "assisted-discovery",
  "publishable",
  "published",
  "suspended",
  "archived",
] as const;

export type PublicationStatus = (typeof publicationStatuses)[number];

export type EditorialPublication = {
  approved?: boolean;
  reviewedBy?: string;
  verifiedAt?: string;
  imageApproved?: boolean;
  documentsVerified?: boolean;
  seoApproved?: boolean;
  sourceDocument?: string;
  dataConfidence?: "source-name-only" | "source-enriched";
};

export type CatalogProduct = Product & {
  editorial?: EditorialPublication;
};

export type PublicationRequirements = {
  uniqueSku: boolean;
  knownBrand: boolean;
  normalizedName: boolean;
  classified: boolean;
  commercialState: boolean;
  criticalAttributes: boolean;
  compatibleContext: boolean;
  approvedImage: boolean;
  shortDescription: boolean;
  reviewed: boolean;
  verifiedDate: boolean;
  sourceVerified: boolean;
};

export type ProductPublication = {
  completenessScore: number;
  publicationStatus: PublicationStatus;
  isPublic: boolean;
  reviewedBy?: string;
  verifiedAt?: string;
  reasons: string[];
  requirements: PublicationRequirements;
};
