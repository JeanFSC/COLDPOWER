import type { CatalogProduct, ProductPublication, PublicationRequirements, PublicationStatus } from "@/types/catalog";

// Kept as a compatibility contract for the editorial admin surface. The public
// catalog no longer imports or filters a hardcoded catalogPilot dataset.
const catalogPilot = { productIds: [] as string[] };
export const catalogPilotProductCount = catalogPilot.productIds.length;
const knownProductStatuses = new Set(["in-stock", "low-stock", "on-request", "out-of-stock"]);
const knownBrandExclusions = new Set(["", "generico", "por definir"]);
const sourceConfidenceValues = new Set(["source-name-only", "source-enriched"]);
const MAX_COMPLETENESS_SCORE = 100;

export function getCatalogPilotOverride() { return undefined; }

function normalizeBrand(brand: string) { return brand.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase(); }
function hasKnownBrand(brand: string) { return Boolean(brand.trim()) && !knownBrandExclusions.has(normalizeBrand(brand)); }
function hasApprovedImage(product: CatalogProduct) { return product.images.some((image) => image.trim().length > 0) && (product.editorial?.imageApproved ?? false); }

function buildRequirements(product: CatalogProduct): PublicationRequirements {
  return { uniqueSku: Boolean(product.sku.trim()), knownBrand: hasKnownBrand(product.brand), normalizedName: Boolean(product.name.trim()), classified: Boolean(product.category && product.type.trim()), commercialState: knownProductStatuses.has(product.status), criticalAttributes: product.specs.filter((spec) => spec.label.trim() && spec.value.trim()).length >= 3, compatibleContext: product.compatibility.some((value) => value.trim().length > 0), approvedImage: hasApprovedImage(product), shortDescription: product.shortDescription.trim().length >= 24, reviewed: Boolean(product.editorial?.reviewedBy?.trim()), verifiedDate: Boolean(product.editorial?.verifiedAt?.trim()), sourceVerified: Boolean(product.editorial?.sourceDocument?.trim()) && sourceConfidenceValues.has(product.editorial?.dataConfidence ?? "") };
}

function scoreRequirements(requirements: PublicationRequirements, product: CatalogProduct) {
  let score = 0;
  if (requirements.uniqueSku) score += 10;
  if (requirements.knownBrand) score += 5;
  if (requirements.normalizedName) score += 5;
  if (requirements.classified) score += 15;
  if (requirements.criticalAttributes) score += 25;
  if (requirements.commercialState) score += 8;
  if (product.price !== null || product.status === "on-request") score += 7;
  if (requirements.approvedImage) score += 15;
  if (product.editorial?.documentsVerified) score += 5;
  if (requirements.shortDescription && product.editorial?.seoApproved) score += 5;
  return Math.min(score, MAX_COMPLETENESS_SCORE);
}

function getBaseStatus(score: number): PublicationStatus { if (score < 45) return "enrichment"; if (score < 70) return "assisted-discovery"; return "publishable"; }

export function evaluateProductPublication(product: CatalogProduct): ProductPublication {
  const requirements = buildRequirements(product);
  const completenessScore = scoreRequirements(requirements, product);
  const mandatoryRequirements = Object.values(requirements).every(Boolean);
  const approved = product.editorial?.approved === true;
  const isPublic = completenessScore >= 90 && mandatoryRequirements && approved;
  const reasons = Object.entries(requirements).filter(([, value]) => !value).map(([key]) => key);
  return { completenessScore, publicationStatus: isPublic ? "published" : getBaseStatus(completenessScore), isPublic, reviewedBy: product.editorial?.reviewedBy, verifiedAt: product.editorial?.verifiedAt, reasons, requirements };
}

export function getPublishedProducts(sourceProducts: readonly CatalogProduct[] = []) { return sourceProducts.filter((product) => evaluateProductPublication(product).isPublic); }
export function getAssistedDiscoveryProducts(sourceProducts: readonly CatalogProduct[] = []) { return sourceProducts.filter((product) => evaluateProductPublication(product).publicationStatus === "assisted-discovery"); }
